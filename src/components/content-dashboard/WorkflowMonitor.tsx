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
      
      if (!response.ok) throw new Error('Failed to fetch workflows')
      
      const data = await response.json()
      if (data.success) {
        setWorkflows(data.data)
        setSystemStatus(data.system_status)
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to fetch workflows:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Real-time updates
  useEffect(() => {
    fetchWorkflows()
    
    // Set up real-time subscription if supabase is available
    if (supabase) {
      const channel = supabase
        .channel('workflows_monitor')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'workflows' }, 
            (payload) => {
              console.log('Workflow updated:', payload)
              fetchWorkflows() // Refresh on changes
            }
        )
        .subscribe()

      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchWorkflows, 30000)

      return () => {
        channel.unsubscribe()
        clearInterval(interval)
      }
    } else {
      // Just auto-refresh if no supabase
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
        await fetchWorkflows() // Refresh list
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
        await fetchWorkflows() // Refresh list
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
        await fetchWorkflows() // Refresh list
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

  // Quick workflow triggers
  const quickWorkflows = [
    { type: 'content-machine', label: 'Generate Content', icon: <TrendingUp className="w-4 h-4" /> },
    { type: 'research-trends', label: 'Research Trends', icon: <Activity className="w-4 h-4" /> },
    { type: 'hook-generator', label: 'Generate Hooks', icon: <RefreshCw className="w-4 h-4" /> }
  ]

  if (loading && workflows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>Loading workflows...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and System Status */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Workflow Monitor
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            Real-time workflow execution and management
          </p>
        </div>
        
        {systemStatus && (
          <StatsPanel systemStatus={systemStatus} />
        )}
      </div>

      {/* Quick Actions */}
      <div 
        className="rounded-lg border p-6"
        style={{ 
          background: 'var(--bg-card)',
          borderColor: 'var(--border)'
        }}
      >
        <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickWorkflows.map((workflow) => (
            <button
              key={workflow.type}
              onClick={() => {
                triggerWorkflow(workflow.type, { 
                  topic: 'HVAC maintenance tips',
                  trade: 'HVAC' 
                })
              }}
              className="flex items-center p-3 border rounded-lg transition-colors hover:opacity-80"
              style={{ 
                borderColor: 'var(--border)',
                background: 'var(--bg-hover)'
              }}
            >
              {workflow.icon}
              <span className="ml-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                {workflow.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div 
        className="rounded-lg border p-4"
        style={{ 
          background: 'var(--bg-card)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="flex flex-wrap gap-4">
          <select 
            value={filters.status} 
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="border rounded-lg px-3 py-2"
            style={{ 
              borderColor: 'var(--border)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
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
            className="border rounded-lg px-3 py-2"
            style={{ 
              borderColor: 'var(--border)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="all">All Types</option>
            <option value="content-machine">Content Machine</option>
            <option value="research-trends">Research Trends</option>
            <option value="hook-generator">Hook Generator</option>
            <option value="batch-content">Batch Content</option>
          </select>

          <button
            onClick={fetchWorkflows}
            className="flex items-center px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ 
              background: 'var(--accent)',
              color: 'white'
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div 
          className="border rounded-lg p-4"
          style={{ 
            background: 'var(--error-bg)',
            borderColor: 'var(--error)'
          }}
        >
          <div className="flex items-center">
            <XCircle className="w-5 h-5 mr-2" style={{ color: 'var(--error)' }} />
            <span style={{ color: 'var(--error)' }}>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto hover:opacity-80"
              style={{ color: 'var(--error)' }}
            >
              ×
            </button>
          </div>
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
        <div className="text-center py-12">
          <Activity className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No workflows found</p>
        </div>
      )}

      {/* Workflow Detail Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div 
            className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md"
            style={{ 
              background: 'var(--bg-card)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                Workflow Details: {selectedWorkflow.name || selectedWorkflow.type}
              </h3>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    Type
                  </label>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {selectedWorkflow.type}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    Status
                  </label>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {selectedWorkflow.status}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    Created
                  </label>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {new Date(selectedWorkflow.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    Duration
                  </label>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {formatDuration(selectedWorkflow.actual_duration)}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  Input Parameters
                </label>
                <pre 
                  className="mt-1 text-sm p-3 rounded overflow-auto max-h-40"
                  style={{ 
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {JSON.stringify(selectedWorkflow.input, null, 2)}
                </pre>
              </div>
              
              {selectedWorkflow.output && (
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    Output
                  </label>
                  <pre 
                    className="mt-1 text-sm p-3 rounded overflow-auto max-h-40"
                    style={{ 
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {JSON.stringify(selectedWorkflow.output, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedWorkflow.agent_logs && selectedWorkflow.agent_logs.length > 0 && (
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    Agent Logs
                  </label>
                  <div 
                    className="mt-1 max-h-60 overflow-auto border rounded"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {selectedWorkflow.agent_logs.map((log, index) => (
                      <div key={index} className="p-2 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>{log.agent}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className={`text-sm mt-1 ${
                          log.level === 'error' ? 'text-red-600' : 
                          log.level === 'warning' ? 'text-yellow-600' :
                          log.level === 'success' ? 'text-green-600' :
                          ''
                        }`}
                        style={log.level === 'info' ? { color: 'var(--text-primary)' } : {}}
                        >
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