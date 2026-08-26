"use client";

import React from "react";
import { Play, RefreshCw } from "lucide-react";

interface CheckoutFormProps {
  merchants: any[];
  selectedMerchant: string;
  setSelectedMerchant: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  idempotencyKey: string;
  setIdempotencyKey: (v: string) => void;
  generateIdempotencyKey: () => void;
  cardNumber: string;
  setCardNumber: (v: string) => void;
  cardExpiry: string;
  setCardExpiry: (v: string) => void;
  cardCvv: string;
  setCardCvv: (v: string) => void;
  cardHolder: string;
  setCardHolder: (v: string) => void;
  customerEmail: string;
  setCustomerEmail: (v: string) => void;
  customerIpCountry: string;
  setCustomerIpCountry: (v: string) => void;
  cardCountry: string;
  setCardCountry: (v: string) => void;
  routingStrategy: string;
  setRoutingStrategy: (v: any) => void;
  manualProvider: string;
  setManualProvider: (v: string) => void;
  capturePayment: boolean;
  setCapturePayment: (v: boolean) => void;
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  setCardScenario: (type: "success" | "decline" | "timeout" | "auth3ds") => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "INR", "AUD", "JPY"];
const GATEWAYS = ["stripe", "paypal", "razorpay"];

export default function CheckoutForm({
  merchants,
  selectedMerchant,
  setSelectedMerchant,
  amount,
  setAmount,
  currency,
  setCurrency,
  idempotencyKey,
  setIdempotencyKey,
  generateIdempotencyKey,
  cardNumber,
  setCardNumber,
  cardExpiry,
  setCardExpiry,
  cardCvv,
  setCardCvv,
  cardHolder,
  setCardHolder,
  customerEmail,
  setCustomerEmail,
  customerIpCountry,
  setCustomerIpCountry,
  cardCountry,
  setCardCountry,
  routingStrategy,
  setRoutingStrategy,
  manualProvider,
  setManualProvider,
  capturePayment,
  setCapturePayment,
  isProcessing,
  onSubmit,
  setCardScenario,
}: CheckoutFormProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Transaction Details</h3>
      </div>
      <div className="card-body">
        <form onSubmit={onSubmit}>
          {/* Merchant */}
          <div className="mb-16">
            <label className="input-label">Merchant</label>
            <select
              className="input-field"
              value={selectedMerchant}
              onChange={(e) => setSelectedMerchant(e.target.value)}
            >
              {merchants.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount + Currency */}
          <div className="grid-2 mb-16">
            <div>
              <label className="input-label">Amount</label>
              <input
                type="number"
                className="input-field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="input-label">Currency</label>
              <select
                className="input-field"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Idempotency Key */}
          <div className="mb-16">
            <label className="input-label">Idempotency Key</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                className="input-field mono"
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                placeholder="idem_..."
              />
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={generateIdempotencyKey}
              >
                Generate
              </button>
            </div>
          </div>

          {/* Card Section */}
          <div className="mb-16">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <label className="input-label" style={{ margin: 0 }}>
                PCI Tokenization Vault
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className="scenario-btn success"
                  onClick={() => setCardScenario("success")}
                >
                  Success
                </button>
                <button
                  type="button"
                  className="scenario-btn decline"
                  onClick={() => setCardScenario("decline")}
                >
                  Decline
                </button>
                <button
                  type="button"
                  className="scenario-btn timeout"
                  onClick={() => setCardScenario("timeout")}
                >
                  Timeout
                </button>
                <button
                  type="button"
                  className="scenario-btn auth3ds"
                  onClick={() => setCardScenario("auth3ds")}
                >
                  3DS Auth
                </button>
              </div>
            </div>
            <div className="grid-2 mb-16">
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="input-label">Card Number</label>
                <input
                  type="text"
                  className="input-field mono"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                />
              </div>
              <div>
                <label className="input-label">Expiry</label>
                <input
                  type="text"
                  className="input-field"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="input-label">CVV</label>
                <input
                  type="text"
                  className="input-field"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>
            <div>
              <label className="input-label">Card Holder</label>
              <input
                type="text"
                className="input-field"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="John Doe"
              />
            </div>
          </div>

          {/* Routing Strategy */}
          <div className="mb-16">
            <label className="input-label">Routing Strategy</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="routingStrategy"
                  value="HIGHEST_SUCCESS"
                  checked={routingStrategy === "HIGHEST_SUCCESS"}
                  onChange={(e) => setRoutingStrategy(e.target.value)}
                />
                Success Optimized
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="routingStrategy"
                  value="LOWEST_COST"
                  checked={routingStrategy === "LOWEST_COST"}
                  onChange={(e) => setRoutingStrategy(e.target.value)}
                />
                Cost Optimized
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="routingStrategy"
                  value="MANUAL"
                  checked={routingStrategy === "MANUAL"}
                  onChange={(e) => setRoutingStrategy(e.target.value)}
                />
                Manual Selection
              </label>
            </div>
            {routingStrategy === "MANUAL" && (
              <div className="mt-12">
                <label className="input-label">Gateway</label>
                <select
                  className="input-field"
                  value={manualProvider}
                  onChange={(e) => setManualProvider(e.target.value)}
                >
                  {GATEWAYS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Customer Location */}
          <div className="grid-3 mb-16">
            <div>
              <label className="input-label">Email</label>
              <input
                type="email"
                className="input-field"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="input-label">IP Country</label>
              <input
                type="text"
                className="input-field"
                value={customerIpCountry}
                onChange={(e) => setCustomerIpCountry(e.target.value)}
                placeholder="US"
                maxLength={2}
              />
            </div>
            <div>
              <label className="input-label">Card Country</label>
              <input
                type="text"
                className="input-field"
                value={cardCountry}
                onChange={(e) => setCardCountry(e.target.value)}
                placeholder="US"
                maxLength={2}
              />
            </div>
          </div>

          {/* Auto-Capture */}
          <div className="mb-20">
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={capturePayment}
                onChange={(e) => setCapturePayment(e.target.checked)}
              />
              Auto-capture payment
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary"
            disabled={isProcessing}
            style={{ width: "100%" }}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Play size={16} />
                Process Payment
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
