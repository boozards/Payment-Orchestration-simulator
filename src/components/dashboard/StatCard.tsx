"use client";

import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon: React.ReactNode;
  valueColor?: string;
}

export default function StatCard({
  label,
  value,
  detail,
  icon,
  valueColor,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">
        <span>{label}</span>
        {icon}
      </div>
      <div
        className="stat-card-value"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      {detail && <div className="stat-card-detail">{detail}</div>}
    </div>
  );
}
