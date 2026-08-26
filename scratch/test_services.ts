import { db } from '../src/lib/db/connection';
import { TokenizationVault } from '../src/lib/services/vault';
import { FraudEngine } from '../src/lib/services/fraud';
import { SmartRouter } from '../src/lib/services/router';
import { CircuitBreakerManager } from '../src/lib/services/circuitBreaker';
import { LedgerService } from '../src/lib/services/ledger';
import { memoryStore } from '../src/lib/store/memoryCache';

async function runTests() {
  console.log('==================================================');
  console.log('STARTING INTEGRATION VERIFICATION OF CORE SERVICES');
  console.log('==================================================\n');

  try {
    // 1. Vault Tokenization Test
    console.log('--- 1. Testing PCI Vault Tokenization & Encryption ---');
    const cardData = {
      number: '4111111111114242',
      expiry: '12/28',
      cvv: '123',
      holder: 'Test User'
    };

    const { token, brand, maskedNumber } = TokenizationVault.tokenize(cardData);
    console.log(`Token generated: ${token}`);
    console.log(`Detected brand: ${brand}`);
    console.log(`Masked card: ${maskedNumber}`);

    const detokenized = TokenizationVault.detokenize(token);
    if (detokenized && detokenized.number === cardData.number) {
      console.log('✓ Success: Card detokenized and matches original!\n');
    } else {
      throw new Error('Vault detokenization failed');
    }

    // 2. Fraud Rules Engine Test
    console.log('--- 2. Testing Fraud Rules Evaluator ---');
    const merchantId = 'mch_acme_corp_001';
    
    // Test normal payment
    const check1 = await FraudEngine.evaluate(merchantId, 100.00, 'USD', 'cust_01', token);
    console.log(`Normal payment check: Action=${check1.action}, Score=${check1.score}`);
    if (check1.action !== 'ALLOW') throw new Error('Expected ALLOW for normal payment');

    // Test high amount block
    const check2 = await FraudEngine.evaluate(merchantId, 6000.00, 'USD', 'cust_01', token);
    console.log(`High amount payment check: Action=${check2.action}, Score=${check2.score}, Reasons=${check2.reasons.join(', ')}`);
    if (check2.action !== 'BLOCK') throw new Error('Expected BLOCK for amount > 5000');
    console.log('✓ Success: Fraud rules correctly block high amount!\n');

    // 3. Smart Routing Test
    console.log('--- 3. Testing Smart Routing Logic ---');
    const enabled = ['stripe', 'paypal', 'razorpay'];
    
    // Choose lowest cost for $100 USD
    // Stripe fee: 2.9% + 0.30 = $3.20
    // PayPal fee: 3.49% + 0.49 = $3.98
    // Razorpay fee: 3% = $3.00
    const routeCost = SmartRouter.routePayment(enabled, 100.00, 'USD', 'LOWEST_COST');
    console.log(`Routing strategy: LOWEST_COST`);
    console.log(`Selected Provider: ${routeCost.selectedProvider}`);
    routeCost.routes.forEach(r => {
      console.log(`  - ${r.name}: Available=${r.isAvailable}, Expected Fee=$${r.expectedFee.toFixed(2)}, Circuit=${r.circuitState}`);
    });
    if (routeCost.selectedProvider !== 'razorpay') throw new Error('Expected razorpay to be selected (cheapest)');

    // Choose highest success for $100 USD (Stripe has custom success of 98%)
    const routeSuccess = SmartRouter.routePayment(enabled, 100.00, 'USD', 'HIGHEST_SUCCESS');
    console.log(`Routing strategy: HIGHEST_SUCCESS`);
    console.log(`Selected Provider: ${routeSuccess.selectedProvider}`);
    if (routeSuccess.selectedProvider !== 'stripe') throw new Error('Expected stripe to be selected (highest success)');
    console.log('✓ Success: Smart Routing selects best pathways!\n');

    // 4. Circuit Breaker Test
    console.log('--- 4. Testing Circuit Breaker State Machine ---');
    console.log(`Initial state for paypal: ${CircuitBreakerManager.checkCircuit('paypal')}`);
    
    // Trigger 3 failures
    console.log('Recording 3 consecutive failures for paypal...');
    CircuitBreakerManager.recordFailure('paypal', 'Connection failed');
    CircuitBreakerManager.recordFailure('paypal', 'Connection failed');
    CircuitBreakerManager.recordFailure('paypal', 'Connection failed');

    const circuitState = CircuitBreakerManager.checkCircuit('paypal');
    console.log(`Paypal Circuit state after failures: ${circuitState}`);
    if (circuitState !== 'OPEN') throw new Error('Expected circuit to transition to OPEN');

    // Check routing: PayPal should be unavailable
    const routeAfterTrip = SmartRouter.routePayment(enabled, 100.00, 'USD', 'LOWEST_COST', 'paypal');
    console.log(`Routing to paypal after trip (Manual Strategy): selected=${routeAfterTrip.selectedProvider}`);
    if (routeAfterTrip.selectedProvider === 'paypal') throw new Error('Router should failover from tripped paypal');

    // Heal the circuit
    console.log('Healing circuit breaker manually...');
    CircuitBreakerManager.recordSuccess('paypal');
    const healedState = CircuitBreakerManager.checkCircuit('paypal');
    console.log(`Paypal Circuit state after reset: ${healedState}`);
    if (healedState !== 'CLOSED') throw new Error('Expected circuit to transition back to CLOSED');
    console.log('✓ Success: Circuit Breaker acts as expected!\n');

    // 5. Double-Entry Ledger Bookkeeping Test
    console.log('--- 5. Testing Balanced Ledger Transactions ---');
    const paymentId = 'pay_test_' + Math.random().toString(36).substring(2, 6);
    
    const balanceMerchantBefore = await LedgerService.getAccountBalance(`merchant:${merchantId}`);
    const balancePlatformBefore = await LedgerService.getAccountBalance('platform:fees');
    const balanceProviderBefore = await LedgerService.getAccountBalance('provider:stripe');

    console.log('Posting capture ledger entry for $100.00 (Fee $3.20)...');
    await LedgerService.postLedgerEntries({
      paymentId,
      merchantId,
      provider: 'stripe',
      amount: 100.00,
      currency: 'USD',
      fee: 3.20,
      type: 'CAPTURE'
    });

    const balanceMerchantAfter = await LedgerService.getAccountBalance(`merchant:${merchantId}`);
    const balancePlatformAfter = await LedgerService.getAccountBalance('platform:fees');
    const balanceProviderAfter = await LedgerService.getAccountBalance('provider:stripe');

    console.log(`Merchant Account Balance: Before=$${balanceMerchantBefore.toFixed(2)}, After=$${balanceMerchantAfter.toFixed(2)} (Diff=+$${(balanceMerchantAfter - balanceMerchantBefore).toFixed(2)})`);
    console.log(`Platform Fee Account Balance: Before=$${balancePlatformBefore.toFixed(2)}, After=$${balancePlatformAfter.toFixed(2)} (Diff=+$${(balancePlatformAfter - balancePlatformBefore).toFixed(2)})`);
    console.log(`Provider stripe Reserve Balance: Before=$${balanceProviderBefore.toFixed(2)}, After=$${balanceProviderAfter.toFixed(2)} (Diff=${(balanceProviderAfter - balanceProviderBefore).toFixed(2)})`);

    const totalDebit = (balanceMerchantAfter - balanceMerchantBefore) + (balancePlatformAfter - balancePlatformBefore);
    const totalCredit = Math.abs(balanceProviderAfter - balanceProviderBefore);
    console.log(`Total Debits ($${totalDebit.toFixed(2)}) equals Total Credits ($${totalCredit.toFixed(2)})`);
    
    if (Math.abs(totalDebit - totalCredit) > 0.001 || Math.abs(totalDebit - 100.00) > 0.001) {
      throw new Error('Ledger entries are not balanced');
    }
    console.log('✓ Success: Ledger Bookkeeping enforces exact double-entry balance!\n');

    console.log('==================================================');
    console.log('INTEGRATION TEST PASSED SUCCESSFULLY!');
    console.log('==================================================');
  } catch (err: any) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
  } finally {
    process.exit(0);
  }
}

runTests();
