'use client'

import { Activity, FileText, Clock, Users, RefreshCw, AlertTriangle } from 'lucide-react'

interface DashboardStats {
  activeWorkflows: number
  queuedWorkflows: number
  approvedContent: number
  queuedTopics: number
  avgAgentHealth: number
  scheduledPosts: number
}

interface DashboardHeaderProps {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
  onRefresh: () => void
}

export default function DashboardHeader({ stats, loading, error, onRefresh }: DashboardHeaderProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getHealthColor = (health: number) => {
    if (health >= 0.9) return '#22c55e'
    if (health >= 0.7) return '#eab308'
    return '#ef4444'
  }

  const statCards = [
    {
      icon: Activity,
      value: stats?.activeWorkflows || 0,
      label: 'Active Workflows',
      color: '#3b82f6',
    },
    {
      icon: Clock,
      value: stats?.queuedWorkflows || 0,
      label: 'Queued',
      color: '#eab308',
    },
    {
      icon: FileText,
      value: stats?.approvedContent || 0,
      label: 'Content Ready',
      color: '#22c55e',
    },
    {
      icon: FileText,
      value: stats?.queuedTopics || 0,
      label: 'Ideas Queue',
      color: '#a855f7',
    },
    {
      icon: Users,
      value: stats?.avgAgentHealth ? `${Math.round(stats.avgAgentHealth * 100)}%` : '-%',
      label: 'Agent Health',
      color: stats?.avgAgentHealth ? getHealthColor(stats.avgAgentHealth) : '#6b7280',
    },
    {
      icon: Clock,
      value: stats?.scheduledPosts || 0,
      label: 'Scheduled',
      color: '#06b6d4',
    },
  ]

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* Header Section — Glass Card */}
      <div className="glass-card" style={{
        padding: '32px',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="gradient-text" style={{
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              marginBottom: '8px',
            }}>
              Content Command Center
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.95rem',
              fontWeight: 400,
            }}>
              Monitor workflows, manage content bundles, and track performance
            </p>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          marginBottom: '24px',
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="card-hover"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'rgba(15, 15, 26, 0.6)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${card.color}`,
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${card.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
              </div>
              <p style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                marginBottom: '6px',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {loading ? '...' : typeof card.value === 'number' ? formatNumber(card.value) : card.value}
              </p>
              <p style={{
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 500,
                letterSpacing: '0.01em',
              }}>
                {card.label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
