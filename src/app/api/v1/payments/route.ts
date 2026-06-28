import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { memoryStore } from '@/lib/store/memoryCache';
import { TokenizationVault } from '@/lib/services/vault';
import { FraudEngine } from '@/lib/services/fraud';
import { SmartRouter } from '@/lib/services/router';
import { CircuitBreakerManager } from '@/lib/services/circuitBreaker';
import { LedgerService } from '@/lib/services/ledger';
import crypto from 'crypto';

// Helper to simulate sleep
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// GET /api/v1/payments - List payments (for dashboard)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    let payments;
    if (status) {
      payments = await db.all('SELECT * FROM payments WHERE status = ? ORDER BY created_at DESC LIMIT ?', [status, limit]);
    } else {
      payments = await db.all('SELECT * FROM payments ORDER BY created_at DESC LIMIT ?', [limit]);
    }

    const parsedPayments = payments.map((p: any) => {
      try { p.metadata = JSON.parse(p.metadata); } catch { p.metadata = {}; }
      return p;
    });

    return NextResponse.json(parsedPayments);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/payments - Create a payment (authorize or capture)
export async function POST(req: NextRequest) {
  const paymentId = 'pay_' + crypto.randomBytes(8).toString('hex');
  let idempotencyKey = req.headers.get('Idempotency-Key') || '';
  
  try {
    const body = await req.json();
    const {
      merchant_id,
      amount,
      currency,
      card_token,
      customer_id,
      capture = true,
      routing_strategy = 'HIGHEST_SUCCESS',
      manual_provider,
      metadata = {}
    } = body;

    // Use idempotency key from body if not in header
    if (!idempotencyKey && body.idempotency_key) {
      idempotencyKey = body.idempotency_key;
    }

    // 1. Idempotency Check (Redis SET NX)
    if (idempotencyKey) {
      const cached = memoryStore.getIdempotency(idempotencyKey);
      if (cached) {
        memoryStore.publishEvent('idempotency.hit', `Idempotency cache HIT for key: ${idempotencyKey}`, { idempotencyKey });
        return NextResponse.json(cached.response, {
          headers: { 'X-Cache': 'HIT' }
        });
      }
    }

    // Validation
    if (!merchant_id || !amount || !currency || !card_token || !customer_id) {
      return NextResponse.json({ error: 'Missing required parameters: merchant_id, amount, currency, card_token, and customer_id are required' }, { status: 400 });
    }

    // 2. Authorize Merchant
    const merchant = await db.get<any>('SELECT * FROM merchants WHERE id = ?', [merchant_id]);
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    let enabledProviders = ['stripe', 'paypal', 'razorpay'];
    try {
      enabledProviders = JSON.parse((merchant as any).enabled_providers);
    } catch (e) {
      // Use defaults
    }

    // 3. Detokenize Card for verification
    const cardDetails = TokenizationVault.detokenize(card_token);
    if (!cardDetails) {
      return NextResponse.json({ error: 'Invalid or expired card_token' }, { status: 400 });
    }

    // Masked details for storage
    const maskedNumber = `•••• •••• •••• ${cardDetails.number.slice(-4)}`;
    const cardBrand = cardDetails.number.startsWith('4') ? 'Visa' : 'Mastercard';

    // 4. Fraud Detection
    const fraudResult = await FraudEngine.evaluate(
      merchant_id,
      amount,
      currency,
      customer_id,
      card_token,
      {
        email: metadata.email || `${customer_id}@example.com`,
        ipCountry: metadata.ipCountry || 'US',
        cardCountry: metadata.cardCountry || 'US'
      }
    );

    if (fraudResult.action === 'BLOCK') {
      const failureReason = `Blocked by Fraud Engine: ${fraudResult.reasons.join(', ')}`;
      
      // Save failed payment record
      await db.run(
        `INSERT INTO payments (id, merchant_id, idempotency_key, amount, currency, status, customer_id, metadata, failure_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentId,
          merchant_id,
          idempotencyKey || null,
          amount,
          currency,
          'FAILED',
          customer_id,
          JSON.stringify({ ...metadata, maskedCard: maskedNumber, cardBrand, fraudScore: fraudResult.score, fraudBlocked: true }),
          failureReason
        ]
      );

      const errorResponse = {
        id: paymentId,
        merchant_id,
        amount,
        currency,
        status: 'FAILED',
        failure_reason: failureReason,
        fraud_check: { score: fraudResult.score, action: 'BLOCK' }
      };

      if (idempotencyKey) {
        memoryStore.setIdempotency(idempotencyKey, errorResponse);
      }

      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 5. Smart Routing Configuration
    const routingResult = SmartRouter.routePayment(
      enabledProviders,
      amount,
      currency,
      routing_strategy,
      manual_provider
    );

    // Save payment record with CREATED status
    await db.run(
      `INSERT INTO payments (id, merchant_id, idempotency_key, amount, currency, status, customer_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        merchant_id,
        idempotencyKey || null,
        amount,
        currency,
        'CREATED',
        customer_id,
        JSON.stringify({
          ...metadata,
          maskedCard: maskedNumber,
          cardBrand,
          fraudScore: fraudResult.score,
          flagged: fraudResult.action === 'FLAG',
          fraudReasons: fraudResult.reasons
        })
      ]
    );

    let activeProvider = routingResult.selectedProvider;
    let attemptNumber = 1;
    let success = false;
    let finalStatus = 'FAILED';
    let failureReason = '';
    let providerTransactionId = '';

    // 6. Execute Attempt & Failover Loop
    // Try up to 3 attempts (allowing Smart Failover if provider is degraded)
    while (attemptNumber <= 3 && !success) {
      const cbState = memoryStore.circuitBreakers[activeProvider];
      const simulatedSuccessRate = cbState?.customSuccessRate ?? 90;
      const simulatedBaseLatency = cbState?.customLatency ?? 200;

      memoryStore.publishEvent('provider.attempt', `Sending transaction to ${activeProvider} (Attempt ${attemptNumber}/3)...`, {
        paymentId,
        provider: activeProvider,
        attemptNumber
      });

      // Track latency
      const startMs = Date.now();
      
      // Sleep to simulate provider call duration
      await sleep(simulatedBaseLatency + Math.floor(Math.random() * 80));

      const latencyMs = Date.now() - startMs;

      // Determine Mock Provider Response
      let attemptStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS';
      let attemptErrorMsg = '';

      // Test Card Patterns
      const last4 = cardDetails.number.slice(-4);
      if (last4 === '9999') {
        attemptStatus = 'FAILED';
        attemptErrorMsg = 'Card Declined: Insufficient Funds';
      } else if (last4 === '8888') {
        attemptStatus = 'FAILED';
        attemptErrorMsg = 'Gateway Timeout: Provider did not respond';
      } else if (last4 === '7777') {
        attemptStatus = 'FAILED';
        attemptErrorMsg = '3DS Required: Authentication failed';
      } else {
        // Evaluate based on provider health setting
        const randomRoll = Math.random() * 100;
        if (randomRoll > simulatedSuccessRate) {
          attemptStatus = 'FAILED';
          attemptErrorMsg = `Provider API Error: Internal server error (roll: ${randomRoll.toFixed(1)} > success: ${simulatedSuccessRate}%)`;
        }
      }

      const attemptId = 'att_' + crypto.randomBytes(8).toString('hex');
      const providerResp = attemptStatus === 'SUCCESS' 
        ? { transaction_id: 'tx_' + crypto.randomBytes(10).toString('hex'), status: 'succeeded' }
        : { error: attemptErrorMsg, code: 'processing_error' };

      // Write payment attempt audit log
      await db.run(
        `INSERT INTO payment_attempts (id, payment_id, provider, attempt_number, status, provider_response, latency_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          attemptId,
          paymentId,
          activeProvider,
          attemptNumber,
          attemptStatus,
          JSON.stringify(providerResp),
          latencyMs
        ]
      );

      if (attemptStatus === 'SUCCESS') {
        success = true;
        providerTransactionId = (providerResp as any).transaction_id;
        finalStatus = capture ? 'CAPTURED' : 'AUTHORIZED';
        
        CircuitBreakerManager.recordSuccess(activeProvider);
        memoryStore.publishEvent('provider.success', `Provider ${activeProvider} processed payment successfully in ${latencyMs}ms`, {
          paymentId,
          provider: activeProvider,
          latencyMs
        });
      } else {
        CircuitBreakerManager.recordFailure(activeProvider, attemptErrorMsg);
        failureReason = attemptErrorMsg;

        memoryStore.publishEvent('provider.failed', `Provider ${activeProvider} failed: ${attemptErrorMsg} (${latencyMs}ms)`, {
          paymentId,
          provider: activeProvider,
          latencyMs
        });

        // Trigger Failover or retry
        if (attemptNumber < 3) {
          // Identify next provider for Smart Failover
          const remainingProviders = enabledProviders.filter(p => p.toLowerCase() !== activeProvider);
          if (remainingProviders.length > 0) {
            // Select next best provider
            const nextRouting = SmartRouter.routePayment(
              remainingProviders,
              amount,
              currency,
              'HIGHEST_SUCCESS'
            );
            activeProvider = nextRouting.selectedProvider;
            memoryStore.publishEvent('router.failover_switch', `Smart Failover: Switching checkout target to ${activeProvider}`, {
              paymentId,
              failedProvider: activeProvider
            });
          }
          // Increment attempt count
          attemptNumber++;
          // Exponential backoff delay
          await sleep(100 * Math.pow(2, attemptNumber));
        } else {
          // End of loops
          attemptNumber++;
        }
      }
    }

    // 7. Update payments record in SQLite
    const finalUpdateAt = new Date().toISOString();
    await db.run(
      `UPDATE payments 
       SET status = ?, provider = ?, provider_transaction_id = ?, failure_reason = ?, updated_at = ?
       WHERE id = ?`,
      [
        finalStatus,
        success ? activeProvider : null,
        success ? providerTransactionId : null,
        success ? null : failureReason,
        finalUpdateAt,
        paymentId
      ]
    );

    // 8. If CAPTURED, post to Double-Entry Ledger
    if (success && capture) {
      const computedFee = SmartRouter.calculateFee(activeProvider, amount, currency);
      await LedgerService.postLedgerEntries({
        paymentId,
        merchantId: merchant_id,
        provider: activeProvider,
        amount,
        currency,
        fee: computedFee,
        type: 'CAPTURE'
      });

      // Update status to SETTLED (in payment lifecycle, capture leads to settle simulation)
      await db.run(`UPDATE payments SET status = 'SETTLED' WHERE id = ?`, [paymentId]);
      finalStatus = 'SETTLED';
    }

    // 9. Dispatch Webhook simulation
    if (merchant.webhook_url) {
      triggerWebhookSimulation(merchant.webhook_url, merchant_id, paymentId, finalStatus, amount, currency);
    }

    // Final response
    const finalPaymentResponse = {
      id: paymentId,
      merchant_id,
      amount,
      currency,
      status: finalStatus,
      provider: success ? activeProvider : undefined,
      provider_transaction_id: success ? providerTransactionId : undefined,
      customer_id,
      failure_reason: success ? undefined : failureReason,
      created_at: new Date().toISOString()
    };

    if (idempotencyKey) {
      memoryStore.setIdempotency(idempotencyKey, finalPaymentResponse);
    }

    return NextResponse.json(finalPaymentResponse, { status: success ? 200 : 400 });

  } catch (err: any) {
    console.error('Create payment error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// Background webhook runner
function triggerWebhookSimulation(
  webhookUrl: string,
  merchantId: string,
  paymentId: string,
  status: string,
  amount: number,
  currency: string
) {
  const webhookId = 'whk_' + crypto.randomBytes(8).toString('hex');
  const payload = {
    event: status === 'SETTLED' || status === 'CAPTURED' ? 'payment.succeeded' : 'payment.failed',
    data: {
      id: paymentId,
      merchant_id: merchantId,
      amount,
      currency,
      status
    },
    created_at: new Date().toISOString()
  };

  const logRecord: any = {
    id: webhookId,
    paymentId,
    url: webhookUrl,
    payload,
    status: 'PENDING',
    attempts: 1,
    maxAttempts: 3,
    logs: [`[${new Date().toISOString()}] Enqueued webhook payload to: ${webhookUrl}`]
  };

  memoryStore.addWebhookLog(logRecord);

  // Run async simulation
  (async () => {
    // Wait a couple of seconds before sending
    await sleep(2000);
    
    // Simulate webhook dispatch
    let success = false;
    let attempts = 1;
    
    while (attempts <= 3 && !success) {
      logRecord.logs.push(`[${new Date().toISOString()}] Dispatch attempt ${attempts}...`);
      
      // Let's simulate a flaky endpoint. If webhookUrl contains "flaky", fail with 500 50% of the time.
      const isFlaky = webhookUrl.includes('flaky');
      const isOffline = webhookUrl.includes('offline');
      
      if (isOffline) {
        logRecord.logs.push(`[${new Date().toISOString()}] Connection timeout (host unreachable).`);
        logRecord.lastResponse = 'Timeout';
      } else if (isFlaky && Math.random() > 0.5) {
        logRecord.logs.push(`[${new Date().toISOString()}] FLAKY target returned HTTP 500 Internal Server Error.`);
        logRecord.lastResponse = '500 Internal Server Error';
      } else {
        success = true;
        logRecord.status = 'SUCCESS';
        logRecord.logs.push(`[${new Date().toISOString()}] Target returned HTTP 200 OK.`);
        logRecord.lastResponse = '200 OK';
        memoryStore.publishEvent('webhook.dispatched', `Webhook ${webhookId} successfully delivered to ${webhookUrl}`, { webhookId, paymentId });
      }

      if (!success) {
        attempts++;
        if (attempts <= 3) {
          logRecord.status = 'RETRYING';
          logRecord.attempts = attempts;
          memoryStore.publishEvent('webhook.retry', `Webhook ${webhookId} failed. Scheduling retry ${attempts}/3...`, { webhookId, paymentId });
          await sleep(5000); // 5s backoff for retry
        } else {
          logRecord.status = 'FAILED';
          logRecord.attempts = 3;
          memoryStore.publishEvent('webhook.failed', `Webhook ${webhookId} delivery failed after 3 attempts`, { webhookId, paymentId });
        }
      }
    }
    
    // Update store
    memoryStore.updateWebhookLog(webhookId, logRecord);
  })();
}
