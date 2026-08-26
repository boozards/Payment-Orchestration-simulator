"use client";

import React, { useState } from "react";
import StatusBadge from "../shared/StatusBadge";
import { GitBranch, ArrowRight, ShieldCheck, DollarSign, Percent, Zap, Check } from "lucide-react";

export default function RoutingView() {
  const [testAmount, setTestAmount] = useState("100.00");
  const [testCurrency, setTestCurrency] = useState("USD");
  const [testStrategy, setTestStrategy] = useState<"LOWEST_COST" | "HIGHEST_SUCCESS">("HIGHEST_SUCCESS");

  const numAmount = parseFloat(testAmount) || 100;

  // Fee calculation formulas
  const calculateFee = (prov: string, amt: number, curr: string) => {
    switch (prov) {
      case "stripe":
        return amt * 0.029 + 0.30;
      case "paypal":
        return amt * 0.0349 + 0.49;
      case "razorpay":
        return curr === "INR" ? amt * 0.02 : amt * 0.03;
      default:
        return amt * 0.03;
    }
  };

  const routes = [
    {
      name: "stripe",
      currencies: ["USD", "EUR", "GBP", "CAD"],
      successRate: 98,
      fee: calculateFee("stripe", numAmount, testCurrency),
      supported: ["USD", "EUR", "GBP", "CAD"].includes(testCurrency),
    },
    {
      name: "paypal",
      currencies: ["USD", "EUR", "GBP", "AUD", "JPY"],
      successRate: 85,
      fee: calculateFee("paypal", numAmount, testCurrency),
      supported: ["USD", "EUR", "GBP", "AUD", "JPY"].includes(testCurrency),
    },
    {
      name: "razorpay",
      currencies: ["INR", "USD"],
      successRate: 92,
      fee: calculateFee("razorpay", numAmount, testCurrency),
      supported: ["INR", "USD"].includes(testCurrency),
    },
  ];

  const availableRoutes = routes.filter((r) => r.supported);
  const selectedRoute =
    testStrategy === "LOWEST_COST"
      ? [...availableRoutes].sort((a, b) => a.fee - b.fee)[0]
      : [...availableRoutes].sort((a, b) => b.successRate - a.successRate)[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Smart Routing Engine
        </h1>
        <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
          Dynamic multi-gateway routing rules with currency compatibility, interchange fee optimization, and automatic circuit failovers.
        </p>
      </div>

      {/* 1. Visual Routing Waterfall Diagram */}
      <div className="fin-card">
        <div className="fin-card-header">
          <span className="fin-card-title">Routing Decision Pipeline</span>
          <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)" }}>
            Evaluated per transaction in &lt; 2ms
          </div>
        </div>

        <div className="fin-card-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "8px",
              position: "relative",
            }}
          >
            {/* Step 1: Input */}
            <div style={{ padding: "12px", background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
              <span className="fin-label">Step 1: Input</span>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                Transaction Request
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Amount, Currency, Card Brand
              </div>
            </div>

            {/* Step 2: Currency Filter */}
            <div style={{ padding: "12px", background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
              <span className="fin-label">Step 2: Filter</span>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                Currency Support
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Match gateway supported matrix
              </div>
            </div>

            {/* Step 3: Circuit Guard */}
            <div style={{ padding: "12px", background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
              <span className="fin-label">Step 3: Health</span>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                Circuit Check
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Exclude OPEN/tripped gateways
              </div>
            </div>

            {/* Step 4: Strategy */}
            <div style={{ padding: "12px", background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
              <span className="fin-label">Step 4: Optimizer</span>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                Policy Evaluation
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Lowest Cost vs Highest SLA
              </div>
            </div>

            {/* Step 5: Selected Gateway */}
            <div style={{ padding: "12px", background: "var(--status-success-bg)", border: "1px solid var(--status-success-border)", borderRadius: "var(--radius-sm)" }}>
              <span className="fin-label" style={{ color: "var(--status-success-text)" }}>Step 5: Target</span>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--status-success-text)", textTransform: "uppercase" }}>
                {selectedRoute?.name || "STRIPE"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--status-success-text)", marginTop: "4px" }}>
                Selected Target Route
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Routing Decision Tester */}
      <div className="fin-card">
        <div className="fin-card-header">
          <span className="fin-card-title">Live Strategy Simulation</span>
          <span className="fin-label" style={{ margin: 0 }}>Interactive Optimizer</span>
        </div>

        <div className="fin-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label className="fin-label">Amount</label>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="fin-input mono"
                placeholder="100.00"
              />
            </div>

            <div>
              <label className="fin-label">Currency</label>
              <select
                value={testCurrency}
                onChange={(e) => setTestCurrency(e.target.value)}
                className="fin-input mono"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </div>

            <div>
              <label className="fin-label">Optimization Strategy</label>
              <div className="fin-tabs-bar" style={{ height: "34px" }}>
                <button
                  onClick={() => setTestStrategy("HIGHEST_SUCCESS")}
                  className={`fin-tab-btn ${testStrategy === "HIGHEST_SUCCESS" ? "active" : ""}`}
                  style={{ flex: 1 }}
                >
                  Highest Success SLA
                </button>
                <button
                  onClick={() => setTestStrategy("LOWEST_COST")}
                  className={`fin-tab-btn ${testStrategy === "LOWEST_COST" ? "active" : ""}`}
                  style={{ flex: 1 }}
                >
                  Lowest Interchange Fee
                </button>
              </div>
            </div>
          </div>

          {/* Decision Outcome Matrix */}
          <div className="fin-table-container">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Gateway</th>
                  <th>Currency Supported</th>
                  <th>Success SLA</th>
                  <th>Estimated Gateway Fee</th>
                  <th>Decision Outcome</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r) => {
                  const isSelected = selectedRoute?.name === r.name;

                  return (
                    <tr key={r.name} style={isSelected ? { backgroundColor: "var(--status-success-bg)" } : undefined}>
                      <td>
                        <span className="mono text-bold text-upper">{r.name}</span>
                      </td>
                      <td>
                        {r.supported ? (
                          <StatusBadge status="ACTIVE" size="sm" />
                        ) : (
                          <span className="text-muted" style={{ fontSize: "11.5px" }}>
                            Unsupported ({testCurrency})
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="mono">{r.successRate}%</span>
                      </td>
                      <td>
                        <span className="mono text-bold">
                          ${r.fee.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        {isSelected ? (
                          <span
                            className="fin-badge fin-badge-success"
                            style={{ fontWeight: 600 }}
                          >
                            <Check size={11} />
                            <span>Selected Target</span>
                          </span>
                        ) : (
                          <span className="text-muted" style={{ fontSize: "11.5px" }}>
                            {!r.supported ? "Currency Mismatch" : "Superseded by policy"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
