"use client";

import React from "react";
import { Terminal } from "lucide-react";

interface KafkaEvent {
  id: string;
  topic: string;
  message: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

interface EventTerminalProps {
  eventStream: KafkaEvent[];
  onClear: () => void;
  terminalEndRef: React.RefObject<HTMLDivElement | null>;
}

const topicTagMap: Record<string, string> = {
  payment: "tag-payment",
  idempotency: "tag-idempotency",
  vault: "tag-vault",
  ledger: "tag-ledger",
  provider: "tag-provider",
  webhook: "tag-webhook",
  fraud: "tag-fraud",
  router: "tag-router",
  reconciliation: "tag-reconciliation",
  simulation: "tag-simulation",
  merchant: "tag-merchant",
};

function getTagClass(topic: string): string {
  return topicTagMap[topic] ?? "tag-system";
}

export default function EventTerminal({
  eventStream,
  onClear,
  terminalEndRef,
}: EventTerminalProps) {
  return (
    <div className="event-terminal">
      <div className="terminal-header">
        <div className="terminal-title">
          <Terminal size={14} />
          <span>KAFKA EVENT STREAM</span>
        </div>
        <button className="terminal-clear-btn" onClick={onClear}>
          CLEAR
        </button>
      </div>

      <div className="terminal-body dark-scroll">
        {eventStream.length === 0 ? (
          <div className="terminal-empty">Waiting for events...</div>
        ) : (
          eventStream.map((event) => (
            <div key={event.id} className="terminal-event">
              <div className="terminal-event-header">
                <span className={`event-tag ${getTagClass(event.topic)}`}>
                  {event.topic}
                </span>
                <span className="terminal-event-time">{event.timestamp}</span>
              </div>
              <div className="terminal-event-msg">{event.message}</div>
              {event.payload && (
                <pre className="terminal-event-payload">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
