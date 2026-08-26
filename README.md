# Orchestra: High-Reliability Payment Orchestration Platform



---

## Overview

**Orchestra** is an enterprise-grade **Payment Orchestration Engine & Developer Simulator** designed to model high-reliability multi-gateway payment processing. It solves the critical distributed systems challenges in fintech: **smart dynamic routing, duplicate payment prevention (two-phase atomic idempotency), gateway timeout safety, PCI-DSS tokenization isolation, double-entry bookkeeping, and bank settlement reconciliation**.

Built with a restrained, high-density fintech aesthetic inspired by the engineering and design philosophy of **Stripe, Linear, and Ramp**, Orchestra provides deep observability into every stage of a payment's lifecycle.

---

## Key Subsystems & Architecture

```
                                  ORCHESTRA SYSTEM TOPOLOGY
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   API Gateway & Ingress                                         │
│                      (Two-Phase Atomic Idempotency Lock · Redis SET NX)                         │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Payment Orchestration Engine                                    │
│                                                                                                 │
│   ┌──────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐    │
│   │   PCI Tokenizer Vault    │   │   Fraud Scoring Engine   │   │   Smart Routing Engine   │    │
│   │   (AES-256 Encryption)   │   │   (Velocity + Geo Rules) │   │  (Cost + SLA + Circuit)  │    │
│   └──────────────────────────┘   └──────────────────────────┘   └──────────────────────────┘    │
│                                               │                                                 │
│                                               ▼                                                 │
│                              ┌──────────────────────────────────┐                               │
│                              │   Polymorphic Gateway Adapters   │                               │
│                              │   (Stripe · PayPal · Razorpay)   │                               │
│                              └────────────────┬─────────────────┘                               │
└───────────────────────────────────────────────┼─────────────────────────────────────────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
┌───────────────────────────────────────────────┐ ┌───────────────────────────────────────────────┐
│        Double-Entry Ledger Engine             │ │          Transactional Outbox & Events        │
│                                               │ │                                               │
│  - Immutable Journal Entries                  │ │  - Kafka Real-Time Event Stream               │
│  - Atomic Account Balance Upserts             │ │  - Webhook Dispatcher (HMAC-SHA256)           │
│  - Mass Conservation: Debits ≡ Credits        │ │  - Exponential Backoff & Retry Tracing        │
│  - Zero Floating-Point Drift (Minor Units)    │ │  - Settlement Reconciliation Scanner          │
└───────────────────────────────────────────────┘ └───────────────────────────────────────────────┘
```

### 1. Two-Phase Atomic Idempotency Locking
Eliminates window race conditions. When a payment request arrives with an `Idempotency-Key`, the engine atomically acquires a lock with states:
- `ACQUIRED`: Caller executes the transaction.
- `IN_PROGRESS`: Concurrent duplicate requests receive `409 Conflict` (or wait for resolution).
- `COMPLETED`: Subsequent requests immediately receive the cached response payload (`X-Cache: HIT`).

### 2. Ambiguous Timeout Safety (No Double-Charging)
When an external payment gateway encounters an HTTP 504 / connection drop, the orchestrator **does not blindly failover** to a secondary provider (which would double-charge the cardholder). Instead, it marks the transaction as `PENDING_INQUIRY` and halts synchronous retries until status inquiry or webhook reconciliation confirms the state.

### 3. Double-Entry Accounting Ledger Engine
Guarantees mathematical mass conservation on every capture, refund, or fee deduction:
$$\sum \text{Debits} \equiv \sum \text{Credits} \quad (\text{Variance } \$0.00)$$
- All financial math is computed in **integer currency minor units (cents / paise)** to eliminate IEEE 754 floating-point rounding artifacts.
- Atomic balance upserts prevent lost-update concurrency races under high transaction volumes.

### 4. Polymorphic Gateway Adapters & Circuit Breakers
- Standardized `PaymentGatewayAdapter` interface separating **Deterministic Declines** (`422 Insufficient Funds`) from **Ambiguous Timeouts** (`504 Gateway Timeout`).
- Dynamic 3-state Circuit Breakers (`CLOSED`, `OPEN`, `HALF_OPEN`) with automatic cooldown timers and health recovery.

### 5. Multi-Partial Refund Engine
- Tracks cumulative `refunded_amount` and optimistic locking `version` per payment.
- Allows multiple partial refunds up to the original transaction total with proportional double-entry ledger reversals.

### 6. Automated Bank & Provider Reconciliation
- 3-way reconciliation scanner auditing internal ledger entries against simulated provider settlement files.
- Categorizes discrepancies: `AMOUNT_MISMATCH`, `MISSING_IN_LEDGER`, and `MISSING_IN_PROVIDER_STATEMENT`.

---

## Interactive Developer Interface

The frontend is designed as a genuine fintech infrastructure console with 10 dedicated views:

