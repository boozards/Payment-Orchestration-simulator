"use client";

import React from "react";

interface LedgerTableProps {
  entries: any[];
}

export default function LedgerTable({ entries }: LedgerTableProps) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Ledger Entries</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Entry ID</th>
              <th>Payment ID</th>
              <th>Type</th>
              <th>Account ID</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Balance After</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry: any) => (
              <tr key={entry.id}>
                <td className="mono">{entry.id}</td>
                <td className="mono">{entry.payment_id}</td>
                <td className={`text-bold ${entry.entry_type === "DEBIT" ? "text-green" : "text-red"}`}>
                  {entry.entry_type}
                </td>
                <td className="mono">{entry.account_id}</td>
                <td className="text-bold">
                  {entry.entry_type === "DEBIT" ? "+" : "-"}${entry.amount.toFixed(2)}
                </td>
                <td>{entry.currency}</td>
                <td className="mono">${entry.balance_after.toFixed(2)}</td>
                <td className="text-muted" style={{ fontSize: "11px" }}>
                  {new Date(entry.created_at).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
