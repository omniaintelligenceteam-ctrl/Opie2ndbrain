'use client'

import {
  Activity,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react'

interface StatsPanelProps {
  activeCount: number
  completedCount: number
  failedCount: number
  avgDuration?: number
}

export default function StatsPanel({
  activeCount,
  completedCount,
  failedCount,
  avgDuration
}: StatsPanelProps) {
  const total = activeCount + completedCount + failedCount
  const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 0

  const stats = [
    {
      label: 'Active',
      value: activeCount,
      icon: Activity,
      color: '#3b82f6',
    },
    {
      label: 'Completed',
      value: completedCount,
      icon: CheckCircle,
      color: '#22c55e',
    },
    {
      label: 'Failed',
      value: failedCount,
      icon: Clock,
      color: '#ef4444',
    },
    {
      label: 'Success Rate',
      value: `${successRate}%`,
      icon: TrendingUp,
      color: '#a855f7',
    }
  ]

  return (
    <div className="glass-card" style={{ padding: '14px 18px' }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: `${stat.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <stat.icon size={16} style={{ color: stat.color }} />
            </div>
            <div>
              <p style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {stat.value}
              </p>
              <p style={{
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 500,
                marginTop: '2px',
              }}>
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
