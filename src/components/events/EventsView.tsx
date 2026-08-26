"use client";

import React, { useState, useMemo } from "react";
import { Terminal, Search, Trash2, ChevronRight, Copy, Check } from "lucide-react";

interface EventsViewProps {
  eventStream: any[];
  onClear: () => void;
}

export default function EventsView({ eventStream, onClear }: EventsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState("ALL");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredEvents = useMemo(() => {
    return eventStream.filter((e) => {
      const matchSearch =
        !searchTerm ||
        e.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTopic =
        topicFilter === "ALL" || e.topic?.startsWith(topicFilter);

      return matchSearch && matchTopic;
    });
  }, [eventStream, searchTerm, topicFilter]);

  const getTopicColor = (topic: string) => {
    if (topic.startsWith("payment")) return "#22C55E";
    if (topic.startsWith("provider.circuit") || topic.startsWith("provider.failed")) return "#EF4444";
    if (topic.startsWith("provider")) return "#3B82F6";
    if (topic.startsWith("router")) return "#8B5CF6";
    if (topic.startsWith("ledger")) return "#EAB308";
    if (topic.startsWith("idempotency")) return "#06B6D4";
    if (topic.startsWith("vault")) return "#EC4899";
    return "#71717A";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            Developer Event Stream
          </h1>
          <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
            Real-time Kafka event bus audit log recording idempotency checks, routing decisions, provider requests, and ledger journals.
          </p>
        </div>

        <button onClick={onClear} className="fin-btn fin-btn-secondary fin-btn-sm">
          <Trash2 size={12} />
          <span>Clear Stream</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          padding: "10px 14px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={13}
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
            placeholder="Search events by topic, message, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="fin-input"
            style={{ paddingLeft: "30px", height: "32px", fontSize: "12px" }}
          />
        </div>

        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="fin-input"
          style={{ height: "32px", width: "180px", fontSize: "12px", padding: "4px 28px 4px 10px" }}
        >
          <option value="ALL">All Topics</option>
          <option value="payment">payment.*</option>
          <option value="provider">provider.*</option>
          <option value="router">router.*</option>
          <option value="ledger">ledger.*</option>
          <option value="idempotency">idempotency.*</option>
          <option value="vault">vault.*</option>
          <option value="webhook">webhook.*</option>
        </select>

        <div className="mono text-muted" style={{ fontSize: "11px" }}>
          {filteredEvents.length} events
        </div>
      </div>

      {/* Events Terminal / Stream List */}
      <div className="fin-card">
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-subtle)",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            display: "grid",
            gridTemplateColumns: "140px 160px 1fr 60px",
          }}
        >
          <span>Timestamp</span>
          <span>Topic</span>
          <span>Message</span>
          <span style={{ textAlign: "right" }}>Payload</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {filteredEvents.map((evt) => {
            const isExpanded = expandedEventId === evt.id;
            const topicColor = getTopicColor(evt.topic);

            return (
              <div
                key={evt.id}
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  backgroundColor: isExpanded ? "var(--bg-canvas)" : "transparent",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 160px 1fr 60px",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                >
                  <span className="mono text-muted" style={{ fontSize: "11px" }}>
                    {new Date(evt.timestamp || Date.now()).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      fractionalSecondDigits: 3,
                    })}
                  </span>

                  <div>
                    <span
                      className="mono"
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: topicColor,
                        padding: "1px 6px",
                        borderRadius: "3px",
                        backgroundColor: "var(--bg-subtle)",
                      }}
                    >
                      {evt.topic}
                    </span>
                  </div>

                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {evt.message}
                  </span>

                  <div style={{ textAlign: "right" }}>
                    {evt.payload && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedEventId(isExpanded ? null : evt.id);
                        }}
                        className="fin-btn fin-btn-secondary fin-btn-sm"
                        style={{ padding: "2px 6px", fontSize: "10.5px" }}
                      >
                        {isExpanded ? "Hide" : "JSON"}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && evt.payload && (
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "#09090B",
                      color: "#E4E4E7",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      position: "relative",
                    }}
                  >
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(evt.payload, null, 2), evt.id)}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        padding: "4px 8px",
                        fontSize: "10px",
                        background: "#27272A",
                        border: "none",
                        borderRadius: "3px",
                        color: "#FFFFFF",
                        cursor: "pointer",
                      }}
                    >
                      {copiedId === evt.id ? "Copied" : "Copy"}
                    </button>
                    <pre style={{ margin: 0, overflowX: "auto" }}>
                      {JSON.stringify(evt.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}

          {filteredEvents.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)" }}>
              No event logs matching current search filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
