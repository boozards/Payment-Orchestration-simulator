"use client";

import React, { useState } from "react";
import StatusBadge from "../shared/StatusBadge";
import {
  Play,
  RefreshCw,
  Zap,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Copy,
  Check,
} from "lucide-react";

interface SimulatorViewProps {
  merchants: any[];
  selectedMerchant: string;
  onSelectMerchant: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  idempotencyKey: string;
  setIdempotencyKey: (v: string) => void;
  generateIdempotencyKey: () => void;
  cardNumber: string;
  setCardNumber: (v: string) => void;
  cardExpiry: string;
  setCardExpiry: (v: string) => void;
  cardCvv: string;
  setCardCvv: (v: string) => void;
  cardHolder: string;
  setCardHolder: (v: string) => void;
  customerEmail: string;
  setCustomerEmail: (v: string) => void;
  customerIpCountry: string;
  setCustomerIpCountry: (v: string) => void;
  cardCountry: string;
  setCardCountry: (v: string) => void;
  routingStrategy: string;
  setRoutingStrategy: (v: any) => void;
  manualProvider: string;
  setManualProvider: (v: string) => void;
  capturePayment: boolean;
  setCapturePayment: (v: boolean) => void;
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  setCardScenario: (type: "success" | "decline" | "timeout" | "auth3ds") => void;
  executionTrace: string[];
  lastResponse: any;
}

