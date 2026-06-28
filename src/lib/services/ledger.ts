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

export class LedgerService {
  /**
   * Returns the current balance of an account by looking up its last ledger entry.
   * If no entry exists, returns 0.
   */
  public static async getAccountBalance(accountId: string): Promise<number> {
    try {
      const lastEntry = await db.get<{ balance_after: number }>(
        'SELECT balance_after FROM ledger_entries WHERE account_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
        [accountId]
      );
      return lastEntry ? Number(lastEntry.balance_after) : 0;
    } catch (e) {
      console.error(`Error fetching balance for account ${accountId}:`, e);
      return 0;
    }
  }

  /**
   * Posts double-entry ledger rows for a payment capture or refund.
   * Ensures atomic balance updates inside an SQLite transaction.
   *
   * Rules:
   * - Capture:
   *   - DEBIT Merchant Account: + (netAmount = amount - fee)
   *   - DEBIT Platform Account: + (fee)
   *   - CREDIT Provider Account: - (amount)
   *   - Net transaction sum = (amount - fee) + fee - amount = 0 (Balanced!)
   *
   * - Refund:
   *   - CREDIT Merchant Account: - (netAmount = amount - fee)
   *   - CREDIT Platform Account: - (fee)
   *   - DEBIT Provider Account: + (amount)
   *   - Net transaction sum = -(amount - fee) - fee + amount = 0 (Balanced!)
   */
  public static async postLedgerEntries(params: {
    paymentId: string;
    merchantId: string;
    provider: string;
    amount: number;
    currency: string;
    fee: number;
    type: 'CAPTURE' | 'REFUND';
  }): Promise<LedgerEntry[]> {
    const { paymentId, merchantId, provider, amount, currency, fee, type } = params;
    const entries: LedgerEntry[] = [];
    
    const merchantAccount = `merchant:${merchantId}`;
    const platformAccount = 'platform:fees';
    const providerAccount = `provider:${provider.toLowerCase()}`;

    // Start SQL Transaction
    await db.exec('BEGIN TRANSACTION');

    try {
      // 1. Fetch current balances
      const currentMerchantBal = await this.getAccountBalance(merchantAccount);
      const currentPlatformBal = await this.getAccountBalance(platformAccount);
      const currentProviderBal = await this.getAccountBalance(providerAccount);

      const netAmount = amount - fee;

      let merchantEntry: Omit<LedgerEntry, 'id'>;
      let platformEntry: Omit<LedgerEntry, 'id'>;
      let providerEntry: Omit<LedgerEntry, 'id'>;

      if (type === 'CAPTURE') {
        merchantEntry = {
          payment_id: paymentId,
          entry_type: 'DEBIT', // Cash inflow
          account_type: 'MERCHANT',
          account_id: merchantAccount,
          amount: netAmount,
          currency,
          balance_after: currentMerchantBal + netAmount,
        };

        platformEntry = {
          payment_id: paymentId,
          entry_type: 'DEBIT', // Fee inflow
          account_type: 'PLATFORM_FEE',
          account_id: platformAccount,
          amount: fee,
          currency,
          balance_after: currentPlatformBal + fee,
        };

        providerEntry = {
          payment_id: paymentId,
          entry_type: 'CREDIT', // Provider liability (holds cash)
          account_type: 'PROVIDER',
          account_id: providerAccount,
          amount,
          currency,
          balance_after: currentProviderBal - amount,
        };
      } else {
        // REFUND
        merchantEntry = {
          payment_id: paymentId,
          entry_type: 'CREDIT', // Cash outflow
          account_type: 'MERCHANT',
          account_id: merchantAccount,
          amount: netAmount,
          currency,
          balance_after: currentMerchantBal - netAmount,
        };

        platformEntry = {
          payment_id: paymentId,
          entry_type: 'CREDIT', // Fee outflow (refunded fee)
          account_type: 'PLATFORM_FEE',
          account_id: platformAccount,
          amount: fee,
          currency,
          balance_after: currentPlatformBal - fee,
        };

        providerEntry = {
          payment_id: paymentId,
          entry_type: 'DEBIT', // Decrease provider liability
          account_type: 'PROVIDER',
          account_id: providerAccount,
          amount,
          currency,
          balance_after: currentProviderBal + amount,
        };
      }

      // Helper function to insert ledger entry
      const insertEntry = async (entry: Omit<LedgerEntry, 'id'>): Promise<LedgerEntry> => {
        const id = 'led_' + crypto.randomBytes(8).toString('hex');
        await db.run(
          `INSERT INTO ledger_entries (id, payment_id, entry_type, account_type, account_id, amount, currency, balance_after)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            entry.payment_id,
            entry.entry_type,
            entry.account_type,
            entry.account_id,
            entry.amount,
            entry.currency,
            entry.balance_after,
          ]
        );
        return { id, ...entry };
      };

      const me = await insertEntry(merchantEntry);
      const ple = await insertEntry(platformEntry);
      const pre = await insertEntry(providerEntry);

      entries.push(me, ple, pre);

      // Commit transaction
      await db.exec('COMMIT');

      // Publish events
      memoryStore.publishEvent('ledger.posted', `Posted double-entry ledger for payment ${paymentId} (${type})`, {
        paymentId,
        type,
        total: amount,
        fee,
        net: netAmount,
        merchantBalance: me.balance_after,
        platformBalance: ple.balance_after,
        providerBalance: pre.balance_after,
      });

      return entries;
    } catch (e) {
      await db.exec('ROLLBACK');
      console.error('Failed to write ledger transaction. Rolled back.', e);
      throw e;
    }
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
