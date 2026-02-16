'use client'

import { useState, useEffect } from 'react'
import WorkflowMonitor from '../../components/content-dashboard/WorkflowMonitor'
import ContentStudio from '../../components/content-dashboard/ContentStudio'
import DashboardHeader from '../../components/content-dashboard/DashboardHeader'
import { supabase } from '../../lib/supabase'

interface DashboardStats {
  activeWorkflows: number
  queuedWorkflows: number
  approvedContent: number
  queuedTopics: number
  avgAgentHealth: number
  scheduledPosts: number
}

export default function ContentCommandCenter() {
  const [activeTab, setActiveTab] = useState('workflows')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/content-dashboard/analytics')
      if (!response.ok) throw new Error('Failed to fetch stats')
      
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err)
      setError('Failed to load dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen" style={{ 
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Header */}
        <DashboardHeader 
          stats={stats}
          loading={loading}
          error={error}
          onRefresh={fetchStats}
        />

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8 border-b" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setActiveTab('workflows')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'workflows'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent hover:border-gray-300'
              }`}
              style={activeTab !== 'workflows' ? { color: 'var(--text-secondary)' } : {}}
            >
              Workflow Monitor
            </button>
            
            <button
              onClick={() => setActiveTab('content')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'content'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent hover:border-gray-300'
              }`}
              style={activeTab !== 'content' ? { color: 'var(--text-secondary)' } : {}}
            >
              Content Studio
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'workflows' && (
          <WorkflowMonitor supabase={supabase} />
        )}

        {activeTab === 'content' && (
          <ContentStudio supabase={supabase} />
        )}
      </div>
    </div>
  )
}