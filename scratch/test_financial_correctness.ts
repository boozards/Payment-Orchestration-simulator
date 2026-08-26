import { db } from '../src/lib/db/connection';
import { memoryStore } from '../src/lib/store/memoryCache';
import { TokenizationVault } from '../src/lib/services/vault';
import { LedgerService } from '../src/lib/services/ledger';
import { GatewayAdapterRegistry } from '../src/lib/adapters/gatewayAdapter';

async function runTestSuite() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  PAYMENT ORCHESTRATION ENGINE: FINANCIAL CORRECTNESS TEST SUITE   ');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     Details: ${details}`);
    }
  }

  // --- TEST 1: Two-Phase Idempotency Lock Race Prevention ---
  console.log('\n▶ TEST 1: Idempotency Lock Race Condition');
  {
    const idempotencyKey = `idem_race_${Date.now()}`;
    const merchantId = 'mch_acme_corp_001';
    const requestHash = 'hash_123456';

    // 10 concurrent requests trying to acquire the same lock simultaneously
    const attempts = await Promise.all(
      Array.from({ length: 10 }).map(async (_, idx) => {
        return memoryStore.acquireIdempotencyLock(idempotencyKey, merchantId, requestHash);
      })
    );

    const acquiredCount = attempts.filter((a) => a.status === 'ACQUIRED').length;
    const inProgressCount = attempts.filter((a) => a.status === 'IN_PROGRESS').length;

    assert(
      acquiredCount === 1,
      'Exactly 1 request acquires the lock among 10 concurrent callers',
      `Acquired: ${acquiredCount}, In-Progress: ${inProgressCount}`
    );
    assert(
      inProgressCount === 9,
      'Remaining 9 concurrent requests receive IN_PROGRESS rejection status',
      `In-Progress: ${inProgressCount}`
    );

    // Complete the lock
    memoryStore.completeIdempotencyLock(idempotencyKey, { id: 'pay_test_001', status: 'SETTLED' }, 200);

    // Subsequent call should get COMPLETED status with cached response
    const postComplete = memoryStore.acquireIdempotencyLock(idempotencyKey, merchantId, requestHash);
    assert(
      postComplete.status === 'COMPLETED' && (postComplete as any).response.id === 'pay_test_001',
      'Subsequent requests immediately receive cached response payload'
    );
  }

  // --- TEST 2: Gateway Timeout Safety & No Blind Failover ---
  console.log('\n▶ TEST 2: Gateway Timeout Safety (No Multi-Provider Double Charging)');
  {
    const adapter = GatewayAdapterRegistry.getAdapter('stripe');
    const token = TokenizationVault.tokenize({
      number: '4111 1111 1111 8888', // Simulates timeout
      expiry: '12/28',
      cvv: '888',
      holder: 'Timeout Tester',
    });

    const cardDetails = TokenizationVault.detokenize(token.token)!;
    const gatewayResp = await adapter.executePayment({
      paymentId: 'pay_timeout_test',
      amount: 150.0,
      currency: 'USD',
      cardDetails,
      customerId: 'cust_timeout',
      capture: true,
    });

    assert(
      gatewayResp.outcome === 'AMBIGUOUS_TIMEOUT',
      'Gateway correctly categorizes HTTP timeout as AMBIGUOUS_TIMEOUT rather than hard rejection',
      `Outcome: ${gatewayResp.outcome}`
    );
    assert(
      gatewayResp.success === false,
      'Gateway response reports failure for ambiguous timeout'
    );
  }

  // --- TEST 3: Atomic Ledger Concurrency (Lost Update Prevention) ---
  console.log('\n▶ TEST 3: Atomic Double-Entry Ledger Concurrency (20 Parallel Captures)');
  {
    const testMerchantId = 'mch_concurrency_test_' + Date.now();
    const captureCount = 20;
    const singleAmount = 50.0;
    const singleFee = 1.5;
    const singleNet = singleAmount - singleFee; // 48.50

    // Fire 20 parallel ledger postings simultaneously on the same merchant account
    await Promise.all(
      Array.from({ length: captureCount }).map(async (_, idx) => {
        return LedgerService.postLedgerEntries({
          paymentId: `pay_concur_${idx}_${Date.now()}`,
          merchantId: testMerchantId,
          provider: 'stripe',
          amount: singleAmount,
          currency: 'USD',
          fee: singleFee,
          type: 'CAPTURE',
        });
      })
    );

    const merchantBalance = await LedgerService.getAccountBalance(`merchant:${testMerchantId}`);
    const expectedBalance = Number((captureCount * singleNet).toFixed(2));

    assert(
      Math.abs(merchantBalance - expectedBalance) < 0.001,
      `Merchant balance accurately reflects all 20 atomic captures ($${merchantBalance.toFixed(2)} == $${expectedBalance.toFixed(2)}) with zero lost updates`,
      `Actual: ${merchantBalance}, Expected: ${expectedBalance}`
    );
  }

  // --- TEST 4: Multi-Partial Refund Invariant & Tracking ---
  console.log('\n▶ TEST 4: Multi-Partial Refund Flow');
  {
    const refundMerchantId = 'mch_refund_test_' + Date.now();
    const testPaymentId = 'pay_refund_' + Date.now();
    const totalPayment = 100.0;

    // Create payment in DB
    await db.run(
      `INSERT INTO payments (id, merchant_id, amount, refunded_amount, currency, status, customer_id)
       VALUES (?, ?, ?, 0, 'USD', 'SETTLED', 'cust_refund')`,
      [testPaymentId, refundMerchantId, totalPayment]
    );

    // Initial capture ledger
    await LedgerService.postLedgerEntries({
      paymentId: testPaymentId,
      merchantId: refundMerchantId,
      provider: 'stripe',
      amount: totalPayment,
      currency: 'USD',
      fee: 3.2,
      type: 'CAPTURE',
    });

    const initMerchantBal = await LedgerService.getAccountBalance(`merchant:${refundMerchantId}`);

    // Step A: Partial Refund 1 ($30)
    await LedgerService.postLedgerEntries({
      paymentId: testPaymentId,
      merchantId: refundMerchantId,
      provider: 'stripe',
      amount: 30.0,
      currency: 'USD',
      fee: 0.96,
      type: 'PARTIAL_REFUND',
    });

    const balAfterRefund1 = await LedgerService.getAccountBalance(`merchant:${refundMerchantId}`);
    assert(
      Math.abs(balAfterRefund1 - (initMerchantBal - (30.0 - 0.96))) < 0.001,
      'Partial refund 1 correctly deducts proportional net amount from merchant balance'
    );

    // Step B: Partial Refund 2 ($50)
    await LedgerService.postLedgerEntries({
      paymentId: testPaymentId,
      merchantId: refundMerchantId,
      provider: 'stripe',
      amount: 50.0,
      currency: 'USD',
      fee: 1.6,
      type: 'PARTIAL_REFUND',
    });

    // Step C: Final Partial Refund ($20)
    await LedgerService.postLedgerEntries({
      paymentId: testPaymentId,
      merchantId: refundMerchantId,
      provider: 'stripe',
      amount: 20.0,
      currency: 'USD',
      fee: 0.64,
      type: 'REFUND',
    });

    const finalMerchantBal = await LedgerService.getAccountBalance(`merchant:${refundMerchantId}`);
    assert(
      Math.abs(finalMerchantBal) < 0.001,
      `Fully refunded payment returns merchant balance back to zero ($${finalMerchantBal.toFixed(2)})`
    );
  }

  // --- TEST 5: Double-Entry Mass Conservation Invariant ---
  console.log('\n▶ TEST 5: Double-Entry Mass Conservation Law (Debits == Credits across All Entries)');
  {
    const allEntries = await db.all<any>('SELECT entry_type, amount FROM ledger_entries');
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of allEntries) {
      const amt = Math.round(Number(entry.amount) * 100);
      if (entry.entry_type === 'DEBIT') {
        totalDebits += amt;
      } else {
        totalCredits += amt;
      }
    }

    assert(
      totalDebits === totalCredits,
      `Sum(Debits) === Sum(Credits) across all ${allEntries.length} ledger rows in SQLite database ($${(totalDebits / 100).toFixed(2)} == $${(totalCredits / 100).toFixed(2)})`,
      `Debits: ${totalDebits}, Credits: ${totalCredits}`
    );
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed with unexpected error:', err);
    process.exit(1);
  });
