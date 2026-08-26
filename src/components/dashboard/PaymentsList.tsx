"use client";

import React from "react";

interface PaymentsListProps {
  payments: any[];
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "SETTLED":
    case "CAPTURED":
      return "badge badge-success";
    case "FAILED":
      return "badge badge-failed";
    case "PENDING_INQUIRY":
    case "PROCESSING":
      return "badge badge-orange";
    case "PARTIALLY_REFUNDED":
    case "REFUNDED":
      return "badge badge-neutral";
    default:
      return "badge badge-warning";
  }
}

function formatAmount(amount: number): string {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function truncateId(id: string, maxLen = 22): string {
  return id.length > maxLen ? id.slice(0, maxLen) + "…" : id;
}

export default function PaymentsList({ payments }: PaymentsListProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Recent Payments</h3>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Gateway</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <span className="mono text-bold" title={payment.id}>
                    {truncateId(payment.id)}
                  </span>
                </td>
                <td>
                  <span className="text-bold">
                    {formatAmount(payment.amount)}
                  </span>
                  {payment.refunded_amount > 0 && (
                    <div className="text-muted" style={{ fontSize: "10px" }}>
                      Ref: ${Number(payment.refunded_amount).toFixed(2)}
                    </div>
                  )}
                </td>
                <td>{payment.currency}</td>
                <td>
                  <span className="text-upper" style={{ fontSize: "11px", fontWeight: 600 }}>
                    {payment.provider || payment.gateway || "N/A"}
                  </span>
                </td>
                <td>
                  <span className={getStatusBadgeClass(payment.status)}>
                    {payment.status}
                  </span>
                </td>
                <td className="mono text-muted" style={{ fontSize: "11px" }}>
                  {new Date(payment.created_at || payment.createdAt || payment.timestamp || Date.now()).toLocaleTimeString()}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted" style={{ textAlign: "center", padding: "24px" }}>
                  No payments yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
