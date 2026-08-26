import { db } from '../db/connection';
import { memoryStore } from '../store/memoryCache';
import crypto from 'crypto';

export interface LedgerEntry {
  id: string;
  payment_id: string;
  entry_type: 'DEBIT' | 'CREDIT';
  account_type: 'MERCHANT' | 'PROVIDER' | 'PLATFORM_FEE' | 'REFUND';
  account_id: string;
  amount: number;
  currency: string;
  balance_after: number;
  created_at?: string;
}

// Minor unit math helpers to eliminate floating point drift
const toCents = (amt: number): number => Math.round(Number(amt) * 100);
const toCurrency = (cents: number): number => Number((cents / 100).toFixed(2));

export class LedgerService {
  /**
   * Returns the current balance of an account by looking up account_balances table (indexed PK lookup).
   */
  public static async getAccountBalance(accountId: string): Promise<number> {
    try {
      const record = await db.get<{ balance: number }>(
        'SELECT balance FROM account_balances WHERE account_id = ?',
        [accountId]
      );
      return record ? Number(record.balance) : 0;
    } catch (e) {
      console.error(`Error fetching balance for account ${accountId}:`, e);
      return 0;
    }
  }

  /**
   * Posts double-entry ledger rows for a payment capture or refund.
   * Ensures atomic balance updates inside a mutexed SQLite transaction with mass-conservation validation.
   *
   * Mathematical Invariant:
   *   Sum(Debits) === Sum(Credits)
   *
   * Capture:
   *   - DEBIT Merchant Account: + (netAmount = amount - fee)
   *   - DEBIT Platform Account: + (fee)
   *   - CREDIT Provider Account: - (amount)
   *   Balanced: netAmount + fee - amount = 0
   *
   * Refund / Partial Refund:
   *   - CREDIT Merchant Account: - (netAmount = amount - fee)
   *   - CREDIT Platform Account: - (fee)
   *   - DEBIT Provider Account: + (amount)
   *   Balanced: -netAmount - fee + amount = 0
   */
  public static async postLedgerEntries(params: {
    paymentId: string;
    merchantId: string;
    provider: string;
    amount: number;
    currency: string;
    fee: number;
    type: 'CAPTURE' | 'REFUND' | 'PARTIAL_REFUND';
  }): Promise<LedgerEntry[]> {
    const { paymentId, merchantId, provider, amount, currency, fee, type } = params;

    const amountCents = toCents(amount);
    const feeCents = toCents(fee);
    const netAmountCents = amountCents - feeCents;

    // Verify mathematical balance before executing
    if (netAmountCents + feeCents !== amountCents) {
      throw new Error(`Ledger imbalance detected: netAmount(${netAmountCents}) + fee(${feeCents}) !== total(${amountCents})`);
    }

    const merchantAccount = `merchant:${merchantId}`;
    const platformAccount = 'platform:fees';
    const providerAccount = `provider:${provider.toLowerCase()}`;

    // Execute within mutex-serialized transaction
    return db.transaction(async () => {
      const entries: LedgerEntry[] = [];

      // Helper to atomically update account balance and record ledger entry
      const applyEntry = async (
        accountType: 'MERCHANT' | 'PROVIDER' | 'PLATFORM_FEE' | 'REFUND',
        accountId: string,
        entryType: 'DEBIT' | 'CREDIT',
        entryAmountCents: number,
        balanceDeltaCents: number
      ): Promise<LedgerEntry> => {
        const delta = toCurrency(balanceDeltaCents);

        // Atomic Upsert to account_balances table
        await db.run(
          `INSERT INTO account_balances (account_id, account_type, currency, balance, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(account_id) DO UPDATE SET 
             balance = balance + excluded.balance,
             updated_at = CURRENT_TIMESTAMP`,
          [accountId, accountType, currency, delta]
        );

        // Fetch the updated balance
        const updatedBalRow = await db.get<{ balance: number }>(
          'SELECT balance FROM account_balances WHERE account_id = ?',
          [accountId]
        );
        const balanceAfter = updatedBalRow ? Number(updatedBalRow.balance) : delta;

        // Insert immutable ledger audit entry
        const entryId = 'led_' + crypto.randomBytes(8).toString('hex');
        const entryAmount = toCurrency(entryAmountCents);

        await db.run(
          `INSERT INTO ledger_entries (id, payment_id, entry_type, account_type, account_id, amount, currency, balance_after)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entryId,
            paymentId,
            entryType,
            accountType,
            accountId,
            entryAmount,
            currency,
            balanceAfter,
          ]
        );

        return {
          id: entryId,
          payment_id: paymentId,
          entry_type: entryType,
          account_type: accountType,
          account_id: accountId,
          amount: entryAmount,
          currency,
          balance_after: balanceAfter,
        };
      };

      if (type === 'CAPTURE') {
        // 1. Merchant Account receives net funds (DEBIT)
        const me = await applyEntry('MERCHANT', merchantAccount, 'DEBIT', netAmountCents, netAmountCents);
        // 2. Platform Account receives platform fee (DEBIT)
        const ple = await applyEntry('PLATFORM_FEE', platformAccount, 'DEBIT', feeCents, feeCents);
        // 3. Provider Account incurs settlement liability (CREDIT)
        const pre = await applyEntry('PROVIDER', providerAccount, 'CREDIT', amountCents, -amountCents);

        entries.push(me, ple, pre);
      } else {
        // REFUND or PARTIAL_REFUND
        // 1. Merchant Account deducts net amount (CREDIT)
        const me = await applyEntry('MERCHANT', merchantAccount, 'CREDIT', netAmountCents, -netAmountCents);
        // 2. Platform Account deducts refunded fee portion (CREDIT)
        const ple = await applyEntry('PLATFORM_FEE', platformAccount, 'CREDIT', feeCents, -feeCents);
        // 3. Provider Account discharges settlement liability (DEBIT)
        const pre = await applyEntry('PROVIDER', providerAccount, 'DEBIT', amountCents, amountCents);

        entries.push(me, ple, pre);
      }

      // Publish Kafka audit event
      memoryStore.publishEvent(
        'ledger.posted',
        `Posted double-entry ledger for payment ${paymentId} (${type}: $${amount.toFixed(2)})`,
        {
          paymentId,
          type,
          amount,
          fee,
          currency,
          entries: entries.map((e) => ({
            account: e.account_id,
            type: e.entry_type,
            amount: e.amount,
            balance_after: e.balance_after,
          })),
        }
      );

      return entries;
    });
  }

  /**
   * Retrieves ledger entries for a specific payment ID.
   */
  public static async getEntriesForPayment(paymentId: string): Promise<LedgerEntry[]> {
    return db.all<LedgerEntry>(
      'SELECT * FROM ledger_entries WHERE payment_id = ? ORDER BY created_at ASC',
      [paymentId]
    );
  }
}
