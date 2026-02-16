'use client'

import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  FileText,
  Video,
  Image as ImageIcon,
  Mail,
  TrendingUp
} from 'lucide-react'

interface ContentBundle {
  id: string
  topic: string
  trade?: string
  quality_score: number
  status: string
  created_at: string
}

interface ContentStudioProps {
  supabase: SupabaseClient | null
}

const ASSET_COLORS = ['#a855f7', '#06b6d4', '#f97316', '#22c55e']

export default function ContentStudio({ supabase }: ContentStudioProps) {
  const [bundles, setBundles] = useState<ContentBundle[]>([])
  const [selectedBundle, setSelectedBundle] = useState<ContentBundle | null>(null)

  const assetTypes = [
    { icon: Mail, label: 'Emails', count: 0, color: ASSET_COLORS[0] },
    { icon: FileText, label: 'Posts', count: 0, color: ASSET_COLORS[1] },
    { icon: Video, label: 'Videos', count: 0, color: ASSET_COLORS[2] },
    { icon: ImageIcon, label: 'Images', count: 0, color: ASSET_COLORS[3] }
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
              Run the content machine workflow to create your first bundle.
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
                      {bundle.trade} • Quality: {bundle.quality_score}/100
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
        <button style={{
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
        }}>
          Create New Bundle
        </button>
        <button style={{
          padding: '12px 24px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)',
          color: 'rgba(255,255,255,0.7)',
          fontWeight: 500,
          fontSize: '0.9rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}>
          View All Assets
        </button>
      </div>
    </div>
  )
}
