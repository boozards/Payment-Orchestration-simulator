"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "580px",
}: DrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fin-drawer-backdrop" onClick={onClose}>
      <div
        className="fin-drawer-panel"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            background: "var(--bg-surface)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="fin-btn-icon"
            title="Close drawer (Esc)"
            style={{ padding: "4px", margin: "-4px -4px 0 0" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
          {children}
        </div>

        {/* Drawer Footer */}
        {footer && (
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid var(--border-subtle)",
              background: "var(--bg-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              position: "sticky",
              bottom: 0,
              zIndex: 10,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
