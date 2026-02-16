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
    if (health >= 0.9) return 'text-green-500'
    if (health >= 0.7) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="mb-8">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            🎨 Content Command Center
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
            Monitor workflows, manage content bundles, and track performance
          </p>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center px-4 py-2 rounded-lg font-medium transition-colors"
          style={{ 
            background: 'var(--accent)',
            color: 'white'
          }}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div 
          className="mb-6 p-4 rounded-lg border flex items-center"
          style={{ 
            background: 'var(--error-bg)',
            borderColor: 'var(--error)',
            color: 'var(--error)'
          }}
        >
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div 
          className="p-6 rounded-lg border"
          style={{ 
            background: 'var(--bg-card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {loading ? '...' : stats?.activeWorkflows || 0}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Active Workflows</p>
            </div>
          </div>
        </div>

        <div 
          className="p-6 rounded-lg border"
          style={{ 
            background: 'var(--bg-card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {loading ? '...' : stats?.queuedWorkflows || 0}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Queued</p>
            </div>
          </div>
        </div>

        <div 
          className="p-6 rounded-lg border"
          style={{ 
            background: 'var(--bg-card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {loading ? '...' : stats?.approvedContent || 0}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Content Ready</p>
            </div>
          </div>
        </div>

        <div 
          className="p-6 rounded-lg border"
          style={{ 
            background: 'var(--bg-card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {loading ? '...' : stats?.queuedTopics || 0}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ideas Queue</p>
            </div>
          </div>
        </div>

        <div 
          className="p-6 rounded-lg border"
          style={{ 
            background: 'var(--bg-card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center">
            <Users 
              className={`w-8 h-8 ${stats?.avgAgentHealth ? getHealthColor(stats.avgAgentHealth) : 'text-gray-500'}`} 
            />
            <div className="ml-4">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {loading ? '...' : stats?.avgAgentHealth ? `${Math.round(stats.avgAgentHealth * 100)}%` : '-%'}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Agent Health</p>
            </div>
          </div>
        </div>

        <div 
          className="p-6 rounded-lg border"
          style={{ 
            background: 'var(--bg-card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-cyan-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {loading ? '...' : stats?.scheduledPosts || 0}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Scheduled</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}