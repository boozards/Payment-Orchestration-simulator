import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'payment_orchestrator.db');

class DatabaseManager {
  private db!: sqlite3.Database;
  private initPromise: Promise<void>;
  private resolveInit!: () => void;
  private txQueue: Promise<void> = Promise.resolve();

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

  /**
   * Thread-safe / Coroutine-safe Transaction Execution.
   * Serializes transactions across concurrent callers using an async queue to avoid SQLite nested transaction errors.
   */
  public async transaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.initPromise;

    // Mutex queue chaining
    let releaseLock: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const previousLock = this.txQueue;
    this.txQueue = currentLock;

    await previousLock;

    try {
      await this.exec('BEGIN IMMEDIATE TRANSACTION');
      const result = await fn();
      await this.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        await this.exec('ROLLBACK');
      } catch {
        // Ignore if rollback not applicable
      }
      throw err;
    } finally {
      releaseLock!();
    }
  }

  // Runs schema tables creation and migrations
  private async initializeSchema() {
    const schema = `
      -- Enable WAL mode for high concurrency
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;

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
        refunded_amount DECIMAL(15,2) DEFAULT 0,
        currency TEXT NOT NULL,
        status TEXT NOT NULL, -- CREATED, PROCESSING, AUTHORIZED, CAPTURED, SETTLED, PARTIALLY_REFUNDED, REFUNDED, VOIDED, FAILED, PENDING_INQUIRY
        provider TEXT,
        provider_transaction_id TEXT,
        customer_id TEXT,
        metadata TEXT, -- JSON string representation
        failure_reason TEXT,
        version INTEGER DEFAULT 1,
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
        outcome TEXT, -- SUCCEEDED, DETERMINISTIC_DECLINE, AMBIGUOUS_TIMEOUT, AUTHENTICATION_REQUIRED
        provider_response TEXT, -- JSON string representation
        latency_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id)
      );

      CREATE TABLE IF NOT EXISTS account_balances (
        account_id TEXT PRIMARY KEY,
        account_type TEXT NOT NULL, -- MERCHANT, PROVIDER, PLATFORM_FEE, REFUND
        currency TEXT NOT NULL,
        balance DECIMAL(15,2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

      CREATE TABLE IF NOT EXISTS idempotency_records (
        key TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        status TEXT NOT NULL, -- PROCESSING, COMPLETED, FAILED
        response_body TEXT,
        response_status INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
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

      -- Indexes for performance & concurrency
      CREATE INDEX IF NOT EXISTS idx_payments_merchant_status ON payments(merchant_id, status);
      CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
      CREATE INDEX IF NOT EXISTS idx_ledger_account_created ON ledger_entries(account_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_ledger_payment_id ON ledger_entries(payment_id);
      CREATE INDEX IF NOT EXISTS idx_payment_attempts_payment ON payment_attempts(payment_id);
      CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_records(expires_at);
    `;

    try {
      await this.exec(schema);
      await this.runMigrations();
      console.log('Database tables verified/created successfully.');
      await this.seedInitialData();
    } catch (err) {
      console.error('Error initializing schema tables:', err);
    } finally {
      this.resolveInit();
    }
  }

  // Safe additive schema migrations for existing DB instances
  private async runMigrations() {
    const addColumnIfNotExists = async (table: string, columnDef: string) => {
      try {
        await this.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
      } catch (err: any) {
        if (!err.message?.includes('duplicate column')) {
          // Normal if column exists
        }
      }
    };

    await addColumnIfNotExists('payments', 'refunded_amount DECIMAL(15,2) DEFAULT 0');
    await addColumnIfNotExists('payments', 'version INTEGER DEFAULT 1');
    await addColumnIfNotExists('payment_attempts', 'outcome TEXT');
  }

  // Pre-seed a default merchant and default rules if empty
  private async seedInitialData() {
    try {
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
