'use client'

import { useState, useEffect, useCallback } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  Activity,
  PlayCircle,
  PauseCircle,
  StopCircle,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader,
  TrendingUp,
  Settings
} from 'lucide-react'
import WorkflowCard from './WorkflowCard'
import StatsPanel from './StatsPanel'

interface Workflow {
  id: string
  name?: string
  type: string
  status: string
  runtime_status?: string
  input?: any
  output?: any
  agent_logs?: Array<{
    agent: string
    timestamp: string
    level: string
    message: string
  }>
  error_message?: string
  created_at: string
  started_at?: string
  completed_at?: string
  estimated_duration?: number
  actual_duration?: number
  runtime_duration?: number
  queue_position?: number
  priority?: number
}

interface SystemStatus {
  activeWorkflows: number
  queuedWorkflows: number
  utilizationRate: number
}

interface WorkflowMonitorProps {
  supabase: SupabaseClient | null
}

export default function WorkflowMonitor({ supabase }: WorkflowMonitorProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    timeframe: '24h'
  })

  // Fetch workflows data
  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        limit: '50',
        ...filters
      })

      const response = await fetch(`/api/content-dashboard/workflows?${queryParams}`)

      const data = await response.json()
      if (data.success) {
        setWorkflows(data.data || [])
        setSystemStatus(data.system_status || {
          activeWorkflows: 0,
          queuedWorkflows: 0,
          utilizationRate: 0
        })
        setError(null)
      } else {
        throw new Error(data.error || 'Failed to fetch workflows')
      }
    } catch (err: any) {
      console.error('Failed to fetch workflows:', err)

      setWorkflows([])
      setSystemStatus({
        activeWorkflows: 0,
        queuedWorkflows: 0,
        utilizationRate: 0
      })

      setError('Workflows temporarily unavailable - retrying...')
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Real-time updates
  useEffect(() => {
    fetchWorkflows()

    if (supabase) {
      const channel = supabase
        .channel('workflows_monitor')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'workflows' },
            (payload) => {
              console.log('Workflow updated:', payload)
              fetchWorkflows()
            }
        )
        .subscribe()

      const interval = setInterval(fetchWorkflows, 30000)

      return () => {
        channel.unsubscribe()
        clearInterval(interval)
      }
    } else {
      const interval = setInterval(fetchWorkflows, 30000)
      return () => clearInterval(interval)
    }
  }, [fetchWorkflows, supabase])

  // Trigger new workflow
  const triggerWorkflow = async (workflowType: string, params = {}) => {
    try {
      const response = await fetch('/api/content-dashboard/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: workflowType,
          input: params,
          auto_start: true
        })
      })

      if (!response.ok) throw new Error('Failed to trigger workflow')

      const data = await response.json()
      if (data.success) {
        await fetchWorkflows()
        return data.data
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  // Cancel workflow
  const cancelWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/content-dashboard/workflows/${workflowId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to cancel workflow')

      const data = await response.json()
      if (data.success) {
        await fetchWorkflows()
        return data
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  // Retry failed workflow
  const retryWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/content-dashboard/workflows/${workflowId}/retry`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to retry workflow')

      const data = await response.json()
      if (data.success) {
        await fetchWorkflows()
        return data
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  // Get status color and icon
  const getStatusDisplay = (workflow: Workflow) => {
    const runtimeStatus = workflow.runtime_status || workflow.status

    switch (runtimeStatus) {
      case 'running':
        return {
          color: 'text-blue-600 bg-blue-100',
          icon: <Loader className="w-4 h-4 animate-spin" />,
          label: 'Running'
        }
      case 'completed':
        return {
          color: 'text-green-600 bg-green-100',
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Completed'
        }
      case 'failed':
        return {
          color: 'text-red-600 bg-red-100',
          icon: <XCircle className="w-4 h-4" />,
          label: 'Failed'
        }
      case 'queued':
        return {
          color: 'text-yellow-600 bg-yellow-100',
          icon: <Clock className="w-4 h-4" />,
          label: 'Queued'
        }
      case 'pending':
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: <AlertTriangle className="w-4 h-4" />,
          label: 'Pending'
        }
      default:
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: <AlertTriangle className="w-4 h-4" />,
          label: runtimeStatus || 'Unknown'
        }
    }
  }

  // Format duration
  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-'
    if (minutes < 60) return `${Math.round(minutes)}m`
    return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}m`
  }

  // Quick workflow triggers with gradient colors
  const quickWorkflows = [
    {
      type: 'content-machine',
      label: 'Generate Content',
      icon: <TrendingUp className="w-5 h-5" />,
      gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
      glow: 'rgba(168, 85, 247, 0.3)',
    },
    {
      type: 'research-trends',
      label: 'Research Trends',
      icon: <Activity className="w-5 h-5" />,
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      glow: 'rgba(6, 182, 212, 0.3)',
    },
    {
      type: 'hook-generator',
      label: 'Generate Hooks',
      icon: <RefreshCw className="w-5 h-5" />,
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      glow: 'rgba(34, 197, 94, 0.3)',
    }
  ]

  // Select styling
  const selectStyle: React.CSSProperties = {
    padding: '9px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15, 15, 26, 0.8)',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  }

  if (loading && workflows.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '250px',
        gap: '12px',
      }}>
        <Loader className="w-8 h-8 animate-spin" style={{ color: '#667eea' }} />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>Loading workflows...</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header and System Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 className="gradient-text" style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: '4px',
          }}>
            Workflow Monitor
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>
            Real-time workflow execution and management
          </p>
        </div>

        {systemStatus && (
          <StatsPanel
            activeCount={systemStatus.activeWorkflows}
            completedCount={0}
            failedCount={0}
          />
        )}
      </div>

      {/* Quick Actions — Glass Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.8)',
          marginBottom: '16px',
          letterSpacing: '-0.01em',
        }}>
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {quickWorkflows.map((workflow) => (
            <button
              key={workflow.type}
              onClick={() => {
                triggerWorkflow(workflow.type, {
                  topic: 'HVAC maintenance tips',
                  trade: 'HVAC'
                })
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                borderRadius: '12px',
                border: 'none',
                background: workflow.gradient,
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: `0 4px 15px ${workflow.glow}`,
              }}
            >
              {workflow.icon}
              {workflow.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters — Glass Card */}
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            style={selectStyle}
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            style={selectStyle}
          >
            <option value="all">All Types</option>
            <option value="content-machine">Content Machine</option>
            <option value="research-trends">Research Trends</option>
            <option value="hook-generator">Hook Generator</option>
            <option value="batch-content">Batch Content</option>
          </select>

          <button
            onClick={fetchWorkflows}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <XCircle size={18} style={{ color: '#f87171' }} />
          <span style={{ color: '#f87171', flex: 1, fontSize: '0.9rem' }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            onView={() => setSelectedWorkflow(workflow)}
            onCancel={() => cancelWorkflow(workflow.id)}
            onRetry={() => retryWorkflow(workflow.id)}
            getStatusDisplay={getStatusDisplay}
            formatDuration={formatDuration}
          />
        ))}
      </div>

      {/* Empty State */}
      {workflows.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          borderRadius: '16px',
          background: 'rgba(15, 15, 26, 0.4)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <Activity size={48} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1rem' }}>No workflows found</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', marginTop: '4px' }}>Use Quick Actions above to start a workflow</p>
        </div>
      )}

      {/* Workflow Detail Modal */}
      {selectedWorkflow && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          overflowY: 'auto',
          zIndex: 50,
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '80px',
          paddingBottom: '40px',
        }}>
          <div
            className="glass-card"
            style={{
              width: '90%',
              maxWidth: '640px',
              padding: '28px',
              height: 'fit-content',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Workflow Details: {selectedWorkflow.name || selectedWorkflow.type}
              </h3>
              <button
                onClick={() => setSelectedWorkflow(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
              >
                <XCircle size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Type
                  </label>
                  <div style={{ fontSize: '0.9rem', color: '#fff', marginTop: '4px' }}>
                    {selectedWorkflow.type}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Status
                  </label>
                  <div style={{ fontSize: '0.9rem', color: '#fff', marginTop: '4px' }}>
                    {selectedWorkflow.status}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Created
                  </label>
                  <div style={{ fontSize: '0.9rem', color: '#fff', marginTop: '4px' }}>
                    {new Date(selectedWorkflow.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Duration
                  </label>
                  <div style={{ fontSize: '0.9rem', color: '#fff', marginTop: '4px' }}>
                    {formatDuration(selectedWorkflow.actual_duration)}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Input Parameters
                </label>
                <pre style={{
                  marginTop: '6px',
                  fontSize: '0.8rem',
                  padding: '14px',
                  borderRadius: '10px',
                  overflow: 'auto',
                  maxHeight: '160px',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {JSON.stringify(selectedWorkflow.input, null, 2)}
                </pre>
              </div>

              {selectedWorkflow.output && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Output
                  </label>
                  <pre style={{
                    marginTop: '6px',
                    fontSize: '0.8rem',
                    padding: '14px',
                    borderRadius: '10px',
                    overflow: 'auto',
                    maxHeight: '160px',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    {JSON.stringify(selectedWorkflow.output, null, 2)}
                  </pre>
                </div>
              )}

              {selectedWorkflow.agent_logs && selectedWorkflow.agent_logs.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Agent Logs
                  </label>
                  <div style={{
                    marginTop: '6px',
                    maxHeight: '240px',
                    overflow: 'auto',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    {selectedWorkflow.agent_logs.map((log, index) => (
                      <div key={index} style={{
                        padding: '10px 14px',
                        borderBottom: index < selectedWorkflow.agent_logs!.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                          <span>{log.agent}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div style={{
                          fontSize: '0.85rem',
                          marginTop: '4px',
                          color: log.level === 'error' ? '#f87171' :
                                 log.level === 'warning' ? '#fbbf24' :
                                 log.level === 'success' ? '#4ade80' :
                                 'rgba(255,255,255,0.7)',
                        }}>
                          {log.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
