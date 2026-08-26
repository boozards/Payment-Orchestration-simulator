"use client";

interface WebhookLog {
  id: string;
  paymentId: string;
  url: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastResponse: number;
  logs: string[];
}

interface WebhooksPanelProps {
  webhookLogs: any[];
}

export default function WebhooksPanel({ webhookLogs }: WebhooksPanelProps) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Webhook Dispatch Queue</span>
      </div>
      <div className="card-body">
        {webhookLogs.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>
            No webhook dispatches yet. Process a payment to trigger webhook
            delivery attempts.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {webhookLogs.map((log: WebhookLog) => (
              <div className="webhook-card" key={log.id}>
                {/* Left column */}
                <div>
                  <div className="mono mb-16" style={{ fontSize: 11 }}>
                    {log.id}
                  </div>
                  <div className="mb-16">
                    <span
                      className={`badge ${
                        log.status === "SUCCESS"
                          ? "badge-success"
                          : log.status === "FAILED"
                          ? "badge-failed"
                          : "badge-warning"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <div className="mb-16" style={{ fontSize: 12 }}>
                    <span className="text-muted">Payment&nbsp;</span>
                    <span className="mono">{log.paymentId}</span>
                  </div>
                  <div className="mb-16" style={{ fontSize: 12 }}>
                    <span className="text-muted">Target&nbsp;</span>
                    <span className="mono">{log.url}</span>
                  </div>
                  <div className="mb-16" style={{ fontSize: 12 }}>
                    <span className="text-muted">Attempts&nbsp;</span>
                    <span className="mono">
                      {log.attempts}/{log.maxAttempts}
                    </span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <span className="text-muted">Last HTTP Status&nbsp;</span>
                    <span
                      className={`mono text-bold ${
                        log.lastResponse >= 200 && log.lastResponse < 300
                          ? "text-green"
                          : "text-red"
                      }`}
                    >
                      {log.lastResponse}
                    </span>
                  </div>
                </div>

                {/* Right column */}
                <div>
                  <div
                    className="input-label"
                    style={{ marginBottom: 8 }}
                  >
                    Connection Trace
                  </div>
                  <div className="webhook-trace dark-scroll">
                    {log.logs.map((line: string, idx: number) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
