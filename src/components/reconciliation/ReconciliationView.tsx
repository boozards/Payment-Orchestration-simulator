"use client";

import React from "react";
import StatusBadge from "../shared/StatusBadge";
import { CheckCircle2, AlertTriangle, RefreshCw, ArrowRight } from "lucide-react";

interface ReconciliationViewProps {
  reconProvider: string;
  setReconProvider: (v: string) => void;
  reconDate: string;
  setReconDate: (v: string) => void;
  reconProcessing: boolean;
  latestReconResult: any;
  onRunRecon: () => void;
  reconciliationReports: any[];
}

export default function ReconciliationView({
  reconProvider,
  setReconProvider,
  reconDate,
  setReconDate,
  reconProcessing,
  latestReconResult,
  onRunRecon,
  reconciliationReports,
}: ReconciliationViewProps) {
  const discrepancies = latestReconResult?.discrepancies || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Bank & Provider Settlement Reconciliation
        </h1>
        <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
          Audit internal double-entry ledger journals against external gateway settlement files to detect fee variances and missing transactions.
        </p>
      </div>

      {/* 1. Trigger Scan & Discrepancy Overview Split */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.9fr", gap: "16px" }}>
        {/* Trigger Panel */}
        <div className="fin-card">
          <div className="fin-card-header">
            <span className="fin-card-title">Run Reconciliation Scan</span>
          </div>

          <div className="fin-card-body">
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="fin-label">Settlement Provider</label>
                <select
                  value={reconProvider}
                  onChange={(e) => setReconProvider(e.target.value)}
                  className="fin-input mono"
                >
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                  <option value="razorpay">Razorpay</option>
                </select>
              </div>

              <div>
                <label className="fin-label">Settlement Batch Date</label>
                <input
                  type="date"
                  value={reconDate}
                  onChange={(e) => setReconDate(e.target.value)}
                  className="fin-input mono"
                />
              </div>

              <button
                onClick={onRunRecon}
                disabled={reconProcessing}
                className="fin-btn fin-btn-primary"
                style={{ width: "100%", marginTop: "4px" }}
              >
                <RefreshCw size={13} className={reconProcessing ? "animate-spin" : ""} />
                <span>{reconProcessing ? "Auditing Settlement File..." : "Execute Reconciliation"}</span>
              </button>

              {latestReconResult && (
                <div
                  style={{
                    paddingTop: "14px",
                    borderTop: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Audit Status:</span>
                    <StatusBadge status={latestReconResult.status} size="sm" />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-tertiary)" }}>Internal Ledger Sum:</span>
                    <span className="mono text-bold">${Number(latestReconResult.our_total || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-tertiary)" }}>Provider File Sum:</span>
                    <span className="mono text-bold">${Number(latestReconResult.provider_total || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-tertiary)" }}>Net Variance:</span>
                    <span className="mono text-bold" style={{ color: (latestReconResult.discrepancy || 0) > 0 ? "var(--status-error-text)" : "var(--status-success-text)" }}>
                      ${Number(latestReconResult.discrepancy || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detected Discrepancies Panel */}
        <div className="fin-card">
          <div className="fin-card-header">
            <span className="fin-card-title">
              Discrepancies Detected ({discrepancies.length})
            </span>
          </div>

          <div className="fin-card-body" style={{ padding: "14px", maxHeight: "300px", overflowY: "auto" }}>
            {discrepancies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "36px 12px", color: "var(--text-tertiary)" }}>
                <CheckCircle2 size={24} color="var(--status-success-dot)" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  No Discrepancies
                </div>
                <div style={{ fontSize: "12px", marginTop: "2px" }}>
                  Run a scan to verify internal ledger balances against provider settlements.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {discrepancies.map((d: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: "12px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-canvas)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color: "var(--status-error-text)",
                          background: "var(--status-error-bg)",
                          padding: "1px 6px",
                          borderRadius: "3px",
                        }}
                      >
                        {d.type}
                      </span>
                      <span className="mono" style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                        {d.payment_id || d.provider_transaction_id}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {d.description}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => alert(`Adjustment entry queued for ${d.type}. Ledger reversal will be posted.`)}
                        className="fin-btn fin-btn-secondary fin-btn-sm"
                      >
                        Post Adjustment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Historical Reconciliation Audit Reports */}
      <div className="fin-card">
        <div className="fin-card-header">
          <span className="fin-card-title">Historical Settlement Audit Reports</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="fin-table" style={{ fontSize: "12px" }}>
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Gateway</th>
                <th>Settlement Date</th>
                <th>Internal Sum</th>
                <th>Provider Sum</th>
                <th>Discrepancy</th>
                <th>Status</th>
                <th>Generated At</th>
              </tr>
            </thead>
            <tbody>
              {reconciliationReports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="mono" style={{ fontSize: "11px" }}>{r.id}</span>
                  </td>
                  <td>
                    <span className="mono text-bold text-upper">{r.provider}</span>
                  </td>
                  <td className="mono">{r.date}</td>
                  <td className="mono">${Number(r.our_total || 0).toFixed(2)}</td>
                  <td className="mono">${Number(r.provider_total || 0).toFixed(2)}</td>
                  <td>
                    <span
                      className="mono text-bold"
                      style={{ color: (r.discrepancy || 0) > 0 ? "var(--status-error-text)" : "var(--status-success-text)" }}
                    >
                      ${Number(r.discrepancy || 0).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="mono text-muted" style={{ fontSize: "11px" }}>
                    {new Date(r.generated_at || Date.now()).toLocaleTimeString()}
                  </td>
                </tr>
              ))}

              {reconciliationReports.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "28px", color: "var(--text-tertiary)" }}>
                    No reconciliation reports generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
