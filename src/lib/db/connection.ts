import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'payment_orchestrator.db');

class DatabaseManager {
  private db!: sqlite3.Database;
  private initPromise: Promise<void>;
  private resolveInit!: () => void;

  constructor() {
    // Set up initialization promise
    this.initPromise = new Promise((resolve) => {
      this.resolveInit = resolve;
    });

    // Open SQLite database file
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err.message);
      } else {
        console.log('SQLite connected at:', DB_PATH);
        this.initializeSchema();
      }
    });
  }

  // Promisified execution for queries that do not return rows (e.g. INSERT, UPDATE)
  public async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Promisified query returning a single row
  public async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T | undefined);
        }
      });
    });
  }

  // Promisified query returning all rows
  public async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  // Promisified exec for executing multiple raw SQL queries at once
  public async exec(sql: string): Promise<void> {
    // Note: Schema setup runs exec directly before resolving promise to prevent deadlock
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Runs schema tables creation
  private async initializeSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        api_key_hash TEXT NOT NULL,
        enabled_providers TEXT NOT NULL, -- JSON string representation
        default_currency TEXT DEFAULT 'USD',
        webhook_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        idempotency_key TEXT UNIQUE,
        amount DECIMAL(15,2) NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL, -- CREATED, AUTHORIZED, CAPTURED, SETTLED, FAILED, REFUNDED, VOIDED
        provider TEXT,
        provider_transaction_id TEXT,
        customer_id TEXT,
        metadata TEXT, -- JSON string representation
        failure_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (merchant_id) REFERENCES merchants(id)
      );

      CREATE TABLE IF NOT EXISTS payment_attempts (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        attempt_number INTEGER NOT NULL,
        status TEXT NOT NULL,
        provider_response TEXT, -- JSON string representation
        latency_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id)
      );

      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL,
        entry_type TEXT NOT NULL, -- DEBIT, CREDIT
        account_type TEXT NOT NULL, -- MERCHANT, PROVIDER, PLATFORM_FEE, REFUND
        account_id TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency TEXT NOT NULL,
        balance_after DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id)
      );

      CREATE TABLE IF NOT EXISTS reconciliation_reports (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        status TEXT NOT NULL,  -- MATCHED, DISCREPANCY_FOUND, PENDING
        our_total DECIMAL(15,2) NOT NULL,
        provider_total DECIMAL(15,2) NOT NULL,
        discrepancy DECIMAL(15,2) NOT NULL,
        details TEXT, -- JSON string representation
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fraud_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        condition_type TEXT NOT NULL, -- AMOUNT_THRESHOLD, VELOCITY, GEO_MISMATCH
        parameters TEXT NOT NULL, -- JSON string representation
        action TEXT NOT NULL, -- BLOCK, FLAG, ALLOW
        enabled INTEGER DEFAULT 1 -- 1 for true, 0 for false
      );
    `;

    try {
      await this.exec(schema);
      console.log('Database tables verified/created successfully.');
      await this.seedInitialData();
    } catch (err) {
      console.error('Error initializing schema tables:', err);
    } finally {
      this.resolveInit();
    }
  }

  // Pre-seed a default merchant and some default rules if empty
  private async seedInitialData() {
    try {
      // Helper function matching promisified queries (no await initPromise needed here)
      const getCount = (tbl: string): Promise<number> => {
        return new Promise((resolve) => {
          this.db.get(`SELECT COUNT(*) as count FROM ${tbl}`, (err, row: any) => {
            resolve(row ? row.count : 0);
          });
        });
      };

      const merchantCount = await getCount('merchants');
      if (merchantCount === 0) {
        const defaultMerchantId = 'mch_acme_corp_001';
        await new Promise<void>((resolve, reject) => {
          this.db.run(
            `INSERT INTO merchants (id, name, api_key_hash, enabled_providers, default_currency, webhook_url)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              defaultMerchantId,
              'Acme Global Corp',
              'api_key_123456',
              JSON.stringify(['stripe', 'paypal', 'razorpay']),
              'USD',
              'https://webhook.site/mock-endpoint-acme'
            ],
            (err) => (err ? reject(err) : resolve())
          );
        });
        console.log('Seeded default merchant.');
      }

      const ruleCount = await getCount('fraud_rules');
      if (ruleCount === 0) {
        const insertRule = (id: string, name: string, type: string, params: string, action: string) => {
          return new Promise<void>((resolve, reject) => {
            this.db.run(
              `INSERT INTO fraud_rules (id, name, condition_type, parameters, action, enabled) VALUES (?, ?, ?, ?, ?, ?)`,
              [id, name, type, params, action, 1],
              (err) => (err ? reject(err) : resolve())
            );
          });
        };

        await insertRule(
          'rule_amount_limit',
          'High Amount Threshold',
          'AMOUNT_THRESHOLD',
          JSON.stringify({ limit: 5000 }),
          'BLOCK'
        );
        await insertRule(
          'rule_velocity_limit',
          'High Velocity Check',
          'VELOCITY',
          JSON.stringify({ limit: 5, windowMinutes: 1 }),
          'FLAG'
        );
        await insertRule(
          'rule_geo_mismatch',
          'Geo Country Mismatch Check',
          'GEO_MISMATCH',
          JSON.stringify({ allowMismatch: false }),
          'FLAG'
        );
        console.log('Seeded default fraud rules.');
      }
    } catch (err) {
      console.error('Error seeding initial data:', err);
    }
  }
}

const globalForDb = global as unknown as { db: DatabaseManager };
export const db = globalForDb.db || new DatabaseManager();
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;
