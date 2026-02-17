'use client'

import React, { useState } from 'react'
import { X, RefreshCw } from 'lucide-react'

// Simple inline styles
const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    background: 'rgba(15,15,26,0.95)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.1)',
    width: '90%',
    maxWidth: 800,
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#fff',
    margin: 0,
  },
  close: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    padding: 4,
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em',
  },
  contentBox: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 16,
    border: '1px solid rgba(255,255,255,0.05)',
    whiteSpace: 'pre-wrap' as const,
    fontSize: '0.9rem',
    lineHeight: 1.6,
  },
  button: {
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  buttonPrimary: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
  },
  buttonSecondary: {
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.8)',
  },
  buttonRow: {
    display: 'flex',
    gap: 12,
    marginTop: 24,
  },
}

interface ContentAsset {
  id: string
  type: string
  content: string
  status: 'generated' | 'selected' | 'regenerating' | 'dropped' | 'archived'
  version: number
  created_at: string
}

interface Props {
  asset: ContentAsset
  onClose: () => void
  onRegenerate?: () => void
}

export function AssetCompare({ asset, onClose, onRegenerate }: Props) {
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    // TODO: Implement regeneration
    setTimeout(() => setIsRegenerating(false), 2000)
  }

  if (!asset) return null

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Compare & Regenerate</h2>
          <button style={styles.close} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Current Version (v{asset.version})</div>
            <div style={styles.contentBox}>{asset.content}</div>
          </div>

          <div style={styles.buttonRow}>
            <button 
              style={{ ...styles.button, ...styles.buttonPrimary }}
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw size={16} style={{ animation: isRegenerating ? 'spin 1s linear infinite' : 'none' }}>
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </RefreshCw></button>

            <button 
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssetCompare
