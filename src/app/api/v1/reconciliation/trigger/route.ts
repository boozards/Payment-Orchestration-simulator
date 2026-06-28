import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { memoryStore } from '@/lib/store/memoryCache';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { provider = 'stripe', date = new Date().toISOString().split('T')[0] } = body;

    // 1. Fetch payments in our DB for this provider on the given date
    // Note: Since it's SQLite, we can search payments using date substring
    const ourPayments = await db.all(
      `SELECT * FROM payments 
       WHERE provider = ? AND status IN ('SETTLED', 'CAPTURED', 'REFUNDED') AND created_at LIKE ?`,
      [provider.toLowerCase(), `${date}%`]
    );

    if (ourPayments.length === 0) {
      // Seed a few dummy payments if empty, so the user has data to reconcile!
      // This is a great fallback to make the tool immediately interactive.
      await seedPaymentsForReconciliation(provider.toLowerCase(), date);
    }

    // Fetch again
    const finalPayments = await db.all(
      `SELECT * FROM payments 
       WHERE provider = ? AND status IN ('SETTLED', 'CAPTURED', 'REFUNDED') AND created_at LIKE ?`,
      [provider.toLowerCase(), `${date}%`]
    );

    // 2. Synthesize Mock Provider Settlement Statement with INTENTIONAL discrepancies
    const providerRecords: any[] = [];
    const discrepancies: any[] = [];
    
    let ourTotal = 0;
    let providerTotal = 0;

    // We will loop through our database payments and construct provider side records
    finalPayments.forEach((p: any, idx) => {
      const pAmt = Number(p.amount);
      ourTotal += pAmt;

      // Inject discrepancies for demonstration
      if (idx === 0 && finalPayments.length > 2) {
        // Discrepancy A: Amount Mismatch (Stripe has a different amount)
        const alteredAmt = pAmt - 10.00;
        providerRecords.push({
          provider_transaction_id: p.provider_transaction_id,
          amount: alteredAmt,
          currency: p.currency,
          status: 'succeeded'
        });
        providerTotal += alteredAmt;
        discrepancies.push({
          type: 'AMOUNT_MISMATCH',
          payment_id: p.id,
          provider_transaction_id: p.provider_transaction_id,
          our_amount: pAmt,
          provider_amount: alteredAmt,
          difference: 10.00,
          description: `Internal amount ($${pAmt}) does not match provider statement ($${alteredAmt})`
        });
      } else if (idx === 1 && finalPayments.length > 3) {
        // Discrepancy B: Missing in Provider Statement (Stripe failed to report it)
        discrepancies.push({
          type: 'MISSING_IN_PROVIDER_STATEMENT',
          payment_id: p.id,
          provider_transaction_id: p.provider_transaction_id,
          amount: pAmt,
          description: `Payment settled internally but missing in provider settlement data`
        });
      } else {
        // Normal matching transaction
        providerRecords.push({
          provider_transaction_id: p.provider_transaction_id,
          amount: pAmt,
          currency: p.currency,
          status: 'succeeded'
        });
        providerTotal += pAmt;
      }
    });

    // Discrepancy C: Ghost Charge (in provider statement but missing in our DB!)
    if (finalPayments.length > 0) {
      const ghostTxId = 'tx_ghost_' + crypto.randomBytes(5).toString('hex');
      const ghostAmt = 45.00;
      providerRecords.push({
        provider_transaction_id: ghostTxId,
        amount: ghostAmt,
        currency: 'USD',
        status: 'succeeded'
      });
      providerTotal += ghostAmt;

      discrepancies.push({
        type: 'MISSING_IN_LEDGER',
        provider_transaction_id: ghostTxId,
        amount: ghostAmt,
        description: `Provider processed transaction ${ghostTxId} for $${ghostAmt} but no matching ledger entry exists in our database`
      });
    }

    const totalDiscrepancy = Math.abs(ourTotal - providerTotal);
    const reportStatus = discrepancies.length > 0 ? 'DISCREPANCY_FOUND' : 'MATCHED';
    const reportId = 'rep_' + crypto.randomBytes(8).toString('hex');

    // Save report to SQLite
    await db.run(
      `INSERT INTO reconciliation_reports (id, provider, date, status, our_total, provider_total, discrepancy, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        provider,
        date,
        reportStatus,
        ourTotal,
        providerTotal,
        totalDiscrepancy,
        JSON.stringify({
          discrepancies,
          matched_count: finalPayments.length - discrepancies.filter(d => d.type !== 'MISSING_IN_LEDGER').length,
          total_discrepancies: discrepancies.length
        })
      ]
    );

    memoryStore.publishEvent('reconciliation.run', `Completed reconciliation for ${provider} on ${date}. Status: ${reportStatus}`, {
      reportId,
      provider,
      date,
      status: reportStatus,
      discrepancyCount: discrepancies.length
    });

    return NextResponse.json({
      id: reportId,
      provider,
      date,
      status: reportStatus,
      our_total: ourTotal,
      provider_total: providerTotal,
      discrepancy: totalDiscrepancy,
      discrepancies
    });

  } catch (err: any) {
    console.error('Reconciliation error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// Helper to seed some dummy captured payments if none exist for that day
async function seedPaymentsForReconciliation(provider: string, date: string) {
  const merchant = await db.get<any>('SELECT id FROM merchants LIMIT 1');
  if (!merchant) return;
  const merchantId = merchant.id;

  const samplePayments = [
    { amount: 150.00, currency: 'USD', tx: 'tx_stripe_a1b2c3d4e5' },
    { amount: 89.99, currency: 'USD', tx: 'tx_stripe_f6g7h8i9j0' },
    { amount: 24.50, currency: 'USD', tx: 'tx_stripe_k1l2m3n4o5' },
    { amount: 410.00, currency: 'USD', tx: 'tx_stripe_p6q7r8s9t0' },
  ];

  for (const p of samplePayments) {
    const paymentId = 'pay_seed_' + crypto.randomBytes(4).toString('hex');
    const createdTime = `${date}T10:${Math.floor(Math.random() * 50)}:00.000Z`;
    
    // Insert payment
    await db.run(
      `INSERT INTO payments (id, merchant_id, idempotency_key, amount, currency, status, provider, provider_transaction_id, customer_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        merchantId,
        'idemp_seed_' + Math.random(),
        p.amount,
        p.currency,
        'SETTLED',
        provider,
        p.tx,
        'cust_reconcile_001',
        createdTime,
        createdTime
      ]
    );

    // Insert balanced ledger
    const fee = provider === 'stripe' ? p.amount * 0.029 + 0.30 : p.amount * 0.02;
    const net = p.amount - fee;

    await db.run(
      `INSERT INTO ledger_entries (id, payment_id, entry_type, account_type, account_id, amount, currency, balance_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['led_seed_m_' + Math.random(), paymentId, 'DEBIT', 'MERCHANT', `merchant:${merchantId}`, net, p.currency, net]
    );
    await db.run(
      `INSERT INTO ledger_entries (id, payment_id, entry_type, account_type, account_id, amount, currency, balance_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['led_seed_p_' + Math.random(), paymentId, 'DEBIT', 'PLATFORM_FEE', `platform:fees`, fee, p.currency, fee]
    );
    await db.run(
      `INSERT INTO ledger_entries (id, payment_id, entry_type, account_type, account_id, amount, currency, balance_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['led_seed_pv_' + Math.random(), paymentId, 'CREDIT', 'PROVIDER', `provider:${provider}`, p.amount, p.currency, -p.amount]
    );
  }
}
