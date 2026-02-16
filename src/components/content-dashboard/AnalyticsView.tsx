'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  Eye,
  MousePointerClick,
  Share2,
  TrendingUp,
  Loader,
  Plus,
  X
} from 'lucide-react'
import type { Toast } from '../../hooks/useRealTimeData'

interface AnalyticsSummary {
  impressions: number
  clicks: number
  avgEngagement: number
  shares: number
}

interface PlatformBreakdown {
  platform: string
  impressions: number
  clicks: number
  avgEngagement: number
  shares: number
}

interface AnalyticsViewProps {
  showToast?: (toast: Omit<Toast, 'id'>) => string
}

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: '#0a66c2',
  instagram: '#e4405f',
  email: '#a855f7',
  twitter: '#1da1f2',
  facebook: '#1877f2',
}

export default function AnalyticsView({ showToast }: AnalyticsViewProps) {
  const [summary, setSummary] = useState<AnalyticsSummary>({ impressions: 0, clicks: 0, avgEngagement: 0, shares: 0 })
  const [platforms, setPlatforms] = useState<PlatformBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(30)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [assets, setAssets] = useState<any[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [recordForm, setRecordForm] = useState({
    assetId: '',
    platform: 'linkedin',
    impressions: 0,
    clicks: 0,
    engagement_rate: 0,
    shares: 0,
  })
  const [recording, setRecording] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch(`/api/content-dashboard/analytics/performance?days=${dateRange}`)
      const data = await response.json()
      if (data.success) {
        setSummary(data.data.summary || { impressions: 0, clicks: 0, avgEngagement: 0, shares: 0 })
        setPlatforms(data.data.platforms || [])
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    setLoading(true)
    fetchAnalytics()
  }, [fetchAnalytics])

  const fetchAssets = async () => {
    setAssetsLoading(true)
    try {
      const response = await fetch('/api/content-dashboard/assets?limit=50')
      const data = await response.json()
      if (data.success) setAssets(data.data.assets || [])
    } catch (err) {
      console.error('Failed to fetch assets:', err)
    } finally {
      setAssetsLoading(false)
    }
  }

  const handleRecordMetrics = async () => {
    if (!recordForm.assetId) return
    setRecording(true)
    try {
      const response = await fetch('/api/content-dashboard/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordForm),
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'success', title: 'Metrics Recorded', duration: 3000 })
        setShowRecordModal(false)
        setRecordForm({ assetId: '', platform: 'linkedin', impressions: 0, clicks: 0, engagement_rate: 0, shares: 0 })
        fetchAnalytics()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast?.({ type: 'error', title: 'Failed', message: err.message || 'Could not record metrics', duration: 5000 })
    } finally {
      setRecording(false)
    }
  }

  const summaryCards = [
    { label: 'Impressions', value: summary.impressions.toLocaleString(), icon: Eye, color: '#3b82f6' },
    { label: 'Clicks', value: summary.clicks.toLocaleString(), icon: MousePointerClick, color: '#22c55e' },
    { label: 'Avg Engagement', value: `${summary.avgEngagement.toFixed(1)}%`, icon: TrendingUp, color: '#f97316' },
    { label: 'Shares', value: summary.shares.toLocaleString(), icon: Share2, color: '#a855f7' },
  ]

  const maxImpressions = Math.max(...platforms.map(p => p.impressions), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 size={20} style={{ color: '#f97316' }} />
          Performance Analytics
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Date range selector */}
          <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[7, 30, 90].map(days => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  ...(dateRange === days
                    ? { background: 'rgba(102, 126, 234, 0.2)', color: '#667eea' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.4)' }),
                }}
              >
                {days}d
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowRecordModal(true); fetchAssets() }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Plus size={14} /> Record Metrics
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="glass-card" style={{ padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Loader size={18} className="animate-spin" style={{ color: '#f97316' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Loading analytics...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="glass-card"
                style={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <card.icon size={16} style={{ color: card.color }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                    {card.label}
                  </span>
                </div>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Platform Breakdown */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '20px' }}>
              Platform Breakdown
            </h3>
            {platforms.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '24px' }}>
                No analytics data yet. Record metrics to see breakdown.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {platforms.map((platform) => {
                  const color = PLATFORM_COLORS[platform.platform] || '#6b7280'
                  const barWidth = (platform.impressions / maxImpressions) * 100
                  return (
                    <div key={platform.platform}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '0.85rem', fontWeight: 600, color: '#fff', textTransform: 'capitalize' as const,
                        }}>
                          {platform.platform}
                        </span>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                          <span>{platform.impressions.toLocaleString()} impr.</span>
                          <span>{platform.clicks.toLocaleString()} clicks</span>
                          <span>{platform.avgEngagement.toFixed(1)}% eng.</span>
                          <span>{platform.shares} shares</span>
                        </div>
                      </div>
                      <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          borderRadius: '4px',
                          width: `${barWidth}%`,
                          background: color,
                          transition: 'width 0.5s ease',
                          minWidth: platform.impressions > 0 ? '4px' : 0,
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Record Metrics Modal */}
      {showRecordModal && (
        <div
          onClick={() => { if (!recording) setShowRecordModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', justifyContent: 'center', paddingTop: '80px', paddingBottom: '40px' }}
        >
          <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '500px', padding: '28px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Record Metrics</h3>
              <button onClick={() => setShowRecordModal(false)} disabled={recording} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Asset</label>
                {assetsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px' }}>
                    <Loader size={14} className="animate-spin" style={{ color: '#667eea' }} /> Loading...
                  </div>
                ) : (
                  <select
                    value={recordForm.assetId}
                    onChange={(e) => setRecordForm(p => ({ ...p, assetId: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 15, 26, 0.8)', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const }}
                  >
                    <option value="">Select asset...</option>
                    {assets.map((a: any) => (
                      <option key={a.id} value={a.id}>[{a.type.toUpperCase()}] {a.content?.slice(0, 50) || a.id}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Platform</label>
                <select
                  value={recordForm.platform}
                  onChange={(e) => setRecordForm(p => ({ ...p, platform: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 15, 26, 0.8)', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const }}
                >
                  {Object.keys(PLATFORM_COLORS).map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { key: 'impressions', label: 'Impressions' },
                  { key: 'clicks', label: 'Clicks' },
                  { key: 'engagement_rate', label: 'Engagement %' },
                  { key: 'shares', label: 'Shares' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>{field.label}</label>
                    <input
                      type="number"
                      value={recordForm[field.key as keyof typeof recordForm]}
                      onChange={(e) => setRecordForm(p => ({ ...p, [field.key]: parseFloat(e.target.value) || 0 }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 15, 26, 0.8)', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const }}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleRecordMetrics}
                disabled={recording || !recordForm.assetId}
                style={{
                  padding: '12px 24px', borderRadius: '10px', border: 'none',
                  background: recording || !recordForm.assetId ? 'rgba(249, 115, 22, 0.3)' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: '#fff', fontWeight: 600, fontSize: '0.9rem',
                  cursor: recording || !recordForm.assetId ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {recording && <Loader size={16} className="animate-spin" />}
                {recording ? 'Recording...' : 'Record Metrics'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
