'use client'

import { useState, useEffect, useCallback } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  FileText,
  Video,
  Image as ImageIcon,
  Mail,
  TrendingUp,
  Plus,
  Eye,
  X,
  Loader
} from 'lucide-react'

interface ContentBundle {
  id: string
  topic: string
  trade?: string
  quality_score: number
  status: string
  created_at: string
}

interface ContentAsset {
  id: string
  bundle_id: string
  type: string
  content: string
  status: string
  metadata: Record<string, unknown> | null
  created_at: string
}

interface AssetCounts {
  email: number
  linkedin: number
  heygen: number
  image: number
}

interface ContentStudioProps {
  supabase: SupabaseClient | null
  onRefresh?: () => void
}

const ASSET_COLORS = ['#a855f7', '#06b6d4', '#f97316', '#22c55e']

const TRADE_OPTIONS = [
  'HVAC', 'Plumbing', 'Electrical', 'Roofing',
  'General Contracting', 'Landscaping', 'Painting', 'Solar'
]

// Map UI labels to DB asset types
const ASSET_TYPE_MAP: Record<string, string> = {
  'Emails': 'email',
  'Posts': 'linkedin',
  'Videos': 'heygen',
  'Images': 'image',
}

export default function ContentStudio({ supabase, onRefresh }: ContentStudioProps) {
  const [bundles, setBundles] = useState<ContentBundle[]>([])
  const [selectedBundle, setSelectedBundle] = useState<ContentBundle | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ topic: '', trade: 'HVAC' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [assetCounts, setAssetCounts] = useState<AssetCounts>({ email: 0, linkedin: 0, heygen: 0, image: 0 })
  const [showAssets, setShowAssets] = useState(false)
  const [allAssets, setAllAssets] = useState<ContentAsset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)

  // Fetch bundles from API
  const fetchBundles = useCallback(async () => {
    try {
      const response = await fetch('/api/content-dashboard/bundles?limit=5')
      const data = await response.json()
      if (data.success) {
        setBundles(data.data.bundles || [])
      }
    } catch (err) {
      console.error('Failed to fetch bundles:', err)
    }
  }, [])

  // Fetch asset counts from API
  const fetchAssetCounts = useCallback(async () => {
    try {
      const types = ['email', 'linkedin', 'heygen', 'image']
      const results = await Promise.all(
        types.map(type =>
          fetch(`/api/content-dashboard/assets?type=${type}&limit=0`)
            .then(r => r.json())
            .then(d => ({ type, count: d.data?.totalCount || 0 }))
            .catch(() => ({ type, count: 0 }))
        )
      )

      const counts: AssetCounts = { email: 0, linkedin: 0, heygen: 0, image: 0 }
      for (const r of results) {
        counts[r.type as keyof AssetCounts] = r.count
      }
      setAssetCounts(counts)
    } catch (err) {
      console.error('Failed to fetch asset counts:', err)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    fetchBundles()
    fetchAssetCounts()

    // Real-time subscription for bundles
    if (supabase) {
      const channel = supabase
        .channel('content_bundles_monitor')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'content_bundles' },
          () => {
            fetchBundles()
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'content_assets' },
          () => {
            fetchAssetCounts()
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    }
  }, [fetchBundles, fetchAssetCounts, supabase])

  // Create bundle via API
  const handleCreateBundle = useCallback(async () => {
    if (!createForm.topic.trim()) {
      setCreateError('Please enter a topic')
      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/content-dashboard/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: createForm.topic.trim(),
          trade: createForm.trade,
        }),
      })

      if (!response.ok) throw new Error('Failed to create bundle')

      const data = await response.json()
      if (data.success) {
        setCreateForm({ topic: '', trade: 'HVAC' })
        setShowCreateModal(false)
        fetchBundles()
        fetchAssetCounts()
        onRefresh?.()
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create bundle')
    } finally {
      setCreating(false)
    }
  }, [createForm, onRefresh, fetchBundles, fetchAssetCounts])

  // View all assets
  const handleViewAllAssets = useCallback(async () => {
    setShowAssets(true)
    setAssetsLoading(true)
    try {
      const response = await fetch('/api/content-dashboard/assets?limit=50')
      const data = await response.json()
      if (data.success) {
        setAllAssets(data.data.assets || [])
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err)
    } finally {
      setAssetsLoading(false)
    }
  }, [])

  const assetTypes = [
    { icon: Mail, label: 'Emails', count: assetCounts.email, color: ASSET_COLORS[0] },
    { icon: FileText, label: 'Posts', count: assetCounts.linkedin, color: ASSET_COLORS[1] },
    { icon: Video, label: 'Videos', count: assetCounts.heygen, color: ASSET_COLORS[2] },
    { icon: ImageIcon, label: 'Images', count: assetCounts.image, color: ASSET_COLORS[3] }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Asset Library */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {assetTypes.map((asset) => (
          <div
            key={asset.label}
            className="card-hover"
            style={{
              padding: '22px',
              borderRadius: '14px',
              background: 'rgba(15, 15, 26, 0.7)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderTop: `3px solid ${asset.color}`,
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `${asset.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <asset.icon size={18} style={{ color: asset.color }} />
              </div>
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                {asset.label}
              </span>
            </div>
            <p style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {asset.count}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Bundles */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{
          fontSize: '1.05rem',
          fontWeight: 600,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'rgba(255,255,255,0.85)',
        }}>
          <TrendingUp size={18} style={{ color: '#a855f7' }} />
          Recent Content Bundles
        </h3>

        {bundles.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.95rem' }}>No content bundles yet.</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', marginTop: '6px' }}>
              Click &quot;Create New Bundle&quot; to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bundles.slice(0, 5).map((bundle) => (
              <div
                key={bundle.id}
                onClick={() => setSelectedBundle(bundle)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{bundle.topic}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                      {bundle.trade} {bundle.quality_score > 0 && `• Quality: ${bundle.quality_score}/100`}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    ...(bundle.status === 'complete'
                      ? { background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }
                      : { background: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24' }),
                  }}>
                    {bundle.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '14px' }}>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
          <Plus size={16} />
          Create New Bundle
        </button>
        <button
          onClick={handleViewAllAssets}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
          <Eye size={16} />
          View All Assets
        </button>
      </div>

      {/* Create Bundle Modal */}
      {showCreateModal && (
        <div
          onClick={() => { if (!creating) setShowCreateModal(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '80px',
            paddingBottom: '40px',
          }}
        >
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '480px',
              padding: '28px',
              height: 'fit-content',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Create New Content Bundle
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)',
                  padding: '4px',
                }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.03em',
                  marginBottom: '8px',
                }}>
                  Topic
                </label>
                <input
                  type="text"
                  value={createForm.topic}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, topic: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !creating) handleCreateBundle() }}
                  placeholder="e.g., HVAC maintenance tips for spring"
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(15, 15, 26, 0.8)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.03em',
                  marginBottom: '8px',
                }}>
                  Trade
                </label>
                <select
                  value={createForm.trade}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, trade: e.target.value }))}
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(15, 15, 26, 0.8)',
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                >
                  {TRADE_OPTIONS.map((trade) => (
                    <option key={trade} value={trade}>{trade}</option>
                  ))}
                </select>
              </div>

              {createError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  fontSize: '0.85rem',
                }}>
                  {createError}
                </div>
              )}

              <button
                onClick={handleCreateBundle}
                disabled={creating}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: creating
                    ? 'rgba(168, 85, 247, 0.5)'
                    : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: creating ? 'none' : '0 4px 15px rgba(168, 85, 247, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {creating && <Loader size={16} className="animate-spin" />}
                {creating ? 'Creating Bundle...' : 'Create Bundle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View All Assets Modal */}
      {showAssets && (
        <div
          onClick={() => setShowAssets(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '60px',
            paddingBottom: '40px',
            overflowY: 'auto',
          }}
        >
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '700px',
              padding: '28px',
              height: 'fit-content',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                All Content Assets
              </h3>
              <button
                onClick={() => setShowAssets(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)',
                  padding: '4px',
                }}
              >
                <X size={22} />
              </button>
            </div>

            {assetsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                <Loader size={20} className="animate-spin" style={{ color: '#667eea' }} />
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Loading assets...</span>
              </div>
            ) : allAssets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)' }}>No assets yet. Create a bundle to generate content.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                {allAssets.map((asset) => (
                  <div
                    key={asset.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(168, 85, 247, 0.15)',
                        color: '#a855f7',
                        fontWeight: 600,
                        textTransform: 'uppercase' as const,
                      }}>
                        {asset.type}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        ...(asset.status === 'published'
                          ? { background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }
                          : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }),
                      }}>
                        {asset.status}
                      </span>
                    </div>
                    {asset.content && (
                      <p style={{
                        fontSize: '0.85rem',
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: 1.5,
                        maxHeight: '60px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {asset.content.slice(0, 200)}{asset.content.length > 200 ? '...' : ''}
                      </p>
                    )}
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: '6px' }}>
                      {new Date(asset.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
