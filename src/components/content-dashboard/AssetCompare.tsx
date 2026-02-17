'use client'

import React, { useState } from 'react'
import { X, RefreshCw, Loader } from 'lucide-react'

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    zIndex: 10002,
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
    maxWidth: 600,
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
    fontSize: '1.1rem',
    fontWeight: 700,
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
  label: {
    display: 'block' as const,
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
    marginBottom: 8,
  },
}

const ANGLE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'educational', label: 'Educational' },
  { value: 'conversational', label: 'Conversational' },
]

const LENGTH_OPTIONS = [
  { value: 'shorter', label: 'Shorter' },
  { value: 'same', label: 'Same Length' },
  { value: 'longer', label: 'Longer' },
]

interface ContentAsset {
  id: string
  type: string
  content: string
  status: string
  version?: number
  created_at: string
}

interface Toast {
  type: 'success' | 'error' | 'info'
  title: string
  message: string
  duration?: number
}

interface Props {
  asset: ContentAsset
  onClose: () => void
  onRegenerate?: () => void
  showToast?: (toast: Omit<Toast, 'id'>) => void
}

export function AssetCompare({ asset, onClose, onRegenerate, showToast }: Props) {
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [angle, setAngle] = useState('professional')
  const [length, setLength] = useState('same')
  const [focus, setFocus] = useState('')

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const body: Record<string, string> = { angle, length }
      if (focus.trim()) body.focus = focus.trim()

      const res = await fetch(`/api/content-dashboard/assets/${asset.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to regenerate')
      }
      showToast?.({ type: 'success', title: 'Regenerating', message: 'A new version is being created...', duration: 4000 })
      onRegenerate?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to regenerate'
      showToast?.({ type: 'error', title: 'Regeneration Failed', message: msg, duration: 5000 })
    } finally {
      setIsRegenerating(false)
    }
  }

  if (!asset) return null

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Regenerate {asset.type.toUpperCase()}</h2>
          <button style={styles.close} onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div style={styles.content}>
          {/* Current Content Preview */}
          <div style={{ marginBottom: '20px' }}>
            <div style={styles.label}>
              Current Version {asset.version ? `(v${asset.version})` : ''}
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 10,
              padding: 14,
              border: '1px solid rgba(255,255,255,0.05)',
              whiteSpace: 'pre-wrap' as const,
              fontSize: '0.82rem',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.55)',
              maxHeight: 150,
              overflow: 'auto',
            }}>
              {asset.content.slice(0, 500)}{asset.content.length > 500 ? '...' : ''}
            </div>
          </div>

          {/* Regeneration Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Angle */}
            <div>
              <div style={styles.label}>Tone / Angle</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {ANGLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAngle(opt.value)}
                    disabled={isRegenerating}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: `1px solid ${angle === opt.value ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                      background: angle === opt.value ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                      color: angle === opt.value ? '#c084fc' : 'rgba(255,255,255,0.45)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: isRegenerating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Length */}
            <div>
              <div style={styles.label}>Length</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {LENGTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLength(opt.value)}
                    disabled={isRegenerating}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: `1px solid ${length === opt.value ? 'rgba(102, 126, 234, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                      background: length === opt.value ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                      color: length === opt.value ? '#818cf8' : 'rgba(255,255,255,0.45)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: isRegenerating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Focus */}
            <div>
              <div style={styles.label}>
                Focus <span style={{ fontWeight: 400, textTransform: 'none' as const }}>(optional)</span>
              </div>
              <input
                type="text"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="e.g., Emphasize urgency, add more statistics..."
                disabled={isRegenerating}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(15, 15, 26, 0.8)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box' as const,
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 10,
                border: 'none',
                background: isRegenerating
                  ? 'rgba(168, 85, 247, 0.3)'
                  : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: isRegenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: isRegenerating ? 'none' : '0 4px 15px rgba(168, 85, 247, 0.3)',
              }}
            >
              {isRegenerating ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              {isRegenerating ? 'Regenerating...' : 'Regenerate Asset'}
            </button>
            <button
              onClick={onClose}
              disabled={isRegenerating}
              style={{
                padding: '12px 20px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 500,
                fontSize: '0.9rem',
                cursor: isRegenerating ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssetCompare
