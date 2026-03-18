"use client"
import React from "react"

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ResearchPanelProps {
  bundle: any;
  expanded: boolean;
  onToggleExpanded: () => void;
  onReload: () => void;
}

export function ResearchPanel({ bundle, expanded, onToggleExpanded }: ResearchPanelProps) {
  const progress = typeof bundle?.research_progress === "number" ? bundle.research_progress : (bundle?.research_progress as any)?.progress_percent || 0
  const findings = bundle?.research_findings
  return (
    <div style={{ borderRadius: "12px", background: "rgba(15,15,26,0.7)", border: "1px solid rgba(255,255,255,0.06)", padding: "16px" }}>
      <div onClick={onToggleExpanded} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>Research {bundle?.status === "researching" ? "In Progress..." : "Findings"}</span>
        <span style={{ color: "#94a3b8" }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && findings != null && (
        <div style={{ marginTop: "12px", color: "#cbd5e1", fontSize: "14px", whiteSpace: "pre-wrap" }}>
          {String(typeof findings === "string" ? findings : JSON.stringify(findings, null, 2))}
        </div>
      )}
      {progress > 0 && (
        <div style={{ marginTop: "8px", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.1)" }}>
          <div style={{ height: "100%", borderRadius: "2px", width: `${progress}%`, background: "linear-gradient(135deg, #667eea, #764ba2)" }} />
        </div>
      )}
    </div>
  )
}
