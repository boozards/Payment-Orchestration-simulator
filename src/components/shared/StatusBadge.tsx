"use client";

import React from "react";

export interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase();

  let styleClass = "fin-badge-neutral";
  let label = normalized.replace(/_/g, " ");

  switch (normalized) {
    case "SETTLED":
    case "CAPTURED":
    case "SUCCEEDED":
    case "SUCCESS":
    case "ACTIVE":
    case "CLOSED":
    case "MATCHED":
      styleClass = "fin-badge-success";
      break;

    case "AUTHORIZED":
    case "PENDING":
    case "PENDING_INQUIRY":
    case "PROCESSING":
    case "HALF_OPEN":
    case "FLAG":
    case "RETRYING":
      styleClass = "fin-badge-warning";
      break;

    case "FAILED":
    case "BLOCK":
    case "OPEN":
    case "DISCREPANCY_FOUND":
    case "ERROR":
    case "DECLINED":
      styleClass = "fin-badge-error";
      break;

    case "CREATED":
      styleClass = "fin-badge-info";
      break;

    case "PARTIALLY_REFUNDED":
    case "REFUNDED":
    case "VOIDED":
    case "DISABLED":
    default:
      styleClass = "fin-badge-neutral";
      break;
  }

  return (
    <span className={`fin-badge ${styleClass}`} style={size === "sm" ? { padding: "1px 6px", fontSize: "10.5px" } : undefined}>
      <span className="fin-badge-dot" />
      <span>{label}</span>
    </span>
  );
}
