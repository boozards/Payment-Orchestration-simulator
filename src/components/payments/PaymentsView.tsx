"use client";

import React, { useState, useMemo } from "react";
import StatusBadge from "../shared/StatusBadge";
import { Search, Filter, ArrowUpDown, ChevronRight, PlayCircle, Download } from "lucide-react";

interface PaymentsViewProps {
  payments: any[];
  onSelectPayment: (payment: any) => void;
  onOpenSimulator: () => void;
}

export default function PaymentsView({
  payments,
  onSelectPayment,
  onOpenSimulator,
}: PaymentsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Search check
      const searchMatch =
        !searchTerm ||
        p.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customer_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.provider_transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.provider?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status check
      const statusMatch =
        statusFilter === "ALL" || (p.status || "").toUpperCase() === statusFilter;

      // Provider check
      const providerMatch =
        providerFilter === "ALL" || (p.provider || "").toLowerCase() === providerFilter.toLowerCase();

      return searchMatch && statusMatch && providerMatch;
    });
  }, [payments, searchTerm, statusFilter, providerFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header Title & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            Payments Explorer
          </h1>
          <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
            Inspect, filter, and audit real-time payment transactions across all integrated providers.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onOpenSimulator}
            className="fin-btn fin-btn-primary fin-btn-sm"
          >
            <PlayCircle size={13} />
            <span>Simulate Payment</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "10px 14px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: "200px" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
            }}
          />
          <input
            type="text"
            placeholder="Search by Payment ID, Customer, Tx Hash..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="fin-input"
            style={{ paddingLeft: "30px", height: "32px", fontSize: "12.5px" }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ width: "160px" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="fin-input"
            style={{ height: "32px", fontSize: "12px", padding: "4px 28px 4px 10px" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="SETTLED">Settled</option>
            <option value="CAPTURED">Captured</option>
            <option value="AUTHORIZED">Authorized</option>
            <option value="PENDING_INQUIRY">Pending Inquiry</option>
            <option value="PROCESSING">Processing</option>
            <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Provider Filter */}
        <div style={{ width: "140px" }}>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="fin-input"
            style={{ height: "32px", fontSize: "12px", padding: "4px 28px 4px 10px" }}
          >
            <option value="ALL">All Gateways</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
            <option value="razorpay">Razorpay</option>
          </select>
        </div>

        {/* Result Counter */}
        <div
          style={{
            fontSize: "11.5px",
            fontFamily: "var(--font-mono)",
            color: "var(--text-tertiary)",
            marginLeft: "auto",
          }}
        >
          {filteredPayments.length} of {payments.length} payments
        </div>
      </div>

      {/* Main High-Density Table */}
      <div className="fin-table-container">
        <table className="fin-table">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Gateway</th>
              <th>Status</th>
              <th>Created At</th>
              <th style={{ width: "36px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((p) => {
              const amount = Number(p.amount || 0);
              const refunded = Number(p.refunded_amount || 0);

              return (
                <tr
                  key={p.id}
                  className="clickable"
                  onClick={() => onSelectPayment(p)}
                >
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span className="mono" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {p.id}
                      </span>
                      {p.provider_transaction_id && (
                        <span className="mono text-muted" style={{ fontSize: "10.5px" }}>
                          {p.provider_transaction_id}
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <span className="mono" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {p.customer_id || "cust_guest"}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span className="mono" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        ${amount.toFixed(2)}{" "}
                        <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", fontWeight: 500 }}>
                          {p.currency}
                        </span>
                      </span>
                      {refunded > 0 && (
                        <span className="mono text-muted" style={{ fontSize: "10px", color: "var(--status-error-text)" }}>
                          Ref: -${refunded.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <span
                      className="mono text-upper"
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 6px",
                        background: "var(--bg-subtle)",
                        borderRadius: "4px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {p.provider || "N/A"}
                    </span>
                  </td>

                  <td>
                    <StatusBadge status={p.status} size="sm" />
                  </td>

                  <td>
                    <span className="mono text-muted" style={{ fontSize: "11px" }}>
                      {new Date(p.created_at || p.createdAt || Date.now()).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </td>

                  <td>
                    <ChevronRight size={14} color="var(--text-tertiary)" />
                  </td>
                </tr>
              );
            })}

            {filteredPayments.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ maxWidth: "340px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      <Filter size={16} />
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      No transactions match current filters
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                      Execute a transaction via the Developer Simulator to see real-time payment routing, multi-gateway failovers, and ledger settlement.
                    </p>
                    <button
                      onClick={onOpenSimulator}
                      className="fin-btn fin-btn-primary fin-btn-sm"
                      style={{ marginTop: "4px" }}
                    >
                      <PlayCircle size={13} />
                      <span>Run Simulation</span>
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
