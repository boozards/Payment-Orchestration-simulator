"use client";

import React, { useState } from "react";
import {
  Cpu,
  Lock,
  ShieldCheck,
  GitBranch,
  Zap,
  BookOpen,
  Wifi,
  Database,
  Layers,
  ArrowRight,
} from "lucide-react";

interface ArchitectureNode {
  id: string;
  name: string;
  category: string;
  icon: React.ComponentType<{ size: number }>;
  summary: string;
  invariants: string[];
  prodMapping: string;
}

export default function ArchitectureView() {
  const nodes: ArchitectureNode[] = [
    {
      id: "gateway",
      name: "API Gateway & Idempotency Lock",
      category: "Ingress",
      icon: Layers,
      summary: "Accepts merchant payment intents, enforces API key authentication, and acquires two-phase atomic idempotency locks.",
      invariants: [
        "Concurrent requests with the same Idempotency-Key are locked with ACQUIRED / IN_PROGRESS semantics (HTTP 409 Conflict on collision).",
        "Never processes duplicate charges for the same idempotency key within the 24-hour TTL window.",
      ],
      prodMapping: "Envoy / AWS API Gateway + Redis Cluster (SET key val NX EX 86400).",
    },
    {
      id: "vault",
      name: "PCI Tokenization Vault",
      category: "Security",
      icon: Lock,
      summary: "Isolates raw cardholder PAN data from the main application via AES-256 envelope encryption, producing scope-reducing tokens.",
      invariants: [
        "Raw PANs are never stored in relational tables or written to application log streams.",
        "Only authorized provider adapters are granted temporary detokenization access during transaction execution.",
      ],
      prodMapping: "AWS KMS / HashiCorp Vault with dedicated HSM Key Encryption Keys.",
    },
    {
      id: "fraud",
      name: "Fraud & Anomaly Engine",
      category: "Risk",
      icon: ShieldCheck,
      summary: "Screens transactions in real-time against velocity limits, card/IP geo-mismatches, and email anomaly heuristic scores.",
      invariants: [
        "Transactions scoring >= 80 or triggering AMOUNT_THRESHOLD rules are blocked before contacting external card networks.",
        "Flagged transactions (50-79) proceed with 3DS authentication requirements.",
      ],
      prodMapping: "Flink / Redis-backed real-time sliding window velocity aggregation.",
    },
    {
      id: "router",
      name: "Smart Routing & Circuit Breakers",
      category: "Orchestration",
      icon: GitBranch,
      summary: "Dynamically calculates interchange fee matrices and evaluates 3-state circuit breakers (CLOSED, OPEN, HALF-OPEN) to pick the optimal gateway.",
      invariants: [
        "Gateways with OPEN circuits (>= 3 consecutive failures) are bypassed with automatic failover.",
        "Ambiguous 504 timeouts halt execution to prevent customer double-charging.",
      ],
      prodMapping: "Distributed circuit breakers backed by Redis + Envoy active outlier detection.",
    },
    {
      id: "adapters",
      name: "Polymorphic Gateway Adapters",
      category: "Integration",
      icon: Zap,
      summary: "Encapsulates Stripe, PayPal, and Razorpay integrations, standardizing error classifications (Deterministic Declines vs Ambiguous Timeouts).",
      invariants: [
        "Deterministic declines (insufficient funds, bad CVV) are never retried on other providers.",
        "Timeouts are tagged as AMBIGUOUS_TIMEOUT and transition state to PENDING_INQUIRY.",
      ],
      prodMapping: "Stateless microservice adapters communicating over mTLS.",
    },
    {
      id: "ledger",
      name: "Double-Entry Bookkeeping Ledger",
      category: "Financial Core",
      icon: BookOpen,
      summary: "Records atomic, immutable journal entries ensuring total debits strictly equal total credits on every capture, refund, or fee deduction.",
      invariants: [
        "Mass Conservation Law: Sum(Debits) === Sum(Credits) with 0.00 variance.",
        "Balances updated atomically using integer currency minor units (cents / paise) to prevent floating point drift.",
      ],
      prodMapping: "PostgreSQL Aurora with SERIALIZABLE transaction isolation and PgBouncer.",
    },
    {
      id: "outbox",
      name: "Transactional Outbox & Webhooks",
      category: "Egress",
      icon: Wifi,
      summary: "Drives reliable, at-least-once merchant event notifications signed with HMAC-SHA256 and exponential backoff retry schedules.",
      invariants: [
        "Outbox events are committed inside the exact same database transaction that settles the payment.",
        "Webhooks retry up to 3 times with exponential backoff and dead-letter queueing.",
      ],
      prodMapping: "Kafka / AWS SQS with dedicated worker consumers and Dead Letter Queues.",
    },
  ];

  const [selectedNodeId, setSelectedNodeId] = useState<string>("router");
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const IconComponent = selectedNode.icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Payment Orchestration Engine Blueprint
        </h1>
        <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
          Interactive architecture map illustrating component boundaries, transactional invariants, and production infrastructure mappings.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.4fr", gap: "20px", alignItems: "start" }}>
        {/* Left: Interactive Node Blueprint Graph */}
        <div className="fin-card">
          <div className="fin-card-header">
            <span className="fin-card-title">Engine Flow & Component Boundaries</span>
            <span className="fin-label" style={{ margin: 0 }}>Click Node to Inspect</span>
          </div>

          <div className="fin-card-body" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {nodes.map((node, idx) => {
              const isSelected = selectedNodeId === node.id;
              const NodeIcon = node.icon;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isSelected ? "var(--bg-canvas)" : "var(--bg-surface)",
                    border: `1px solid ${isSelected ? "#09090B" : "var(--border-subtle)"}`,
                    boxShadow: isSelected ? "0 0 0 1px #09090B" : "none",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      backgroundColor: isSelected ? "#09090B" : "var(--bg-subtle)",
                      color: isSelected ? "#FFFFFF" : "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <NodeIcon size={16} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: isSelected ? 700 : 600, color: "var(--text-primary)" }}>
                        {node.name}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: "10px",
                          padding: "1px 5px",
                          borderRadius: "3px",
                          backgroundColor: "var(--bg-subtle)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {node.category}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                      {node.summary}
                    </div>
                  </div>

                  {isSelected && <ArrowRight size={14} color="#09090B" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Node Technical Specification */}
        <div className="fin-card">
          <div className="fin-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "4px",
                  backgroundColor: "#09090B",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconComponent size={14} />
              </div>
              <span className="fin-card-title">{selectedNode.name}</span>
            </div>
            <span className="fin-label" style={{ margin: 0 }}>
              {selectedNode.category}
            </span>
          </div>

          <div className="fin-card-body" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <span className="fin-label">Architectural Role</span>
              <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                {selectedNode.summary}
              </p>
            </div>

            <div>
              <span className="fin-label">Critical Financial & Distributed Invariants</span>
              <ul style={{ paddingLeft: "16px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: "6px" }}>
                {selectedNode.invariants.map((inv, i) => (
                  <li key={i}>{inv}</li>
                ))}
              </ul>
            </div>

            <div
              style={{
                padding: "12px",
                backgroundColor: "var(--bg-canvas)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span className="fin-label" style={{ marginBottom: "4px" }}>
                Production Infrastructure Target
              </span>
              <div className="mono" style={{ fontSize: "11.5px", color: "var(--text-primary)", fontWeight: 600 }}>
                {selectedNode.prodMapping}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
