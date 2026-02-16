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
      color: 'text-blue-400'
    },
    {
      label: 'Completed',
      value: completedCount,
      icon: CheckCircle,
      color: 'text-green-400'
    },
    {
      label: 'Failed',
      value: failedCount,
      icon: Clock,
      color: 'text-red-400'
    },
    {
      label: 'Success Rate',
      value: `${successRate}%`,
      icon: TrendingUp,
      color: 'text-purple-400'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="p-4 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