export default function SimulatorView({
  merchants,
  selectedMerchant,
  onSelectMerchant,
  amount,
  setAmount,
  currency,
  setCurrency,
  idempotencyKey,
  setIdempotencyKey,
  generateIdempotencyKey,
  cardNumber,
  setCardNumber,
  cardExpiry,
  setCardExpiry,
  cardCvv,
  setCardCvv,
  cardHolder,
  setCardHolder,
  customerEmail,
  setCustomerEmail,
  customerIpCountry,
  setCustomerIpCountry,
  cardCountry,
  setCardCountry,
  routingStrategy,
  setRoutingStrategy,
  manualProvider,
  setManualProvider,
  capturePayment,
  setCapturePayment,
  isProcessing,
  onSubmit,
  setCardScenario,
  executionTrace,
  lastResponse,
}: SimulatorViewProps) {
  const [activeScenario, setActiveScenario] = useState<string>("success");
  const [copiedResponse, setCopiedResponse] = useState(false);

  const handleScenarioClick = (type: "success" | "decline" | "timeout" | "auth3ds") => {
    setActiveScenario(type);
    setCardScenario(type);
  };

  const copyResponseJson = () => {
    if (lastResponse) {
      navigator.clipboard.writeText(JSON.stringify(lastResponse, null, 2));
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 1500);
    }
  };

  // Determine Architectural Explanation
  const getExplanation = () => {
    if (!lastResponse) return null;

    if (lastResponse.status === "PENDING_INQUIRY") {
      return {
        title: "Timeout Safety Guard Triggered (Double-Charge Prevented)",
        body: "The payment provider timed out after 3000ms. In accordance with strict distributed financial invariants, the orchestrator transitioned this transaction to PENDING_INQUIRY and halted execution without blind failover, preventing a duplicate charge on secondary providers.",
        type: "warning",
      };
    }

    if (lastResponse.status === "FAILED") {
      return {
        title: "Deterministic Gateway Decline Enforced",
        body: `The card network rejected the transaction (${lastResponse.failure_reason}). Because this was a cardholder decline, multi-gateway failover was safely skipped to prevent hammering subsequent gateways with an invalid payment method.`,
        type: "error",
      };
    }

    if (lastResponse.status === "SETTLED" || lastResponse.status === "CAPTURED") {
      return {
        title: "Payment Successfully Routed & Settled",
        body: `Transaction successfully authorized through ${lastResponse.provider?.toUpperCase()} and settled via double-entry ledger bookkeeping. Merchant, platform, and provider reserve balances were updated atomically.`,
        type: "success",
      };
    }

    return null;
  };

  const explanation = getExplanation();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Developer Simulation Studio
        </h1>
        <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
          Configure mock transactions, test failure injections (timeouts, declines, 3DS), and inspect live orchestration traces.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "20px", alignItems: "start" }}>
        {/* Left Form: Transaction Setup & Scenario Injection */}
        <div className="fin-card">
          <div className="fin-card-header">
            <span className="fin-card-title">Transaction Configuration</span>
            <span className="fin-label" style={{ margin: 0 }}>PCI Tokenized</span>
          </div>

          <div className="fin-card-body">
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Failure Injection Presets */}
              <div>
                <label className="fin-label">Failure Injection Presets</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => handleScenarioClick("success")}
                    className={`fin-btn fin-btn-sm ${
                      activeScenario === "success" ? "fin-btn-primary" : "fin-btn-secondary"
                    }`}
                    style={{ fontSize: "11px" }}
                  >
                    200 Success
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScenarioClick("decline")}
                    className={`fin-btn fin-btn-sm ${
                      activeScenario === "decline" ? "fin-btn-primary" : "fin-btn-secondary"
                    }`}
                    style={{ fontSize: "11px" }}
                  >
                    422 Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScenarioClick("timeout")}
                    className={`fin-btn fin-btn-sm ${
                      activeScenario === "timeout" ? "fin-btn-primary" : "fin-btn-secondary"
                    }`}
                    style={{ fontSize: "11px" }}
                  >
                    504 Timeout
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScenarioClick("auth3ds")}
                    className={`fin-btn fin-btn-sm ${
                      activeScenario === "auth3ds" ? "fin-btn-primary" : "fin-btn-secondary"
                    }`}
                    style={{ fontSize: "11px" }}
                  >
                    3DS Auth
                  </button>
                </div>
              </div>

              {/* Merchant & Amount Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="fin-label">Merchant</label>
                  <select
                    value={selectedMerchant}
                    onChange={(e) => onSelectMerchant(e.target.value)}
                    className="fin-input"
                  >
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="fin-label">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="fin-input mono"
                    placeholder="100.00"
                    required
                  />
                </div>

                <div>
                  <label className="fin-label">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="fin-input mono"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>

              {/* Idempotency Key */}
              <div>
                <label className="fin-label">Idempotency Key (Redis SET NX)</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    value={idempotencyKey}
                    onChange={(e) => setIdempotencyKey(e.target.value)}
                    placeholder="idem_..."
                    className="fin-input mono"
                    style={{ fontSize: "12px" }}
                  />
                  <button
                    type="button"
                    onClick={generateIdempotencyKey}
                    className="fin-btn fin-btn-secondary fin-btn-sm"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Card Tokenization Vault Inputs */}
              <div
                style={{
                  padding: "12px",
                  background: "var(--bg-canvas)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className="fin-label" style={{ margin: 0 }}>
                    PCI Vault Card Details
                  </span>
                  <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)" }}>AES-256-CBC</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Card Number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="fin-input mono"
                    style={{ fontSize: "12px" }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="fin-input mono"
                    style={{ fontSize: "12px" }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="CVV"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="fin-input mono"
                    style={{ fontSize: "12px" }}
                    required
                  />
                </div>
              </div>

              {/* Routing Strategy */}
              <div>
                <label className="fin-label">Smart Routing Policy</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setRoutingStrategy("HIGHEST_SUCCESS")}
                    className={`fin-tab-btn ${routingStrategy === "HIGHEST_SUCCESS" ? "active" : ""}`}
                    style={{ border: "1px solid var(--border-subtle)", padding: "6px" }}
                  >
                    Highest SLA
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoutingStrategy("LOWEST_COST")}
                    className={`fin-tab-btn ${routingStrategy === "LOWEST_COST" ? "active" : ""}`}
                    style={{ border: "1px solid var(--border-subtle)", padding: "6px" }}
                  >
                    Lowest Cost
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoutingStrategy("MANUAL")}
                    className={`fin-tab-btn ${routingStrategy === "MANUAL" ? "active" : ""}`}
                    style={{ border: "1px solid var(--border-subtle)", padding: "6px" }}
                  >
                    Manual Select
                  </button>
                </div>

                {routingStrategy === "MANUAL" && (
                  <div style={{ marginTop: "8px" }}>
                    <select
                      value={manualProvider}
                      onChange={(e) => setManualProvider(e.target.value)}
                      className="fin-input mono"
                    >
                      <option value="stripe">Stripe</option>
                      <option value="paypal">PayPal</option>
                      <option value="razorpay">Razorpay</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="fin-btn fin-btn-primary"
                style={{ width: "100%", height: "38px", fontSize: "13px", marginTop: "4px" }}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Executing Orchestration Engine...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Run Payment Simulation</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Panel: Execution Result, Explanation & Trace */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Outcome & Architectural Explanation Card */}
          {explanation && (
            <div
              style={{
                padding: "16px",
                borderRadius: "var(--radius-md)",
                backgroundColor:
                  explanation.type === "success"
                    ? "var(--status-success-bg)"
                    : explanation.type === "warning"
                    ? "var(--status-warning-bg)"
                    : "var(--status-error-bg)",
                border: `1px solid ${
                  explanation.type === "success"
                    ? "var(--status-success-border)"
                    : explanation.type === "warning"
                    ? "var(--status-warning-border)"
                    : "var(--status-error-border)"
                }`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                {explanation.type === "success" && <CheckCircle2 size={16} color="var(--status-success-text)" />}
                {explanation.type === "warning" && <Clock size={16} color="var(--status-warning-text)" />}
                {explanation.type === "error" && <AlertTriangle size={16} color="var(--status-error-text)" />}
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color:
                      explanation.type === "success"
                        ? "var(--status-success-text)"
                        : explanation.type === "warning"
                        ? "var(--status-warning-text)"
                        : "var(--status-error-text)",
                  }}
                >
                  {explanation.title}
                </span>
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.45,
                  margin: 0,
                }}
              >
                {explanation.body}
              </p>
            </div>
          )}

          {/* Execution Trace Log */}
          <div className="fin-card">
            <div className="fin-card-header">
              <span className="fin-card-title">Orchestrator Execution Trace</span>
              <span className="mono text-muted" style={{ fontSize: "11px" }}>
                {executionTrace.length} events logged
              </span>
            </div>

            <div
              style={{
                padding: "14px",
                backgroundColor: "#09090B",
                color: "#E4E4E7",
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
                minHeight: "180px",
                maxHeight: "240px",
                overflowY: "auto",
                lineHeight: 1.55,
                borderRadius: "0 0 var(--radius-md) var(--radius-md)",
              }}
            >
              {executionTrace.length === 0 ? (
                <div style={{ color: "#71717A", textAlign: "center", padding: "48px 0" }}>
                  // Run a simulation to stream live step-by-step orchestrator execution trace
                </div>
              ) : (
                executionTrace.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      color: msg.includes("Failed") || msg.includes("Blocked")
                        ? "#F87171"
                        : msg.includes("Timeout") || msg.includes("guarded")
                        ? "#FBBF24"
                        : msg.includes("Resolved") || msg.includes("Created") || msg.includes("Double-entry")
                        ? "#4ADE80"
                        : "#D4D4D8",
                    }}
                  >
                    {msg}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Response Payload Inspector */}
          {lastResponse && (
            <div className="fin-card">
              <div className="fin-card-header">
                <span className="fin-card-title">HTTP Response Payload</span>
                <button onClick={copyResponseJson} className="fin-btn fin-btn-secondary fin-btn-sm">
                  {copiedResponse ? <Check size={11} /> : <Copy size={11} />}
                  <span>Copy JSON</span>
                </button>
              </div>
              <pre
                className="mono"
                style={{
                  margin: 0,
                  padding: "12px",
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  backgroundColor: "var(--bg-canvas)",
                  maxHeight: "160px",
                  overflowY: "auto",
                }}
              >
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
