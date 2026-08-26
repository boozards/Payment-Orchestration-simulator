"use client";

import React from "react";
import { Shield } from "lucide-react";

interface RuleCardProps {
  rule: any;
  onToggle: (ruleId: string, enabled: boolean) => void;
}

export default function RuleCard({ rule, onToggle }: RuleCardProps) {
  const isEnabled = rule.enabled === 1 || rule.enabled === true;

  return (
    <div className={`rule-card ${!isEnabled ? "disabled" : ""}`}>
      <div>
        <div className="rule-name">
          <Shield size={14} />
          <span style={{ color: isEnabled ? "var(--text-primary)" : "var(--text-muted)" }}>
            {rule.name}
          </span>
          <span className={`badge ${rule.action === "BLOCK" ? "badge-failed" : "badge-warning"}`}>
            {rule.action}
          </span>
        </div>
        <div className="rule-meta">
          Type: {rule.condition_type} &nbsp;|&nbsp; Params: {JSON.stringify(rule.parameters)}
        </div>
      </div>

      <div className="toggle-wrapper">
        <span
          className="toggle-label"
          style={{ color: isEnabled ? "var(--green-text)" : "var(--text-muted)" }}
        >
          {isEnabled ? "ACTIVE" : "DISABLED"}
        </span>
        <button
          type="button"
          className={isEnabled ? "btn-danger btn-sm" : "btn-secondary btn-sm"}
          onClick={() => onToggle(rule.id, isEnabled)}
        >
          {isEnabled ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  );
}
