"use client";

import React from "react";
import Header from "./Header";
import Sidebar, { NavTab } from "./Sidebar";

interface AppShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  merchants: any[];
  selectedMerchant: string;
  onSelectMerchant: (id: string) => void;
  onOpenSimulator: () => void;
  onRefreshTelemetry: () => void;
  isRefreshing?: boolean;
  paymentsCount?: number;
  unresolvedDiscrepancies?: number;
  activeIdempotencyKeys?: number;
  children: React.ReactNode;
}

export default function AppShell({
  activeTab,
  onTabChange,
  merchants,
  selectedMerchant,
  onSelectMerchant,
  onOpenSimulator,
  onRefreshTelemetry,
  isRefreshing,
  paymentsCount,
  unresolvedDiscrepancies,
  activeIdempotencyKeys,
  children,
}: AppShellProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden", backgroundColor: "var(--bg-canvas)" }}>
      {/* Top App Bar */}
      <Header
        merchants={merchants}
        selectedMerchant={selectedMerchant}
        onSelectMerchant={onSelectMerchant}
        onOpenSimulator={onOpenSimulator}
        onRefreshTelemetry={onRefreshTelemetry}
        isRefreshing={isRefreshing}
      />

      {/* Main Workspace Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          paymentsCount={paymentsCount}
          unresolvedDiscrepancies={unresolvedDiscrepancies}
          activeIdempotencyKeys={activeIdempotencyKeys}
        />

        {/* Content View Container */}
        <main
          style={{
            flex: 1,
            height: "calc(100vh - var(--topbar-height))",
            overflowY: "auto",
            padding: "24px 32px",
          }}
        >
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
