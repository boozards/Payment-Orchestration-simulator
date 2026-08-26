"use client";

import React from "react";

interface ProviderTableProps {
  providers: any[];
  circuitBreakers: Record<string, any>;
}

function getStatusBadge(state: string | undefined) {
  switch (state) {
    case "OPEN":
      return <span className="badge badge-failed">Tripped</span>;
    case "HALF_OPEN":
      return <span className="badge badge-warning">Recovering</span>;
    case "CLOSED":
    default:
      return <span className="badge badge-success">Healthy</span>;
  }
}

export default function ProviderTable({
  providers,
  circuitBreakers,
}: ProviderTableProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Provider Performance</h3>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Total Attempts</th>
            <th>Success Rate</th>
            <th>Avg Latency</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((provider) => {
            const rate =
              provider.totalAttempts > 0
                ? (provider.successCount / provider.totalAttempts) * 100
                : 0;
            const rateColor =
              rate >= 90 ? "var(--green-text)" : "var(--orange)";
            const rateGradient = `linear-gradient(90deg, ${
              rate >= 90 ? "var(--green-bg)" : "var(--orange-subtle)"
            } ${rate}%, transparent ${rate}%)`;
            const cb = circuitBreakers[provider.name];
            const cbState = cb?.state;

            return (
              <tr key={provider.name}>
                <td>
                  <span className="text-bold text-upper">
                    {provider.name}
                  </span>
                </td>
                <td>{provider.totalAttempts}</td>
                <td>
                  <div
                    style={{
                      background: rateGradient,
                      borderRadius: "var(--radius-sm)",
                      padding: "4px 8px",
                      display: "inline-block",
                      color: rateColor,
                      fontWeight: 700,
                    }}
                  >
                    {rate.toFixed(1)}%
                  </div>
                </td>
                <td>
                  <span className="mono">{provider.avgLatency ?? 0}ms</span>
                </td>
                <td>{getStatusBadge(cbState)}</td>
              </tr>
            );
          })}
          {providers.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted" style={{ textAlign: "center" }}>
                No provider data yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
