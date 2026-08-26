"use client";

import React from "react";

interface PipelineStep {
  label: string;
  icon: React.ReactNode;
  status: "pending" | "active" | "done" | "failed";
}

interface PipelineVisualizerProps {
  steps: PipelineStep[];
}

function getConnectorClass(prevStatus: PipelineStep["status"], nextStatus: PipelineStep["status"]): string {
  if (prevStatus === "done" && nextStatus === "done") return "pipeline-connector done";
  if (prevStatus === "done" || prevStatus === "active") return "pipeline-connector active";
  return "pipeline-connector";
}

export default function PipelineVisualizer({ steps }: PipelineVisualizerProps) {
  return (
    <div className="pipeline">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className={`pipeline-step ${step.status}`}>
            <div className="pipeline-step-icon">{step.icon}</div>
            <div className="pipeline-step-label">{step.label}</div>
          </div>
          {i < steps.length - 1 && (
            <div className={getConnectorClass(step.status, steps[i + 1].status)} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
