"use client";

import React from "react";
import StatusBadge from "../shared/StatusBadge";
import { Webhook, ShieldCheck, ArrowUpRight } from "lucide-react";

interface WebhooksViewProps {
  webhookLogs: any[];
}

export default function WebhooksView({ webhookLogs }: WebhooksViewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Webhook Delivery Queue
        </h1>
        <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
          Monitor outbound event notifications, exponential backoff retries, and HMAC-SHA256 signature verification.
        </p>
      </div>

      {/* Webhooks Queue */}
      <div className="fin-card">
        <div className="fin-card-header">
          <span className="fin-card-title">Outbound Notification Logs ({webhookLogs.length})</span>
          <span className="fin-label" style={{ margin: 0 }}>HMAC-SHA256 Signed</span>
        </div>

        <div className="fin-card-body" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {webhookLogs.map((log) => (
            <div
              key={log.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1.8fr",
                gap: "16px",
                padding: "14px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-canvas)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {/* Left: Dispatch Metadata */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="mono" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {log.id}
                  </span>
                  <StatusBadge status={log.status} size="sm" />
                </div>

                <div>
                  <span style={{ color: "var(--text-tertiary)" }}>Payment ID: </span>
                  <span className="mono text-bold">{log.paymentId}</span>
                </div>

                <div>
                  <span style={{ color: "var(--text-tertiary)" }}>Target Endpoint: </span>
                  <span className="mono" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    {log.url}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "16px", marginTop: "2px" }}>
                  <div>
                    <span style={{ color: "var(--text-tertiary)" }}>Attempts: </span>
                    <span className="mono text-bold">{log.attempts} / {log.maxAttempts}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-tertiary)" }}>Last Status: </span>
                    <span className="mono text-bold" style={{ color: log.lastResponse?.includes("200") ? "var(--status-success-text)" : "var(--status-error-text)" }}>
                      {log.lastResponse || "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Connection & Retry Execution Trace */}
              <div
                style={{
                  backgroundColor: "#09090B",
                  color: "#E4E4E7",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  maxHeight: "120px",
                  overflowY: "auto",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ color: "#71717A", fontSize: "10px", marginBottom: "4px" }}>
                  // DISPATCH TRACE LOG
                </div>
                {(log.logs || []).map((line: string, idx: number) => (
                  <div key={idx} style={{ color: line.includes("200 OK") ? "#4ADE80" : line.includes("500") || line.includes("timeout") ? "#F87171" : "#D4D4D8" }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {webhookLogs.length === 0 && (
            <div style={{ textAlign: "center", padding: "36px", color: "var(--text-tertiary)" }}>
              No webhook dispatches queued yet. Settle a transaction in the simulator to fire outbound events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
