"use client";

import React from "react";
import StatusBadge from "../shared/StatusBadge";
import { Sliders, RotateCcw, AlertTriangle, ShieldCheck, Activity, Zap } from "lucide-react";

interface ProvidersViewProps {
  circuitBreakers: Record<string, any>;
  onForceCircuitState: (provider: string, state: "CLOSED" | "OPEN") => void;
  onUpdateSimSettings: (provider: string, successRate: number, latency: number) => void;
}

export default function ProvidersView({
  circuitBreakers,
  onForceCircuitState,
  onUpdateSimSettings,
}: ProvidersViewProps) {
  const providers = ["stripe", "paypal", "razorpay"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Gateways & Circuit Breakers
        </h1>
        <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
          Monitor live failure counters, cooldown intervals, and inject simulated network latencies per payment provider.
        </p>
      </div>

      {/* Provider Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {providers.map((prov) => {
          const state = circuitBreakers[prov] || {
            state: "CLOSED",
            failures: 0,
            customSuccessRate: 95,
            customLatency: 150,
          };

          const isClosed = state.state === "CLOSED";
          const isOpen = state.state === "OPEN";
          const isHalfOpen = state.state === "HALF_OPEN";

          const cooldownRemaining =
            isOpen && state.cooldownEnd
              ? Math.max(0, Math.ceil((state.cooldownEnd - Date.now()) / 1000))
              : 0;

          return (
            <div key={prov} className="fin-card">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.8fr",
                  gap: "24px",
                  padding: "20px",
                }}
              >
                {/* Left: Circuit Breaker State Machine Visualizer */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)" }}>
                        {prov}
                      </h3>
                      <StatusBadge status={state.state} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                      {/* State Visualizer Circle */}
                      <div
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "50%",
                          border: `3px solid ${
                            isClosed
                              ? "var(--status-success-dot)"
                              : isOpen
                              ? "var(--status-error-dot)"
                              : "var(--status-warning-dot)"
                          }`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isClosed
                            ? "var(--status-success-bg)"
                            : isOpen
                            ? "var(--status-error-bg)"
                            : "var(--status-warning-bg)",
                          flexShrink: 0,
                        }}
                      >
                        <Zap
                          size={20}
                          color={
                            isClosed
                              ? "var(--status-success-text)"
                              : isOpen
                              ? "var(--status-error-text)"
                              : "var(--status-warning-text)"
                          }
                        />
                      </div>

                      <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div>
                          Consecutive Failures:{" "}
                          <strong className="mono" style={{ color: state.failures > 0 ? "var(--status-error-text)" : "var(--text-primary)" }}>
                            {state.failures} / 3
                          </strong>
                        </div>
                        <div>
                          Cooldown Timer:{" "}
                          <strong className="mono" style={{ color: "var(--text-secondary)" }}>
                            {isOpen ? `${cooldownRemaining}s remaining` : "Inactive"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Manual Circuit Override Controls */}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => onForceCircuitState(prov, "CLOSED")}
                      className="fin-btn fin-btn-secondary fin-btn-sm"
                    >
                      <RotateCcw size={12} />
                      <span>Reset Circuit (Heal)</span>
                    </button>
                    <button
                      onClick={() => onForceCircuitState(prov, "OPEN")}
                      className="fin-btn fin-btn-danger fin-btn-sm"
                    >
                      <AlertTriangle size={12} />
                      <span>Force Trip (Open)</span>
                    </button>
                  </div>
                </div>

                {/* Right: Simulation Sliders */}
                <div
                  style={{
                    backgroundColor: "var(--bg-canvas)",
                    padding: "16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: "16px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-tertiary)", letterSpacing: "0.05em" }}>
                    Gateway Network Telemetry Emulation
                  </div>

                  {/* Success Rate Slider */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Success Rate</span>
                      <span className="mono text-bold">{state.customSuccessRate ?? 95}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={state.customSuccessRate ?? 95}
                      onChange={(e) => onUpdateSimSettings(prov, Number(e.target.value), state.customLatency ?? 150)}
                      style={{ width: "100%", accentColor: "#09090B" }}
                    />
                  </div>

                  {/* Latency Slider */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Simulated Roundtrip Latency</span>
                      <span className="mono text-bold">{state.customLatency ?? 150}ms</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="2500"
                      step="50"
                      value={state.customLatency ?? 150}
                      onChange={(e) => onUpdateSimSettings(prov, state.customSuccessRate ?? 95, Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#09090B" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
