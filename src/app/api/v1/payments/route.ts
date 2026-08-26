import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { memoryStore } from '@/lib/store/memoryCache';
import { TokenizationVault } from '@/lib/services/vault';
import { FraudEngine } from '@/lib/services/fraud';
import { SmartRouter } from '@/lib/services/router';
import { CircuitBreakerManager } from '@/lib/services/circuitBreaker';
import { LedgerService } from '@/lib/services/ledger';
import { GatewayAdapterRegistry } from '@/lib/adapters/gatewayAdapter';
import crypto from 'crypto';

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

// POST /api/v1/payments - Create a payment with two-phase idempotency & timeout safety
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

    // 1. Two-Phase Atomic Idempotency Check & Lock
    if (idempotencyKey) {
      const requestHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ merchant_id, amount, currency, card_token, customer_id }))
        .digest('hex');

      const lockResult = memoryStore.acquireIdempotencyLock(idempotencyKey, merchant_id, requestHash);

      if (lockResult.status === 'IN_PROGRESS') {
        return NextResponse.json(
          {
            error: 'Concurrent request in progress for this Idempotency-Key. Please wait or retry shortly.',
            code: 'IDEMPOTENCY_IN_PROGRESS',
          },
          { status: 409 }
        );
      }

      if (lockResult.status === 'COMPLETED') {
        memoryStore.publishEvent('idempotency.hit', `Idempotency cache HIT for key: ${idempotencyKey}`, { idempotencyKey });
        return NextResponse.json(lockResult.response, {
          status: lockResult.statusCode,
          headers: { 'X-Cache': 'HIT' },
        });
      }
    }

    // Validation
    if (!merchant_id || !amount || !currency || !card_token || !customer_id) {
      if (idempotencyKey) memoryStore.releaseIdempotencyLock(idempotencyKey);
      return NextResponse.json(
        { error: 'Missing required parameters: merchant_id, amount, currency, card_token, and customer_id are required' },
        { status: 400 }
      );
    }

    // 2. Authorize Merchant
    const merchant = await db.get<any>('SELECT * FROM merchants WHERE id = ?', [merchant_id]);
    if (!merchant) {
      if (idempotencyKey) memoryStore.releaseIdempotencyLock(idempotencyKey);
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    let enabledProviders = ['stripe', 'paypal', 'razorpay'];
    try {
      enabledProviders = JSON.parse(merchant.enabled_providers);
    } catch {
      // Use defaults
    }

    // 3. Detokenize Card for verification
    const cardDetails = TokenizationVault.detokenize(card_token);
    if (!cardDetails) {
      if (idempotencyKey) memoryStore.releaseIdempotencyLock(idempotencyKey);
      return NextResponse.json({ error: 'Invalid or expired card_token' }, { status: 400 });
    }

    const maskedNumber = `•••• •••• •••• ${cardDetails.number.slice(-4)}`;
    const cardBrand = cardDetails.number.startsWith('4') ? 'Visa' : 'Mastercard';

    // 4. Fraud Detection Screening
    const fraudResult = await FraudEngine.evaluate(
      merchant_id,
      amount,
      currency,
      customer_id,
      card_token,
      {
        email: metadata.email || `${customer_id}@example.com`,
        ipCountry: metadata.ipCountry || 'US',
        cardCountry: metadata.cardCountry || 'US',
      }
    );

    if (fraudResult.action === 'BLOCK') {
      const failureReason = `Blocked by Fraud Engine: ${fraudResult.reasons.join(', ')}`;

      await db.run(
        `INSERT INTO payments (id, merchant_id, idempotency_key, amount, refunded_amount, currency, status, customer_id, metadata, failure_reason)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
        [
          paymentId,
          merchant_id,
          idempotencyKey || null,
          amount,
          currency,
          'FAILED',
          customer_id,
          JSON.stringify({ ...metadata, maskedCard: maskedNumber, cardBrand, fraudScore: fraudResult.score, fraudBlocked: true }),
          failureReason,
        ]
      );

      const errorResponse = {
        id: paymentId,
        merchant_id,
        amount,
        currency,
        status: 'FAILED',
        failure_reason: failureReason,
        fraud_check: { score: fraudResult.score, action: 'BLOCK' },
      };

      if (idempotencyKey) {
        memoryStore.completeIdempotencyLock(idempotencyKey, errorResponse, 400);
      }

      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 5. Smart Routing Selection
    const routingResult = SmartRouter.routePayment(
      enabledProviders,
      amount,
      currency,
      routing_strategy,
      manual_provider
    );

    // Persist Payment in PROCESSING status
    await db.run(
      `INSERT INTO payments (id, merchant_id, idempotency_key, amount, refunded_amount, currency, status, customer_id, metadata)
       VALUES (?, ?, ?, ?, 0, ?, 'PROCESSING', ?, ?)`,
      [
        paymentId,
        merchant_id,
        idempotencyKey || null,
        amount,
        currency,
        customer_id,
        JSON.stringify({
          ...metadata,
          maskedCard: maskedNumber,
          cardBrand,
          fraudScore: fraudResult.score,
          flagged: fraudResult.action === 'FLAG',
          fraudReasons: fraudResult.reasons,
        }),
      ]
    );

    let activeProvider = routingResult.selectedProvider;
    let attemptNumber = 1;
    let success = false;
    let finalStatus = 'FAILED';
    let failureReason = '';
    let providerTransactionId = '';
    let isAmbiguousTimeout = false;

    // 6. Polymorphic Gateway Execution & Failover Loop
    while (attemptNumber <= 3 && !success && !isAmbiguousTimeout) {
      const adapter = GatewayAdapterRegistry.getAdapter(activeProvider);

      memoryStore.publishEvent('provider.attempt', `Sending transaction to ${activeProvider} (Attempt ${attemptNumber}/3)...`, {
        paymentId,
        provider: activeProvider,
        attemptNumber,
      });

      const gatewayResp = await adapter.executePayment({
        paymentId,
        amount,
        currency,
        cardDetails,
        customerId: customer_id,
        capture,
        metadata,
      });

      const attemptId = 'att_' + crypto.randomBytes(8).toString('hex');

      // Record attempt log in SQLite
      await db.run(
        `INSERT INTO payment_attempts (id, payment_id, provider, attempt_number, status, outcome, provider_response, latency_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attemptId,
          paymentId,
          activeProvider,
          attemptNumber,
          gatewayResp.success ? 'SUCCESS' : 'FAILED',
          gatewayResp.outcome,
          JSON.stringify(gatewayResp.rawResponse),
          gatewayResp.latencyMs,
        ]
      );

      if (gatewayResp.success) {
        success = true;
        providerTransactionId = gatewayResp.transactionId || '';
        finalStatus = capture ? 'CAPTURED' : 'AUTHORIZED';

        CircuitBreakerManager.recordSuccess(activeProvider);
        memoryStore.publishEvent('provider.success', `Provider ${activeProvider} processed payment successfully in ${gatewayResp.latencyMs}ms`, {
          paymentId,
          provider: activeProvider,
          latencyMs: gatewayResp.latencyMs,
        });
      } else if (gatewayResp.outcome === 'AMBIGUOUS_TIMEOUT') {
        // CRITICAL FIX: Gateway timeout is an ambiguous state. DO NOT blindly failover to another provider!
        isAmbiguousTimeout = true;
        finalStatus = 'PENDING_INQUIRY';
        failureReason = gatewayResp.errorMessage || 'Gateway Timeout: Inquiring status';

        CircuitBreakerManager.recordFailure(activeProvider, failureReason);
        memoryStore.publishEvent('provider.timeout_guarded', `Provider ${activeProvider} timed out. Set to PENDING_INQUIRY to prevent double charge.`, {
          paymentId,
          provider: activeProvider,
        });
      } else {
        // Deterministic Decline (insufficient funds, CVV mismatch, or provider rejection)
        CircuitBreakerManager.recordFailure(activeProvider, gatewayResp.errorMessage || 'API Error');
        failureReason = gatewayResp.errorMessage || 'Transaction declined';

        memoryStore.publishEvent('provider.failed', `Provider ${activeProvider} declined: ${failureReason} (${gatewayResp.latencyMs}ms)`, {
          paymentId,
          provider: activeProvider,
          latencyMs: gatewayResp.latencyMs,
        });

        // Only failover to another provider if the failure was a provider network/server error, NOT a bad card
        const isBadCard = gatewayResp.errorCode === 'insufficient_funds' || gatewayResp.errorCode === 'authentication_required';

        if (!isBadCard && attemptNumber < 3) {
          const remainingProviders = enabledProviders.filter((p) => p.toLowerCase() !== activeProvider.toLowerCase());
          if (remainingProviders.length > 0) {
            const nextRouting = SmartRouter.routePayment(remainingProviders, amount, currency, 'HIGHEST_SUCCESS');
            activeProvider = nextRouting.selectedProvider;
            memoryStore.publishEvent('router.failover_switch', `Smart Failover: Switching checkout target to ${activeProvider}`, {
              paymentId,
              failedProvider: activeProvider,
            });
            attemptNumber++;
            await sleep(100 * Math.pow(2, attemptNumber));
          } else {
            attemptNumber++;
          }
        } else {
          attemptNumber++;
        }
      }
    }

    // 7. Update payments record in SQLite
    const finalUpdateAt = new Date().toISOString();
    await db.run(
      `UPDATE payments 
       SET status = ?, provider = ?, provider_transaction_id = ?, failure_reason = ?, version = version + 1, updated_at = ?
       WHERE id = ?`,
      [
        finalStatus,
        success || isAmbiguousTimeout ? activeProvider : null,
        success ? providerTransactionId : null,
        success ? null : failureReason,
        finalUpdateAt,
        paymentId,
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
        type: 'CAPTURE',
      });

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
      provider: success || isAmbiguousTimeout ? activeProvider : undefined,
      provider_transaction_id: success ? providerTransactionId : undefined,
      customer_id,
      failure_reason: success ? undefined : failureReason,
      created_at: new Date().toISOString(),
    };

    const httpStatusCode = success ? 200 : isAmbiguousTimeout ? 202 : 400;

    if (idempotencyKey) {
      memoryStore.completeIdempotencyLock(idempotencyKey, finalPaymentResponse, httpStatusCode);
    }

    return NextResponse.json(finalPaymentResponse, { status: httpStatusCode });
  } catch (err: any) {
    if (idempotencyKey) memoryStore.releaseIdempotencyLock(idempotencyKey);
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
    event: status === 'SETTLED' || status === 'CAPTURED' ? 'payment.succeeded' : status === 'PENDING_INQUIRY' ? 'payment.pending' : 'payment.failed',
    data: {
      id: paymentId,
      merchant_id: merchantId,
      amount,
      currency,
      status,
    },
    created_at: new Date().toISOString(),
  };

  const logRecord: any = {
    id: webhookId,
    paymentId,
    url: webhookUrl,
    payload,
    status: 'PENDING',
    attempts: 1,
    maxAttempts: 3,
    logs: [`[${new Date().toISOString()}] Enqueued webhook payload to: ${webhookUrl}`],
  };

  memoryStore.addWebhookLog(logRecord);

  (async () => {
    await sleep(1500);

    let success = false;
    let attempts = 1;

    while (attempts <= 3 && !success) {
      logRecord.logs.push(`[${new Date().toISOString()}] Dispatch attempt ${attempts}...`);

      const isFlaky = webhookUrl.includes('flaky');
      const isOffline = webhookUrl.includes('offline');

      if (isOffline) {
        logRecord.logs.push(`[${new Date().toISOString()}] Connection timeout (host unreachable).`);
        logRecord.lastResponse = 'Timeout';
      } else if (isFlaky && Math.random() > 0.5) {
        logRecord.logs.push(`[${new Date().toISOString()}] Target returned HTTP 500 Internal Server Error.`);
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
          await sleep(3000);
        } else {
          logRecord.status = 'FAILED';
          logRecord.attempts = 3;
          memoryStore.publishEvent('webhook.failed', `Webhook ${webhookId} delivery failed after 3 attempts`, { webhookId, paymentId });
        }
      }
    }

    memoryStore.updateWebhookLog(webhookId, logRecord);
  })();
}
