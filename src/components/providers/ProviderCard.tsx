"use client";

import React from "react";
import { Zap } from "lucide-react";

interface ProviderCardProps {
  provider: string;
  state: {
    state: string;
    failures: number;
    customSuccessRate: number;
    customLatency: number;
    cooldownEnd?: number;
  };
  onForceCircuitState: (provider: string, state: "CLOSED" | "OPEN") => void;
  onUpdateSimSettings: (provider: string, successRate: number, latency: number) => void;
}

export default function ProviderCard({
  provider,
  state,
  onForceCircuitState,
  onUpdateSimSettings,
}: ProviderCardProps) {
  const circuitState = state.state;
  const ringClass = circuitState === "CLOSED" ? "closed" : circuitState === "OPEN" ? "open" : "half-open";
  const iconColor = circuitState === "CLOSED" ? "var(--green)" : circuitState === "OPEN" ? "var(--red)" : "var(--amber)";
  const cooldownSecs = circuitState === "OPEN" && state.cooldownEnd
    ? Math.max(0, Math.ceil((state.cooldownEnd - Date.now()) / 1000))
    : 0;

  return (
    <div className="provider-card">
      {/* Left: Identity + Circuit Visual */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <h3 className="provider-name">{provider}</h3>
          <span className={`badge ${circuitState === "CLOSED" ? "badge-success" : circuitState === "OPEN" ? "badge-failed" : "badge-warning"}`}>
            {circuitState}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
          <div className={`circuit-ring ${ringClass}`}>
            <Zap size={22} color={iconColor} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "var(--text-secondary)" }}>
            <div>
              Consecutive Failures:{" "}
              <strong style={{ color: state.failures > 0 ? "var(--orange)" : "var(--text-primary)" }}>
                {state.failures}/3
              </strong>
            </div>
            <div>
              Cooldown:{" "}
              <strong>{circuitState === "OPEN" ? `${cooldownSecs}s remaining` : "None"}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => onForceCircuitState(provider, "CLOSED")}
          >
            Reset Circuit
          </button>
          <button
            type="button"
            className="btn-danger btn-sm"
            onClick={() => onForceCircuitState(provider, "OPEN")}
          >
            Force Trip
          </button>
        </div>
      </div>

      {/* Right: Simulation Config */}
      <div className="provider-config">
        <span className="input-label" style={{ marginBottom: "16px" }}>
          Simulated Gateway Configuration
        </span>

        <div style={{ marginTop: "16px" }}>
          <div className="slider-row">
            <span>Success Rate</span>
            <strong>{state.customSuccessRate}%</strong>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={state.customSuccessRate}
            onChange={(e) => onUpdateSimSettings(provider, Number(e.target.value), state.customLatency)}
          />
        </div>

        <div style={{ marginTop: "20px" }}>
          <div className="slider-row">
            <span>Latency</span>
            <strong>{state.customLatency}ms</strong>
          </div>
          <input
            type="range"
            min="50"
            max="2000"
            step="50"
            value={state.customLatency}
            onChange={(e) => onUpdateSimSettings(provider, state.customSuccessRate, Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
