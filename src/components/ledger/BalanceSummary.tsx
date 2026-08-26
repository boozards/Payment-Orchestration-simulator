"use client";

import React from "react";

interface BalanceSummaryProps {
  merchants: any[];
  ledgerEntries: any[];
}

export default function BalanceSummary({ merchants, ledgerEntries }: BalanceSummaryProps) {
  const getBalance = (accountId: string) => {
    const entry = ledgerEntries.find((e: any) => e.account_id === accountId);
    return entry ? entry.balance_after : 0;
  };

  const platformFees = getBalance("platform:fees");

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Account Balances</span>
      </div>
      <div className="card-body">
        <div className="grid-3">
          {/* Merchant Balances */}
          <div>
            <span className="input-label">Merchant Balances</span>
            {merchants.map((m: any) => {
              const bal = getBalance(`merchant:${m.id}`);
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "8px",
                    fontSize: "13px",
                  }}
                >
                  <span className="text-bold">{m.name}</span>
                  <span className="mono text-green text-bold">${bal.toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          {/* Provider Reserves */}
          <div>
            <span className="input-label">Provider Reserves</span>
            {["stripe", "paypal", "razorpay"].map((p) => {
              const bal = getBalance(`provider:${p}`);
              return (
                <div
                  key={p}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "8px",
                    fontSize: "13px",
                    textTransform: "uppercase",
                  }}
                >
                  <span className="text-bold">{p}</span>
                  <span className={`mono text-bold ${bal < 0 ? "text-red" : ""}`}>
                    ${bal.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Platform Fees */}
          <div>
            <span className="input-label">Platform Fee Collected</span>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "8px",
                fontSize: "20px",
                fontWeight: 800,
              }}
            >
              <span>TOTAL</span>
              <span className="mono text-orange">${platformFees.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
