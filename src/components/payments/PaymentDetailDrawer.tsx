"use client";

import React, { useState } from "react";
import Drawer from "../shared/Drawer";
import StatusBadge from "../shared/StatusBadge";
import {
  Copy,
  Check,
  CreditCard,
  Shield,
  GitBranch,
  Zap,
  BookOpen,
  Wifi,
  CornerDownRight,
  RotateCcw,
  ExternalLink,
} from "lucide-react";

interface PaymentDetailDrawerProps {
  payment: any | null;
  isOpen: boolean;
  onClose: () => void;
  onRefundPayment: (paymentId: string, amount?: number) => Promise<void>;
  ledgerEntries?: any[];
}

export default function PaymentDetailDrawer({
  payment,
  isOpen,
  onClose,
  onRefundPayment,
  ledgerEntries = [],
}: PaymentDetailDrawerProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [customRefundAmount, setCustomRefundAmount] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);

  if (!payment) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefundError(null);
    try {
      const amt = customRefundAmount ? parseFloat(customRefundAmount) : undefined;
      await onRefundPayment(payment.id, amt);
      setIsRefunding(false);
      setCustomRefundAmount("");
    } catch (err: any) {
      setRefundError(err.message || "Failed to issue refund");
    }
  };

  const filteredLedgerEntries = ledgerEntries.filter((e) => e.payment_id === payment.id);

  const amount = Number(payment.amount || 0);
  const refundedAmount = Number(payment.refunded_amount || 0);
  const remainingRefundable = amount - refundedAmount;
  const isSucceeded = payment.status === "SETTLED" || payment.status === "CAPTURED";
  const isPartiallyRefunded = payment.status === "PARTIALLY_REFUNDED";
  const canRefund = (isSucceeded || isPartiallyRefunded) && remainingRefundable > 0;

  // Metadata parsing
  let metadata: Record<string, any> = {};
  try {
    metadata = typeof payment.metadata === "string" ? JSON.parse(payment.metadata) : payment.metadata || {};
  } catch {
    metadata = {};
  }

  // Lifecycle Step Calculations
  const lifecycleSteps = [
    { label: "Tokenized", icon: <CreditCard size={12} />, status: "done" },
    {
      label: "Fraud Scored",
      icon: <Shield size={12} />,
      status: metadata.fraudBlocked ? "failed" : "done",
    },
    {
      label: "Smart Routed",
      icon: <GitBranch size={12} />,
      status: metadata.fraudBlocked ? "pending" : "done",
    },
    {
      label: "Gateway Auth",
      icon: <Zap size={12} />,
      status: payment.status === "FAILED" ? "failed" : payment.status === "PENDING_INQUIRY" ? "active" : "done",
    },
    {
      label: "Settled",
      icon: <BookOpen size={12} />,
      status: isSucceeded || isPartiallyRefunded || payment.status === "REFUNDED" ? "done" : "pending",
    },
    {
      label: "Webhook",
      icon: <Wifi size={12} />,
      status: isSucceeded ? "done" : "pending",
    },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <StatusBadge status={payment.status} />
          <span className="mono" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {payment.id}
          </span>
          <button
            onClick={() => copyToClipboard(payment.id, "payment_id")}
            className="fin-btn-icon"
            style={{ padding: "2px" }}
            title="Copy ID"
          >
            {copiedKey === "payment_id" ? <Check size={12} color="var(--status-success-dot)" /> : <Copy size={12} />}
          </button>
        </div>
      }
      subtitle={
        <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)" }}>
          Created {new Date(payment.created_at || payment.createdAt || Date.now()).toLocaleString()}
        </div>
      }
      footer={
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)" }}>
            Engine Isolation: <strong style={{ color: "var(--text-primary)" }}>SERIALIZED</strong>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {canRefund && !isRefunding && (
              <button
                onClick={() => setIsRefunding(true)}
                className="fin-btn fin-btn-secondary fin-btn-sm"
              >
                <RotateCcw size={12} />
                <span>Issue Refund</span>
              </button>
            )}
            <button onClick={onClose} className="fin-btn fin-btn-secondary fin-btn-sm">
              Close
            </button>
          </div>
        </div>
      }
    >
      {/* 1. Header Amount Breakdown */}
      <div
        style={{
          padding: "16px",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-subtle)",
          border: "1px solid var(--border-subtle)",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-tertiary)", letterSpacing: "0.05em" }}>
          Total Transaction Value
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
          <span className="mono" style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-primary)" }}>
            ${amount.toFixed(2)}
          </span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
            {payment.currency}
          </span>
        </div>

        {refundedAmount > 0 && (
          <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-subtle)", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-tertiary)" }}>Refunded to customer:</span>
            <span className="mono" style={{ fontWeight: 600, color: "var(--status-error-text)" }}>
              - ${refundedAmount.toFixed(2)} {payment.currency}
            </span>
          </div>
        )}

        {payment.failure_reason && (
          <div
            style={{
              marginTop: "10px",
              padding: "8px 10px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--status-error-bg)",
              border: "1px solid var(--status-error-border)",
              color: "var(--status-error-text)",
              fontSize: "12px",
              lineHeight: 1.4,
            }}
          >
            <strong>Failure Cause:</strong> {payment.failure_reason}
          </div>
        )}
      </div>

      {/* Refund Form Dialog (if opened) */}
      {isRefunding && (
        <form
          onSubmit={handleRefundSubmit}
          style={{
            padding: "16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-focus)",
            background: "var(--bg-surface)",
            marginBottom: "20px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>
            Issue Partial or Full Refund
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
            Max refundable: <strong>${remainingRefundable.toFixed(2)} {payment.currency}</strong>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              type="number"
              step="0.01"
              max={remainingRefundable}
              min="0.01"
              placeholder={`Amount (defaults to $${remainingRefundable.toFixed(2)})`}
              value={customRefundAmount}
              onChange={(e) => setCustomRefundAmount(e.target.value)}
              className="fin-input mono"
              style={{ height: "34px" }}
            />
            <button type="submit" className="fin-btn fin-btn-primary fin-btn-sm">
              Confirm Refund
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRefunding(false);
                setRefundError(null);
              }}
              className="fin-btn fin-btn-secondary fin-btn-sm"
            >
              Cancel
            </button>
          </div>

          {refundError && (
            <div style={{ color: "var(--status-error-text)", fontSize: "11.5px" }}>{refundError}</div>
          )}
        </form>
      )}

      {/* 2. Visual Lifecycle Stepper */}
      <div style={{ marginBottom: "24px" }}>
        <div className="fin-label" style={{ marginBottom: "8px" }}>
          Orchestration Pipeline Lifecycle
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            position: "relative",
            padding: "12px 6px",
            backgroundColor: "var(--bg-canvas)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {lifecycleSteps.map((step, idx) => (
            <div key={idx} className={`fin-stepper-node ${step.status}`}>
              <div className="fin-stepper-icon">{step.icon}</div>
              <span className="fin-stepper-label">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Core Properties Grid */}
      <div style={{ marginBottom: "24px" }}>
        <div className="fin-label" style={{ marginBottom: "8px" }}>
          Transaction Metadata
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "10px",
            fontSize: "12px",
          }}
        >
          <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <span style={{ color: "var(--text-tertiary)", display: "block", fontSize: "10.5px", marginBottom: "2px" }}>
              GATEWAY / PROVIDER
            </span>
            <span className="text-bold text-upper" style={{ color: "var(--text-primary)" }}>
              {payment.provider || "None"}
            </span>
          </div>

          <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <span style={{ color: "var(--text-tertiary)", display: "block", fontSize: "10.5px", marginBottom: "2px" }}>
              PROVIDER TRANSACTION ID
            </span>
            <span className="mono text-bold" style={{ fontSize: "11px" }}>
              {payment.provider_transaction_id || "N/A"}
            </span>
          </div>

          <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <span style={{ color: "var(--text-tertiary)", display: "block", fontSize: "10.5px", marginBottom: "2px" }}>
              CUSTOMER REFERENCE
            </span>
            <span className="mono" style={{ color: "var(--text-primary)" }}>
              {payment.customer_id || "cust_guest"}
            </span>
          </div>

          <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <span style={{ color: "var(--text-tertiary)", display: "block", fontSize: "10.5px", marginBottom: "2px" }}>
              IDEMPOTENCY KEY
            </span>
            <span className="mono" style={{ fontSize: "11px", color: "var(--text-primary)" }}>
              {payment.idempotency_key || "None (Direct request)"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Double-Entry Accounting Impact */}
      {filteredLedgerEntries.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div className="fin-label" style={{ marginBottom: "8px" }}>
            Double-Entry Ledger Impact (Mass Balanced)
          </div>
          <div className="fin-table-container">
            <table className="fin-table" style={{ fontSize: "12px" }}>
              <thead>
                <tr>
                  <th>Account ID</th>
                  <th>Entry</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedgerEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="mono" style={{ fontSize: "11px" }}>
                      {entry.account_id}
                    </td>
                    <td>
                      <span
                        className={`fin-badge ${
                          entry.entry_type === "DEBIT" ? "fin-badge-success" : "fin-badge-neutral"
                        }`}
                        style={{ padding: "1px 6px", fontSize: "10px" }}
                      >
                        {entry.entry_type}
                      </span>
                    </td>
                    <td className="mono text-bold">
                      {entry.entry_type === "DEBIT" ? "+" : "-"}${Number(entry.amount).toFixed(2)}
                    </td>
                    <td className="mono text-muted">
                      ${Number(entry.balance_after).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Raw Metadata & Payload Inspector */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span className="fin-label" style={{ margin: 0 }}>
            Raw Record Payload
          </span>
          <button
            onClick={() => copyToClipboard(JSON.stringify(payment, null, 2), "raw_payload")}
            className="fin-btn fin-btn-secondary fin-btn-sm"
          >
            {copiedKey === "raw_payload" ? <Check size={11} /> : <Copy size={11} />}
            <span>Copy JSON</span>
          </button>
        </div>
        <pre
          className="mono"
          style={{
            backgroundColor: "var(--bg-canvas)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "12px",
            fontSize: "11px",
            color: "var(--text-secondary)",
            overflowX: "auto",
            maxHeight: "180px",
          }}
        >
          {JSON.stringify(payment, null, 2)}
        </pre>
      </div>
    </Drawer>
  );
}
