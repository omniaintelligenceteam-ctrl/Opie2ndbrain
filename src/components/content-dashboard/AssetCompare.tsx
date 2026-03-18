"use client"
import React from "react"

interface AssetCompareProps {
  asset: { id: string; type: string; content: string; metadata?: Record<string, unknown> | null };
  onClose: () => void;
  onRegenerate: () => void;
  showToast?: (toast: { type: "success" | "error" | "info"; title: string; message: string; duration?: number }) => void;
}

export function AssetCompare({ asset, onClose, onRegenerate, showToast }: AssetCompareProps) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div style={{ borderRadius: "16px", background: "rgba(15,15,26,0.95)", border: "1px solid rgba(255,255,255,0.08)", padding: "24px", maxWidth: "600px", width: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ color: "#e2e8f0", margin: 0 }}>Compare: {asset.type}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "18px" }}>✕</button>
        </div>
        <div style={{ color: "#cbd5e1", fontSize: "14px", whiteSpace: "pre-wrap", maxHeight: "400px", overflow: "auto", marginBottom: "16px" }}>
          {asset.content}
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => { onRegenerate(); if (showToast) showToast({ type: "success", title: "Regenerating", message: "Asset queued for regeneration" }); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Regenerate</button>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  )
}
