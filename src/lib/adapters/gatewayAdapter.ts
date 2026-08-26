import crypto from 'crypto';
import { CardDetails } from '../services/vault';
import { memoryStore } from '../store/memoryCache';

export type GatewayOutcome =
  | 'SUCCEEDED'
  | 'DETERMINISTIC_DECLINE'
  | 'AMBIGUOUS_TIMEOUT'
  | 'AUTHENTICATION_REQUIRED';

export interface GatewayRequest {
  paymentId: string;
  amount: number;
  currency: string;
  cardDetails: CardDetails;
  customerId: string;
  capture: boolean;
  metadata?: Record<string, any>;
}

export interface GatewayResponse {
  success: boolean;
  outcome: GatewayOutcome;
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  latencyMs: number;
  rawResponse: Record<string, any>;
}

export interface PaymentGatewayAdapter {
  readonly name: string;
  executePayment(req: GatewayRequest): Promise<GatewayResponse>;
  inquirePayment(transactionId: string): Promise<GatewayResponse>;
  refundPayment(transactionId: string, amount: number, currency: string): Promise<GatewayResponse>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

abstract class BaseGatewayAdapter implements PaymentGatewayAdapter {
  abstract readonly name: string;

  public async executePayment(req: GatewayRequest): Promise<GatewayResponse> {
    const cbState = memoryStore.circuitBreakers[this.name.toLowerCase()];
    const simulatedSuccessRate = cbState?.customSuccessRate ?? 90;
    const simulatedBaseLatency = cbState?.customLatency ?? 180;

    const startMs = Date.now();
    // Simulate real network flight
    await sleep(simulatedBaseLatency + Math.floor(Math.random() * 60));
    const latencyMs = Date.now() - startMs;

    const last4 = req.cardDetails.number.slice(-4);

    // 1. Card Pattern: 9999 = Deterministic Insufficient Funds
    if (last4 === '9999') {
      return {
        success: false,
        outcome: 'DETERMINISTIC_DECLINE',
        errorCode: 'insufficient_funds',
        errorMessage: 'Card Declined: Insufficient Funds',
        latencyMs,
        rawResponse: { error: 'insufficient_funds', decline_code: 'card_declined' },
      };
    }

    // 2. Card Pattern: 8888 = Ambiguous Gateway Timeout (504 / Connection Drop)
    if (last4 === '8888') {
      return {
        success: false,
        outcome: 'AMBIGUOUS_TIMEOUT',
        errorCode: 'gateway_timeout',
        errorMessage: 'Gateway Timeout: Provider connection timed out after 3000ms',
        latencyMs,
        rawResponse: { error: 'gateway_timeout', status: 504 },
      };
    }

    // 3. Card Pattern: 7777 = 3DS Authentication Required
    if (last4 === '7777') {
      return {
        success: false,
        outcome: 'AUTHENTICATION_REQUIRED',
        errorCode: 'authentication_required',
        errorMessage: '3DS Required: Cardholder authentication required',
        latencyMs,
        rawResponse: { error: 'authentication_required', next_action: 'redirect_to_3ds' },
      };
    }

    // 4. Random Health Roll based on Circuit / Simulator configuration
    const randomRoll = Math.random() * 100;
    if (randomRoll > simulatedSuccessRate) {
      return {
        success: false,
        outcome: 'DETERMINISTIC_DECLINE',
        errorCode: 'provider_api_error',
        errorMessage: `${this.name} API Error: Card network unavailable (roll: ${randomRoll.toFixed(1)} > rate: ${simulatedSuccessRate}%)`,
        latencyMs,
        rawResponse: { error: 'network_error', provider: this.name },
      };
    }

    // 5. Successful Charge
    const transactionId = `tx_${this.name.toLowerCase()}_` + crypto.randomBytes(8).toString('hex');
    return {
      success: true,
      outcome: 'SUCCEEDED',
      transactionId,
      latencyMs,
      rawResponse: {
        id: transactionId,
        provider: this.name,
        amount: req.amount,
        currency: req.currency,
        status: req.capture ? 'succeeded' : 'authorized',
      },
    };
  }

  public async inquirePayment(transactionId: string): Promise<GatewayResponse> {
    await sleep(80);
    return {
      success: true,
      outcome: 'SUCCEEDED',
      transactionId,
      latencyMs: 80,
      rawResponse: { status: 'succeeded', id: transactionId },
    };
  }

  public async refundPayment(transactionId: string, amount: number, currency: string): Promise<GatewayResponse> {
    await sleep(120);
    return {
      success: true,
      outcome: 'SUCCEEDED',
      transactionId: `ref_${this.name.toLowerCase()}_` + crypto.randomBytes(6).toString('hex'),
      latencyMs: 120,
      rawResponse: { status: 'refunded', original_tx: transactionId, amount, currency },
    };
  }
}

export class StripeAdapter extends BaseGatewayAdapter {
  readonly name = 'stripe';
}

export class PayPalAdapter extends BaseGatewayAdapter {
  readonly name = 'paypal';
}

export class RazorpayAdapter extends BaseGatewayAdapter {
  readonly name = 'razorpay';
}

export class GatewayAdapterRegistry {
  private static adapters: Map<string, PaymentGatewayAdapter> = new Map<string, PaymentGatewayAdapter>([
    ['stripe', new StripeAdapter()],
    ['paypal', new PayPalAdapter()],
    ['razorpay', new RazorpayAdapter()],
  ]);

  public static getAdapter(name: string): PaymentGatewayAdapter {
    const adapter = this.adapters.get(name.toLowerCase());
    if (!adapter) {
      throw new Error(`Unsupported payment gateway adapter: ${name}`);
    }
    return adapter;
  }
}
