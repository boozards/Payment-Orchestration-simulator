"use client";

import React, { useState } from "react";
import StatusBadge from "../shared/StatusBadge";
import {
  TrendingUp,
  Activity,
  Clock,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ChevronRight,
  PlayCircle,
} from "lucide-react";

interface OverviewViewProps {
  analytics: any;
  providerComparison: any[];
  circuitBreakers: Record<string, any>;
  recentPayments: any[];
  eventStream: any[];
  onSelectPayment: (payment: any) => void;
  onOpenSimulator: () => void;
  onNavigateTab: (tab: any) => void;
}

type ChartMetric = "volume" | "success_rate" | "latency" | "transactions";

export default function OverviewView({
  analytics,
  providerComparison,
  circuitBreakers,
  recentPayments,
  eventStream,
  onSelectPayment,
  onOpenSimulator,
  onNavigateTab,
}: OverviewViewProps) {
  const [activeMetric, setActiveMetric] = useState<ChartMetric>("volume");

  const totalVolume = Number(analytics?.settled_volume || 0);
  const successRate = Number(analytics?.success_rate || 100);
  const totalCount = Number(analytics?.total_payments || 0);
  const refundedVolume = Number(analytics?.refunded_volume || 0);

  const healthyProvidersCount = Object.values(circuitBreakers).filter(
    (cb: any) => cb?.state === "CLOSED"
  ).length;
  const totalProvidersCount = Object.keys(circuitBreakers).length || 3;

  // Mock synthetic hourly chart data based on live metrics
  const chartPoints = [
    { label: "10:00", volume: totalVolume * 0.08, rate: 99.2, latency: 140, count: 12 },
    { label: "11:00", volume: totalVolume * 0.14, rate: 98.6, latency: 155, count: 19 },
    { label: "12:00", volume: totalVolume * 0.22, rate: 97.4, latency: 180, count: 31 },
    { label: "13:00", volume: totalVolume * 0.18, rate: 99.1, latency: 145, count: 24 },
    { label: "14:00", volume: totalVolume * 0.26, rate: 98.9, latency: 160, count: 38 },
    { label: "15:00", volume: totalVolume * 0.12, rate: successRate, latency: 152, count: totalCount || 15 },
  ];

  // SVG Chart Dimensions
  const svgWidth = 640;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 24;

  const getMetricValue = (pt: any) => {
    switch (activeMetric) {
      case "volume": return pt.volume;
      case "success_rate": return pt.rate;
      case "latency": return pt.latency;
      case "transactions": return pt.count;
    }
  };

  const values = chartPoints.map(getMetricValue);
  const minVal = Math.min(...values) * 0.9;
  const maxVal = Math.max(...values) * 1.1 || 100;

  const pointsString = chartPoints
    .map((pt, idx) => {
      const x = paddingX + (idx / (chartPoints.length - 1)) * (svgWidth - paddingX * 2);
      const val = getMetricValue(pt);
      const y = svgHeight - paddingY - ((val - minVal) / (maxVal - minVal || 1)) * (svgHeight - paddingY * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Page Title & Subtitle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            Orchestration Overview
          </h1>
          <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
            Real-time multi-gateway throughput, circuit health, and transaction lifecycle metrics.
          </p>
        </div>

        <button onClick={onOpenSimulator} className="fin-btn fin-btn-primary fin-btn-sm">
          <PlayCircle size={13} />
          <span>Simulate Payment</span>
        </button>
      </div>

      {/* 1. Top-Level High-Density Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
        }}
      >
        {/* Metric 1: Total Volume */}
        <div className="fin-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="fin-label" style={{ margin: 0 }}>Processed Volume</span>
            <span style={{ fontSize: "11px", color: "var(--status-success-text)", fontWeight: 600 }}>+12.4%</span>
          </div>
          <div className="mono" style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", marginTop: "6px" }}>
            ${totalVolume.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)", marginTop: "4px" }}>
            Refunded: <span className="mono">${refundedVolume.toFixed(2)}</span>
          </div>
        </div>

        {/* Metric 2: Success Rate */}
        <div className="fin-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="fin-label" style={{ margin: 0 }}>Success SLA Rate</span>
            <span style={{ fontSize: "11px", color: successRate >= 95 ? "var(--status-success-text)" : "var(--status-warning-text)", fontWeight: 600 }}>
              {successRate >= 95 ? "OPTIMAL" : "DEGRADED"}
            </span>
          </div>
          <div className="mono" style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", marginTop: "6px" }}>
            {successRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)", marginTop: "4px" }}>
            Total Attempts: <span className="mono">{totalCount}</span>
          </div>
        </div>

        {/* Metric 3: Median Latency */}
        <div className="fin-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="fin-label" style={{ margin: 0 }}>Median Latency</span>
            <Clock size={14} color="var(--text-tertiary)" />
          </div>
          <div className="mono" style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", marginTop: "6px" }}>
            164ms
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)", marginTop: "4px" }}>
            p99 Gateway Timeout SLA: <span className="mono">3000ms</span>
          </div>
        </div>

        {/* Metric 4: Gateway Uptime */}
        <div className="fin-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="fin-label" style={{ margin: 0 }}>Gateway Circuits</span>
            <StatusBadge status="ACTIVE" size="sm" />
          </div>
          <div className="mono" style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", marginTop: "6px" }}>
            {healthyProvidersCount} / {totalProvidersCount}
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)", marginTop: "4px" }}>
            Smart Failover: <strong style={{ color: "var(--text-primary)" }}>ENABLED</strong>
          </div>
        </div>
      </div>

      {/* 2. Main Interactive Visualization Chart */}
      <div className="fin-card">
        <div className="fin-card-header">
          <div>
            <span className="fin-card-title">Throughput & Performance Telemetry</span>
            <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)" }}>
              Real-time transaction rate curves aggregated across active provider routes
            </div>
          </div>

          {/* Segmented Switcher */}
          <div className="fin-tabs-bar">
            <button
              onClick={() => setActiveMetric("volume")}
              className={`fin-tab-btn ${activeMetric === "volume" ? "active" : ""}`}
            >
              Volume ($)
            </button>
            <button
              onClick={() => setActiveMetric("success_rate")}
              className={`fin-tab-btn ${activeMetric === "success_rate" ? "active" : ""}`}
            >
              Success Rate (%)
            </button>
            <button
              onClick={() => setActiveMetric("latency")}
              className={`fin-tab-btn ${activeMetric === "latency" ? "active" : ""}`}
            >
              Latency (ms)
            </button>
            <button
              onClick={() => setActiveMetric("transactions")}
              className={`fin-tab-btn ${activeMetric === "transactions" ? "active" : ""}`}
            >
              Transactions
            </button>
          </div>
        </div>

        <div className="fin-card-body" style={{ padding: "14px 20px" }}>
          <div style={{ width: "100%", height: "160px" }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
              {/* Subtle Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <line x1={paddingX} y1={svgHeight / 2} x2={svgWidth - paddingX} y2={svgHeight / 2} stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="var(--border-subtle)" />

              {/* Trend Polyline */}
              <polyline
                fill="none"
                stroke="#09090B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsString}
              />

              {/* Data Points */}
              {chartPoints.map((pt, idx) => {
                const x = paddingX + (idx / (chartPoints.length - 1)) * (svgWidth - paddingX * 2);
                const val = getMetricValue(pt);
                const y = svgHeight - paddingY - ((val - minVal) / (maxVal - minVal || 1)) * (svgHeight - paddingY * 2);

                return (
                  <g key={idx}>
                    <circle cx={x} cy={y} r="3.5" fill="#FFFFFF" stroke="#09090B" strokeWidth="2" />
                    <text
                      x={x}
                      y={svgHeight - 4}
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fill="var(--text-tertiary)"
                      textAnchor="middle"
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Split Grid: Provider Health Matrix + Recent Transactions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Left: Gateways Health Matrix */}
        <div className="fin-card">
          <div className="fin-card-header">
            <span className="fin-card-title">Provider Performance Matrix</span>
            <button
              onClick={() => onNavigateTab("providers")}
              className="fin-btn fin-btn-secondary fin-btn-sm"
            >
              <span>Manage Circuits</span>
              <ChevronRight size={12} />
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="fin-table" style={{ fontSize: "12px" }}>
              <thead>
                <tr>
                  <th>Gateway</th>
                  <th>Success SLA</th>
                  <th>Avg Latency</th>
                  <th>Circuit State</th>
                </tr>
              </thead>
              <tbody>
                {["stripe", "paypal", "razorpay"].map((prov) => {
                  const cb = circuitBreakers[prov] || { state: "CLOSED", failures: 0 };
                  const successRate = cb.customSuccessRate ?? 95;
                  const latency = cb.customLatency ?? 180;

                  return (
                    <tr key={prov}>
                      <td>
                        <span className="mono text-bold text-upper" style={{ fontSize: "12px" }}>
                          {prov}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div
                            style={{
                              width: "48px",
                              height: "4px",
                              backgroundColor: "var(--bg-muted)",
                              borderRadius: "2px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${successRate}%`,
                                height: "100%",
                                backgroundColor: successRate >= 90 ? "var(--status-success-dot)" : "var(--status-error-dot)",
                              }}
                            />
                          </div>
                          <span className="mono">{successRate}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="mono text-muted">{latency}ms</span>
                      </td>
                      <td>
                        <StatusBadge status={cb.state} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Transactions Pulse */}
        <div className="fin-card">
          <div className="fin-card-header">
            <span className="fin-card-title">Recent Activity Feed</span>
            <button
              onClick={() => onNavigateTab("payments")}
              className="fin-btn fin-btn-secondary fin-btn-sm"
            >
              <span>View All</span>
              <ChevronRight size={12} />
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="fin-table" style={{ fontSize: "12px" }}>
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Amount</th>
                  <th>Gateway</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.slice(0, 5).map((p) => (
                  <tr
                    key={p.id}
                    className="clickable"
                    onClick={() => onSelectPayment(p)}
                  >
                    <td>
                      <span className="mono text-bold" style={{ fontSize: "11.5px" }}>
                        {p.id}
                      </span>
                    </td>
                    <td>
                      <span className="mono text-bold">
                        ${Number(p.amount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className="mono text-upper" style={{ fontSize: "10.5px" }}>
                        {p.provider || "N/A"}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                  </tr>
                ))}

                {recentPayments.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "28px", color: "var(--text-tertiary)" }}>
                      No recent transactions recorded. Run a simulation to populate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
