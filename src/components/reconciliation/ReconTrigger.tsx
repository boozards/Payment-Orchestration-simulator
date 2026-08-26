"use client";

import { RefreshCw } from "lucide-react";

interface ReconTriggerProps {
  reconProvider: string;
  setReconProvider: (v: string) => void;
  reconDate: string;
  setReconDate: (v: string) => void;
  reconProcessing: boolean;
  latestReconResult: any;
  onRunRecon: () => void;
  reconciliationReports: any[];
}

export default function ReconTrigger({
  reconProvider,
  setReconProvider,
  reconDate,
  setReconDate,
  reconProcessing,
  latestReconResult,
  onRunRecon,
  reconciliationReports,
}: ReconTriggerProps) {
  const discrepancies: any[] = latestReconResult?.discrepancies ?? [];

  return (
    <>
      {/* Top two cards side by side */}
      <div className="grid-split mb-20">
        {/* Card 1 – Trigger Panel */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Trigger Reconciliation Scan</span>
          </div>
          <div className="card-body">
            <label className="input-label">Provider</label>
            <select
              className="input-field mb-16"
              value={reconProvider}
              onChange={(e) => setReconProvider(e.target.value)}
            >
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="razorpay">Razorpay</option>
            </select>

            <label className="input-label">Settlement Date</label>
            <input
              type="date"
              className="input-field mb-16"
              value={reconDate}
              onChange={(e) => setReconDate(e.target.value)}
            />

            <button
              className="btn-primary"
              onClick={onRunRecon}
              disabled={reconProcessing}
            >
              {reconProcessing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Run Reconciliation
                </>
              )}
            </button>

            {latestReconResult && (
              <div
                className="mt-16"
                style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16 }}
              >
                <div className="mb-16">
                  <span
                    className={`badge ${
                      latestReconResult.status === "MATCHED"
                        ? "badge-success"
                        : "badge-failed"
                    }`}
                  >
                    {latestReconResult.status?.replace("_", " ")}
                  </span>
                </div>

                <div className="mono" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div>
                    <span className="text-muted">Internal Total: </span>
                    <span className="text-bold">
                      ${latestReconResult.our_total?.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Provider Total: </span>
                    <span className="text-bold">
                      ${latestReconResult.provider_total?.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Discrepancy: </span>
                    <span
                      className={`text-bold ${
                        (latestReconResult.discrepancy ?? 0) > 0
                          ? "text-red"
                          : "text-green"
                      }`}
                    >
                      ${(latestReconResult.discrepancy ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2 – Discrepancies */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              Discrepancies Found ({discrepancies.length})
            </span>
          </div>
          <div className="card-body">
            {discrepancies.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 13, textAlign: "center", padding: "32px 0" }}>
                No discrepancies detected. Run a scan to compare records.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 300, overflowY: "auto" }}>
                {discrepancies.map((d: any, i: number) => (
                  <div className="discrepancy-card" key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span className="discrepancy-type">{d.type}</span>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>
                        {d.payment_id ? `ID: ${d.payment_id}` : `Tx: ${d.provider_transaction_id}`}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, marginBottom: 8 }}>{d.description}</p>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => alert(`Resolving: ${d.type}. Posting adjustment entry to ledger.`)}
                      >
                        Post Adjustment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Reports Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Historical Reports</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Gateway</th>
                <th>Date</th>
                <th>Discrepancy</th>
                <th>Status</th>
                <th>Generated At</th>
              </tr>
            </thead>
            <tbody>
              {reconciliationReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted" style={{ textAlign: "center", padding: 24 }}>
                    No reports generated yet.
                  </td>
                </tr>
              ) : (
                reconciliationReports.map((r: any) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td>
                    <td className="text-upper">{r.provider}</td>
                    <td>{r.date}</td>
                    <td
                      className={`mono text-bold ${
                        (r.discrepancy ?? 0) > 0 ? "text-red" : "text-green"
                      }`}
                    >
                      ${(r.discrepancy ?? 0).toFixed(2)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === "MATCHED"
                            ? "badge-success"
                            : "badge-failed"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: 11 }}>
                      {new Date(r.generated_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
