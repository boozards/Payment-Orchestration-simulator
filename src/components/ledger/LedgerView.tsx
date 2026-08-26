"use client";

import React, { useState, useMemo } from "react";
import StatusBadge from "../shared/StatusBadge";
import { BookOpen, ShieldCheck, Search, CheckCircle2, ArrowRight } from "lucide-react";

interface LedgerViewProps {
  merchants: any[];
  ledgerEntries: any[];
}

export default function LedgerView({ merchants, ledgerEntries }: LedgerViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState("ALL");

  // Balance calculation by account
  const getAccountBalance = (accountId: string) => {
    const matching = ledgerEntries.filter((e) => e.account_id === accountId);
    return matching.length > 0 ? Number(matching[0].balance_after) : 0;
  };

  const platformFees = getAccountBalance("platform:fees");

  // Calculate Mass Conservation Invariant
  const { totalDebits, totalCredits, isBalanced } = useMemo(() => {
    let debits = 0;
    let credits = 0;

    for (const entry of ledgerEntries) {
      const cents = Math.round(Number(entry.amount || 0) * 100);
      if (entry.entry_type === "DEBIT") {
        debits += cents;
      } else {
        credits += cents;
      }
    }

    return {
      totalDebits: debits / 100,
      totalCredits: credits / 100,
      isBalanced: debits === credits,
    };
  }, [ledgerEntries]);

  // Filtered table rows
  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((e) => {
      const matchSearch =
        !searchTerm ||
        e.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.account_id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = entryTypeFilter === "ALL" || e.entry_type === entryTypeFilter;

      return matchSearch && matchType;
    });
  }, [ledgerEntries, searchTerm, entryTypeFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Double-Entry Accounting Ledger
        </h1>
        <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
          Immutable, mathematically verifiable financial journal. Every transaction produces balanced Debit and Credit entries.
        </p>
      </div>

      {/* 1. Mass Conservation Law Status Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 18px",
          background: isBalanced ? "var(--status-success-bg)" : "var(--status-error-bg)",
          border: `1px solid ${isBalanced ? "var(--status-success-border)" : "var(--status-error-border)"}`,
          borderRadius: "var(--radius-md)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <CheckCircle2
            size={18}
            color={isBalanced ? "var(--status-success-dot)" : "var(--status-error-dot)"}
          />
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: isBalanced ? "var(--status-success-text)" : "var(--status-error-text)",
              }}
            >
              {isBalanced
                ? "Double-Entry Mass Conservation: VERIFIED"
                : "Double-Entry Mass Imbalance Detected!"}
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "1px" }}>
              Total Debits (${totalDebits.toFixed(2)}) ≡ Total Credits (${totalCredits.toFixed(2)}) across {ledgerEntries.length} entries.
            </div>
          </div>
        </div>

        <div className="mono" style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
          Variance: $0.00
        </div>
      </div>

      {/* 2. Account Balances Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "14px",
        }}
      >
        {/* Merchant Balances */}
        <div className="fin-card" style={{ padding: "16px" }}>
          <div className="fin-label">Merchant Settlement Balances</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
            {merchants.map((m) => {
              const bal = getAccountBalance(`merchant:${m.id}`);
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12.5px",
                  }}
                >
                  <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{m.name}</span>
                  <span className="mono text-bold" style={{ color: "var(--status-success-text)" }}>
                    ${bal.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Provider Reserves */}
        <div className="fin-card" style={{ padding: "16px" }}>
          <div className="fin-label">Provider Settlement Liabilities</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
            {["stripe", "paypal", "razorpay"].map((p) => {
              const bal = getAccountBalance(`provider:${p}`);
              return (
                <div
                  key={p}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12.5px",
                  }}
                >
                  <span className="mono text-upper" style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                    {p}
                  </span>
                  <span className="mono text-bold" style={{ color: bal < 0 ? "var(--status-error-text)" : "var(--text-primary)" }}>
                    ${bal.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform Fee Pool */}
        <div className="fin-card" style={{ padding: "16px" }}>
          <div className="fin-label">Platform Fee Revenue Pool</div>
          <div style={{ marginTop: "10px" }}>
            <div className="mono" style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>
              ${platformFees.toFixed(2)}
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)", marginTop: "4px" }}>
              Account: <code className="mono">platform:fees</code>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Immutable Journal Entries Table */}
      <div className="fin-card">
        <div className="fin-card-header">
          <span className="fin-card-title">Immutable Journal Entries ({filteredEntries.length})</span>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ position: "relative", width: "220px" }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: "9px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-tertiary)",
                }}
              />
              <input
                type="text"
                placeholder="Search Account / Payment ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="fin-input"
                style={{ paddingLeft: "28px", height: "28px", fontSize: "11.5px" }}
              />
            </div>

            <select
              value={entryTypeFilter}
              onChange={(e) => setEntryTypeFilter(e.target.value)}
              className="fin-input"
              style={{ height: "28px", fontSize: "11.5px", width: "110px", padding: "2px 24px 2px 8px" }}
            >
              <option value="ALL">All Types</option>
              <option value="DEBIT">Debit (+)</option>
              <option value="CREDIT">Credit (-)</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="fin-table" style={{ fontSize: "12px" }}>
            <thead>
              <tr>
                <th>Entry ID</th>
                <th>Payment ID</th>
                <th>Account ID</th>
                <th>Entry Type</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className="mono" style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                      {e.id}
                    </span>
                  </td>
                  <td>
                    <span className="mono text-bold" style={{ fontSize: "11.5px", color: "var(--text-primary)" }}>
                      {e.payment_id}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ color: "var(--text-secondary)" }}>
                      {e.account_id}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`fin-badge ${
                        e.entry_type === "DEBIT" ? "fin-badge-success" : "fin-badge-neutral"
                      }`}
                      style={{ padding: "1px 6px", fontSize: "10px" }}
                    >
                      {e.entry_type}
                    </span>
                  </td>
                  <td className="mono text-bold">
                    {e.entry_type === "DEBIT" ? "+" : "-"}${Number(e.amount).toFixed(2)}
                  </td>
                  <td className="mono text-muted">
                    ${Number(e.balance_after).toFixed(2)}
                  </td>
                  <td className="mono text-muted" style={{ fontSize: "11px" }}>
                    {new Date(e.created_at || Date.now()).toLocaleTimeString()}
                  </td>
                </tr>
              ))}

              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--text-tertiary)" }}>
                    No ledger entries recorded.
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
