export interface IdempotencyRecord {
  response: any;
  createdAt: number;
}

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
  encryptedCard: string; // Simulated encrypted representation
}

class SimulationMemoryStore {
  // Mock Redis
  private idempotencyKeys: Map<string, IdempotencyRecord> = new Map();
  
  // Mock Provider States & Custom Configs
  public circuitBreakers: Record<string, CircuitBreakerState> = {
    stripe: { state: 'CLOSED', failures: 0, cooldownEnd: 0, customSuccessRate: 98, customLatency: 150 },
    paypal: { state: 'CLOSED', failures: 0, cooldownEnd: 0, customSuccessRate: 85, customLatency: 280 },
    razorpay: { state: 'CLOSED', failures: 0, cooldownEnd: 0, customSuccessRate: 92, customLatency: 180 },
  };

  // Mock Kafka Event Stream
  public eventStream: EventLog[] = [];

  // Mock SQS Retry Queue
  public sqsQueue: { id: string; paymentId: string; nextAttemptAt: number; attemptNumber: number; payload: any }[] = [];

  // Webhook Queue
  public webhookLogs: WebhookLog[] = [];

  // Vault (Token Database)
  private cardVault: Map<string, CardTokenRecord> = new Map();

  constructor() {
    this.publishEvent('system.boot', 'Payment Orchestration engine booted successfully', { version: '1.0.0' });
  }

  // --- Idempotency Helper (Redis SET NX with TTL) ---
  public getIdempotency(key: string): IdempotencyRecord | undefined {
    const record = this.idempotencyKeys.get(key);
    if (!record) return undefined;
    
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (Date.now() - record.createdAt > ONE_DAY) {
      this.idempotencyKeys.delete(key);
      return undefined;
    }
    return record;
  }

  public setIdempotency(key: string, response: any) {
    this.idempotencyKeys.set(key, {
      response,
      createdAt: Date.now()
    });
  }

  public listIdempotencyKeys() {
    return Array.from(this.idempotencyKeys.entries()).map(([key, record]) => ({
      key,
      createdAt: new Date(record.createdAt).toISOString(),
    }));
  }

  // --- Event Stream (Kafka) ---
  public publishEvent(topic: string, message: string, payload: any) {
    const event: EventLog = {
      id: 'evt_' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      topic,
      message,
      payload
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
        ...update
      };
      this.publishEvent('provider.circuit_status', `Provider ${provider} circuit state changed to ${this.circuitBreakers[provider].state}`, {
        provider,
        ...this.circuitBreakers[provider]
      });
    }
  }

  // --- Webhooks Simulator ---
  public addWebhookLog(log: WebhookLog) {
    this.webhookLogs.unshift(log);
    if (this.webhookLogs.length > 50) this.webhookLogs.pop();
  }

  public updateWebhookLog(id: string, update: Partial<WebhookLog>) {
    const log = this.webhookLogs.find(l => l.id === id);
    if (log) {
      Object.assign(log, update);
    }
  }
}

const globalForStore = global as unknown as { store: SimulationMemoryStore };
export const memoryStore = globalForStore.store || new SimulationMemoryStore();
if (process.env.NODE_ENV !== 'production') globalForStore.store = memoryStore;
