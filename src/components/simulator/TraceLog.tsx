"use client";

import React from "react";

interface TraceLogProps {
  steps: string[];
  response: any;
}

export default function TraceLog({ steps, response }: TraceLogProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Gateway Processing Trace</h3>
      </div>
      <div className="card-body">
        {steps.length === 0 && !response ? (
          <p className="text-muted" style={{ textAlign: "center", padding: "32px 0", fontSize: "13px" }}>
            Run a transaction to see the processing trace
          </p>
        ) : (
          <div className="trace-log">
            {steps.map((step, i) => (
              <div key={i} className="trace-step">
                {step}
              </div>
            ))}
            {response && (
              <div className="mt-16">
                <label className="input-label">Response Payload</label>
                <pre className="trace-response">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
