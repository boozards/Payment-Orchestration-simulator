"use client";

import React from "react";
import {
  BarChart2,
  Layers,
  Sliders,
  GitBranch,
  BookOpen,
  CheckCircle2,
  Webhook,
  PlayCircle,
  Terminal,
  Cpu,
} from "lucide-react";

export type NavTab =
  | "overview"
  | "payments"
  | "providers"
  | "routing"
  | "ledger"
  | "reconciliation"
  | "webhooks"
  | "simulator"
  | "events"
  | "architecture";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  paymentsCount?: number;
  unresolvedDiscrepancies?: number;
  activeIdempotencyKeys?: number;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ size: number }>;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function Sidebar({
  activeTab,
  onTabChange,
  paymentsCount = 0,
  unresolvedDiscrepancies = 0,
  activeIdempotencyKeys = 0,
}: SidebarProps) {
  const sections: NavSection[] = [
    {
      title: "Core",
      items: [
        { id: "overview", label: "Overview", icon: BarChart2 },
        { id: "payments", label: "Payments Explorer", icon: Layers, badge: paymentsCount || undefined },
      ],
    },
    {
      title: "Infrastructure",
      items: [
        { id: "providers", label: "Gateways & Circuits", icon: Sliders },
        { id: "routing", label: "Smart Routing", icon: GitBranch },
        { id: "ledger", label: "Double-Entry Ledger", icon: BookOpen },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          id: "reconciliation",
          label: "Reconciliation",
          icon: CheckCircle2,
          badge: unresolvedDiscrepancies > 0 ? unresolvedDiscrepancies : undefined,
        },
        { id: "webhooks", label: "Webhooks Queue", icon: Webhook },
      ],
    },
    {
      title: "Developer",
      items: [
        { id: "simulator", label: "Simulator Studio", icon: PlayCircle },
        { id: "events", label: "Live Event Logs", icon: Terminal },
        { id: "architecture", label: "Engine Blueprint", icon: Cpu },
      ],
    },
  ];

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "calc(100vh - var(--topbar-height))",
        overflowY: "auto",
        padding: "16px 12px",
      }}
    >
      <nav style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
        {sections.map((section) => (
          <div key={section.title}>
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-muted)",
                padding: "0 10px 6px",
              }}
            >
              {section.title}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "7px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      backgroundColor: isActive ? "var(--bg-subtle)" : "transparent",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: isActive ? 600 : 500,
                      fontSize: "12.5px",
                      textAlign: "left",
                      width: "100%",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                      fontFamily: "var(--font-sans)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = "var(--bg-canvas)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <IconComponent size={15} />
                    <span style={{ flex: 1 }}>{item.label}</span>

                    {item.badge !== undefined && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-mono)",
                          padding: "1px 5px",
                          borderRadius: "9999px",
                          backgroundColor: isActive ? "#FFFFFF" : "var(--bg-subtle)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer System Telemetry */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "14px",
          marginTop: "14px",
          fontSize: "11px",
          fontFamily: "var(--font-mono)",
          color: "var(--text-tertiary)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>SQLITE WAL:</span>
          <span style={{ color: "var(--status-success-text)", fontWeight: 600 }}>SYNCED</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>IDEMPOTENCY:</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{activeIdempotencyKeys} KEYS</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>ISOLATION:</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>SERIALIZED</span>
        </div>
      </div>
    </aside>
  );
}
