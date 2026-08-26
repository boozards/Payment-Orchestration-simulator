export type IdempotencyStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IdempotencyRecord {
  key: string;
  merchantId: string;
  requestHash: string;
  status: IdempotencyStatus;
  response?: any;
  statusCode?: number;
  createdAt: number;
  expiresAt: number;
}

export type IdempotencyLockResult =
  | { status: 'ACQUIRED' }
  | { status: 'IN_PROGRESS' }
  | { status: 'COMPLETED'; response: any; statusCode: number };

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  cooldownEnd: number;
  customSuccessRate: number; // 0 to 100
  customLatency: number; // in ms
}

export interface EventLog {
  id: string;
  timestamp: string;
  topic: string;
  message: string;
  payload: any;
}

export interface WebhookLog {
  id: string;
  paymentId: string;
  url: string;
  payload: any;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
  attempts: number;
  maxAttempts: number;
  lastResponse?: string;
  logs: string[];
}

export interface CardTokenRecord {
  token: string;
  maskedNumber: string;
  brand: string;
  holder: string;
  encryptedCard: string;
}

class SimulationMemoryStore {
  // Two-phase atomic Idempotency Store (simulating Redis SET key val NX EX)
  private idempotencyMap: Map<string, IdempotencyRecord> = new Map();

  // Circuit Breaker State per Gateway
  public circuitBreakers: Record<string, CircuitBreakerState> = {
    stripe: { state: 'CLOSED', failures: 0, cooldownEnd: 0, customSuccessRate: 98, customLatency: 150 },
    paypal: { state: 'CLOSED', failures: 0, cooldownEnd: 0, customSuccessRate: 85, customLatency: 280 },
    razorpay: { state: 'CLOSED', failures: 0, cooldownEnd: 0, customSuccessRate: 92, customLatency: 180 },
  };

  // Kafka Event Stream
  public eventStream: EventLog[] = [];

  // Webhook Queue
  public webhookLogs: WebhookLog[] = [];

  // Vault (Card Token Store)
  private cardVault: Map<string, CardTokenRecord> = new Map();

  constructor() {
    this.publishEvent('system.boot', 'Payment Orchestration engine booted successfully', { version: '2.0.0' });
  }

  // --- Two-Phase Atomic Idempotency Locking ---
  public acquireIdempotencyLock(
    key: string,
    merchantId: string,
    requestHash: string,
    ttlSeconds = 86400
  ): IdempotencyLockResult {
    const now = Date.now();
    const existing = this.idempotencyMap.get(key);

    if (existing) {
      // Check if expired
      if (now > existing.expiresAt) {
        this.idempotencyMap.delete(key);
      } else if (existing.status === 'PROCESSING') {
        // Request is currently being processed by another concurrent worker/request
        return { status: 'IN_PROGRESS' };
      } else if (existing.status === 'COMPLETED') {
        return {
          status: 'COMPLETED',
          response: existing.response,
          statusCode: existing.statusCode || 200,
        };
      }
    }

    // Atomic reservation (Set NX)
    const record: IdempotencyRecord = {
      key,
      merchantId,
      requestHash,
      status: 'PROCESSING',
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
    };
    this.idempotencyMap.set(key, record);
    return { status: 'ACQUIRED' };
  }

  public completeIdempotencyLock(key: string, response: any, statusCode = 200) {
    const record = this.idempotencyMap.get(key);
    if (record) {
      record.status = 'COMPLETED';
      record.response = response;
      record.statusCode = statusCode;
    }
  }

  public releaseIdempotencyLock(key: string) {
    this.idempotencyMap.delete(key);
  }

  public getIdempotency(key: string): IdempotencyRecord | undefined {
    const record = this.idempotencyMap.get(key);
    if (!record) return undefined;
    if (Date.now() > record.expiresAt) {
      this.idempotencyMap.delete(key);
      return undefined;
    }
    return record;
  }

  public listIdempotencyKeys() {
    return Array.from(this.idempotencyMap.entries()).map(([key, record]) => ({
      key,
      status: record.status,
      createdAt: new Date(record.createdAt).toISOString(),
    }));
  }

  // --- Event Stream (Kafka) ---
  public publishEvent(topic: string, message: string, payload: any) {
    const event: EventLog = {
      id: 'evt_' + Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      topic,
      message,
      payload,
    };
    this.eventStream.unshift(event);
    if (this.eventStream.length > 200) {
      this.eventStream.pop(); // Keep last 200 events
    }
    console.log(`[KAFKA: ${topic}] ${message}`);
  }

  // --- Vault Token Store ---
  public saveCardToken(token: string, record: CardTokenRecord) {
    this.cardVault.set(token, record);
  }

  public getCardToken(token: string): CardTokenRecord | undefined {
    return this.cardVault.get(token);
  }

  // --- Circuit Breaker Updates ---
  public updateCircuit(provider: string, update: Partial<CircuitBreakerState>) {
    if (this.circuitBreakers[provider]) {
      this.circuitBreakers[provider] = {
        ...this.circuitBreakers[provider],
        ...update,
      };
      this.publishEvent(
        'provider.circuit_status',
        `Provider ${provider} circuit state changed to ${this.circuitBreakers[provider].state}`,
        {
          provider,
          ...this.circuitBreakers[provider],
        }
      );
    }
  }

  // --- Webhooks Simulator ---
  public addWebhookLog(log: WebhookLog) {
    this.webhookLogs.unshift(log);
    if (this.webhookLogs.length > 50) this.webhookLogs.pop();
  }

  public updateWebhookLog(id: string, update: Partial<WebhookLog>) {
    const log = this.webhookLogs.find((l) => l.id === id);
    if (log) {
      Object.assign(log, update);
    }
  }
}

const globalForStore = global as unknown as { store: SimulationMemoryStore };
export const memoryStore = globalForStore.store || new SimulationMemoryStore();
if (process.env.NODE_ENV !== 'production') globalForStore.store = memoryStore;