| View | Purpose |
| :--- | :--- |
| **Overview** | Top-level volume KPIs, gateway circuit matrix, and interactive SVG performance curves (Volume, Success Rate, Latency, Transactions). |
| **Payments Explorer** | High-density transaction table with multi-field search, status/provider filters, and quick access to deep investigations. |
| **Payment Detail Drawer** | Slide-over inspector featuring lifecycle steppers, microsecond execution timelines, double-entry ledger breakdowns, raw JSON payloads, and one-click partial/full refund actions. |
| **Gateways & Circuits** | Live circuit breaker state machine visuals, failure counters, cooldown timers, and network telemetry emulation sliders. |
| **Smart Routing Engine** | Visual decision waterfall pipeline, optimization strategy switch (Lowest Cost vs Highest SLA), and dynamic interchange fee matrix. |
| **Double-Entry Ledger** | Account balances sheet, mass conservation verification banner, and immutable audit journal entries table. |
| **Reconciliation** | Provider settlement batch scanner with discrepancy cards and one-click adjustment posting. |
| **Webhooks Queue** | Outbound notification logs, HMAC-SHA256 signature verification badges, and exponential backoff retry traces. |
| **Developer Event Stream**| Real-time Kafka-style event bus log with topic filtering and collapsible payload inspectors. |
| **Engine Blueprint** | Interactive systems architecture diagram detailing component boundaries and financial invariants. |

---

## Quickstart & Installation

### Prerequisites
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/payment-orchestration-simulator.git
cd payment-orchestration-simulator

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Automated Verification & Test Suite

Orchestra includes an automated financial correctness and integration test suite proving distributed consistency and invariant preservation:

```bash
# Run Financial Correctness & Concurrency Test Suite
npx tsx scratch/test_financial_correctness.ts

# Run Core Services Integration Test Suite
npx tsx scratch/test_services.ts

# Run Strict TypeScript Typecheck
npx tsc --noEmit
```

### Verified Test Invariants:
1. **Idempotency Lock Race Condition:** 10 parallel callers fire the same key $\rightarrow$ exactly 1 acquires lock, 9 receive `IN_PROGRESS`.
2. **Gateway Timeout Safety:** Card `8888` times out $\rightarrow$ tagged `AMBIGUOUS_TIMEOUT` with zero multi-gateway double charges.
3. **Atomic Ledger Concurrency:** 20 parallel captures on the same merchant account update balance with $\$0.00$ lost updates.
4. **Multi-Partial Refund Flow:** Sequential refunds ($\$30, \$50, \$20$) track accumulated balances and return merchant account to $\$0.00$.
5. **Mass Conservation Law:** $\sum \text{Debits} \equiv \sum \text{Credits}$ across all ledger rows in SQLite.

---

## API Reference

### 1. Process Payment
```http
POST /api/v1/payments
Idempotency-Key: idem_abc123
Content-Type: application/json

{
  "merchant_id": "mch_acme_corp_001",
  "amount": 100.00,
  "currency": "USD",
  "card_token": "tok_visa_4242_3c0dcad8",
  "customer_id": "cust_usr_01",
  "capture": true,
  "routing_strategy": "HIGHEST_SUCCESS"
}
```

### 2. Capture Authorized Payment
```http
POST /api/v1/payments/:id/capture
```

### 3. Partial or Full Refund
```http
POST /api/v1/payments/:id/refund
Content-Type: application/json

{
  "amount": 35.00
}
```

### 4. PCI Card Tokenization
```http
POST /api/v1/vault/tokenize
Content-Type: application/json

{
  "number": "4111 1111 1111 4242",
  "expiry": "12/28",
  "cvv": "123",
  "holder": "Jane Doe"
}
```

---

## Production Scaling Architecture

| Subsystem | Simulator Implementation | Production Infrastructure Target |
| :--- | :--- | :--- |
| **Primary Database** | SQLite (WAL Mode, Mutexed Tx) | PostgreSQL Aurora with SERIALIZABLE isolation & PgBouncer |
| **Idempotency & Locks**| In-Memory Map (Two-Phase Lock) | Redis Cluster (`SET key val NX EX 86400`) |
| **Event Bus** | In-Memory Circular Buffer (200 evts) | Apache Kafka / AWS MSK with 7-day retention & replay |
| **Card Vault Key** | AES-256-CBC Local Key | AWS KMS / HashiCorp Vault with Envelope HSM Keys |
| **Webhooks Outbox** | Async Background Worker | Transactional Outbox + AWS SQS & Dead Letter Queue |
| **Deployment** | Next.js Single Process | Kubernetes (EKS) with Horizontal Pod Autoscaling (HPA) |

---

## License

MIT License. Designed for fintech engineering portfolios, architecture reviews, and high-reliability payment systems demonstrations.
