"use client";

import React from "react";
import { Zap, Search, ShieldCheck, ChevronDown, RefreshCw } from "lucide-react";

interface HeaderProps {
  merchants: any[];
  selectedMerchant: string;
  onSelectMerchant: (id: string) => void;
  onOpenSimulator: () => void;
  onRefreshTelemetry: () => void;
  isRefreshing?: boolean;
}

export default function Header({
  merchants,
  selectedMerchant,
  onSelectMerchant,
  onOpenSimulator,
  onRefreshTelemetry,
  isRefreshing = false,
}: HeaderProps) {
  const currentMerchant = merchants.find((m) => m.id === selectedMerchant) || merchants[0];

  return (
    <header
      style={{
        height: "var(--topbar-height)",
        backgroundColor: "var(--bg-topbar)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* Left: Brand Identity & Environment Status */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              backgroundColor: "#09090B",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
            }}
          >
            <Zap size={14} fill="#FFFFFF" />
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: "14px",
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
            }}
          >
            ORCHESTRA
          </span>
          <span
            style={{
              fontSize: "10.5px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)",
              padding: "1px 5px",
              background: "var(--bg-subtle)",
              borderRadius: "4px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            v2.4
          </span>
        </div>

        <div style={{ width: "1px", height: "18px", backgroundColor: "var(--border-subtle)" }} />

        {/* Environment Status Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--status-success-text)",
            background: "var(--status-success-bg)",
            padding: "2px 8px",
            borderRadius: "9999px",
            border: "1px solid var(--status-success-border)",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "var(--status-success-dot)",
            }}
          />
          <span>Engine Online</span>
        </div>
      </div>

      {/* Center: Quick Search Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "var(--bg-canvas)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: "5px 12px",
          width: "320px",
          color: "var(--text-tertiary)",
          fontSize: "12px",
          cursor: "pointer",
        }}
        onClick={onOpenSimulator}
      >
        <Search size={14} />
        <span style={{ flex: 1 }}>Search payments, IDs, events...</span>
        <kbd
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            padding: "1px 4px",
            borderRadius: "3px",
            color: "var(--text-secondary)",
          }}
        >
          ⌘K
        </kbd>
      </div>

      {/* Right: Merchant Profile Switcher & Simulator Action */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Merchant Dropdown */}
        <div style={{ position: "relative" }}>
          <select
            value={selectedMerchant}
            onChange={(e) => onSelectMerchant(e.target.value)}
            className="fin-input"
            style={{
              height: "32px",
              fontSize: "12px",
              fontWeight: 500,
              padding: "4px 28px 4px 10px",
              minWidth: "170px",
            }}
          >
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.default_currency})
              </option>
            ))}
          </select>
        </div>

        {/* Sync Refresh Button */}
        <button
          onClick={onRefreshTelemetry}
          className="fin-btn-icon"
          title="Refresh live telemetry"
          style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
        </button>

        {/* Simulator Button */}
        <button
          onClick={onOpenSimulator}
          className="fin-btn fin-btn-primary fin-btn-sm"
          style={{ height: "32px" }}
        >
          <Zap size={13} />
          <span>Simulate Payment</span>
        </button>
      </div>
    </header>
  );
}
