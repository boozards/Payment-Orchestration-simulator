"use client";

import { Database, Shield, Server, Lock, Activity } from "lucide-react";

export default function ProductionNotes() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Production Architecture Notes</h1>
        <p className="page-subtitle">
          This simulator mirrors the core payment orchestration logic, but
          production systems require hardened infrastructure, compliance layers,
          and distributed state management. Below is a comparison of each
          subsystem.
        </p>
      </div>

      {/* 1. Database Layer */}
      <div className="prod-section">
        <h2 className="prod-section-title">
          <Database size={20} />
          Database Layer
        </h2>
        <p className="prod-section-desc">
          The simulator uses an in-memory SQLite database for speed and
          simplicity. In production, a managed relational database with
          connection pooling, read replicas, and strict transaction isolation is
          essential for data integrity and throughput.
        </p>
        <table className="prod-comparison-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>
                Current (Simulator){" "}
                <span className="prod-badge current">CURRENT</span>
              </th>
              <th>
                Production{" "}
                <span className="prod-badge production">PRODUCTION</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Primary Store</td>
              <td>SQLite (in-memory)</td>
              <td>PostgreSQL on RDS / Aurora</td>
            </tr>
            <tr>
              <td>Connection Pool</td>
              <td>Single file handle</td>
              <td>PgBouncer connection pool</td>
            </tr>
            <tr>
              <td>Read Replicas</td>
              <td>None</td>
              <td>Analytics read replicas</td>
            </tr>
            <tr>
              <td>Isolation</td>
              <td>WAL mode</td>
              <td>SERIALIZABLE for ledger transactions</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. Caching & State */}
      <div className="prod-section">
        <h2 className="prod-section-title">
          <Server size={20} />
          Caching &amp; State
        </h2>
        <p className="prod-section-desc">
          Ephemeral in-memory state works for single-process demos but cannot
          survive restarts or scale horizontally. Production systems need
          distributed caches with persistence guarantees.
        </p>
        <table className="prod-comparison-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>
                Current (Simulator){" "}
                <span className="prod-badge current">CURRENT</span>
              </th>
              <th>
                Production{" "}
                <span className="prod-badge production">PRODUCTION</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Session Store</td>
              <td>In-memory Map</td>
              <td>Redis Cluster</td>
            </tr>
            <tr>
              <td>Idempotency Keys</td>
              <td>Memory TTL</td>
              <td>Redis with TTL + persistence</td>
            </tr>
            <tr>
              <td>Circuit Breakers</td>
              <td>Memory singleton</td>
              <td>Redis distributed locks</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. Message Queue */}
      <div className="prod-section">
        <h2 className="prod-section-title">
          <Activity size={20} />
          Message Queue
        </h2>
        <p className="prod-section-desc">
          The simulator uses a simple in-memory array as its event bus.
          Production payment systems need durable, ordered message delivery with
          replay capability for auditability and fault recovery.
        </p>
        <table className="prod-comparison-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>
                Current (Simulator){" "}
                <span className="prod-badge current">CURRENT</span>
              </th>
              <th>
                Production{" "}
                <span className="prod-badge production">PRODUCTION</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Event Bus</td>
              <td>In-memory array</td>
              <td>Apache Kafka / AWS MSK</td>
            </tr>
            <tr>
              <td>Delivery</td>
              <td>Best effort</td>
              <td>At-least-once with consumer groups</td>
            </tr>
            <tr>
              <td>Retention</td>
              <td>Session only</td>
              <td>7-day retention with replay</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Security & Compliance */}
      <div className="prod-section">
        <h2 className="prod-section-title">
          <Lock size={20} />
          Security &amp; Compliance
        </h2>
        <p className="prod-section-desc">
          Payment systems operate under strict regulatory requirements including
          PCI DSS. The simulator demonstrates the flow but skips real encryption,
          secret management, and authentication protocols required in production.
        </p>
        <table className="prod-comparison-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>
                Current (Simulator){" "}
                <span className="prod-badge current">CURRENT</span>
              </th>
              <th>
                Production{" "}
                <span className="prod-badge production">PRODUCTION</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Encryption</td>
              <td>AES-256-CBC local</td>
              <td>AWS KMS envelope encryption</td>
            </tr>
            <tr>
              <td>Secrets</td>
              <td>ENV vars</td>
              <td>HashiCorp Vault</td>
            </tr>
            <tr>
              <td>API Auth</td>
              <td>API key header</td>
              <td>OAuth 2.0 + HMAC signatures</td>
            </tr>
            <tr>
              <td>PCI</td>
              <td>Simulated vault</td>
              <td>PCI DSS Level 1 scope reduction</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Infrastructure */}
      <div className="prod-section">
        <h2 className="prod-section-title">
          <Shield size={20} />
          Infrastructure
        </h2>
        <p className="prod-section-desc">
          Running a single Node.js process locally is the simplest deployment
          model. Production payment orchestration demands container
          orchestration, auto-scaling, observability, and service mesh
          connectivity.
        </p>
        <table className="prod-comparison-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>
                Current (Simulator){" "}
                <span className="prod-badge current">CURRENT</span>
              </th>
              <th>
                Production{" "}
                <span className="prod-badge production">PRODUCTION</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Deployment</td>
              <td>npm run dev</td>
              <td>Kubernetes EKS with HPA</td>
            </tr>
            <tr>
              <td>Monitoring</td>
              <td>Console logs</td>
              <td>Prometheus + Grafana + PagerDuty</td>
            </tr>
            <tr>
              <td>Tracing</td>
              <td>None</td>
              <td>OpenTelemetry distributed tracing</td>
            </tr>
            <tr>
              <td>Load Balancing</td>
              <td>Single process</td>
              <td>ALB + service mesh</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
