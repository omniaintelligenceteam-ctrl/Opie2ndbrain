'use client'

import {
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  StopCircle,
  RefreshCw,
  MoreVertical
} from 'lucide-react'
import { useState } from 'react'

interface Workflow {
  id: string
  name?: string
  type: string
  status: string
  runtime_status?: string
  created_at: string
  started_at?: string
  actual_duration?: number
  runtime_duration?: number
  error_message?: string
  queue_position?: number
  progress?: number
}

interface WorkflowCardProps {
  workflow: Workflow
  onView?: () => void
  onCancel?: () => void
  onRetry?: () => void
  getStatusDisplay?: (workflow: Workflow) => {
    color: string
    icon: React.ReactNode
    label: string
  }
  formatDuration?: (minutes?: number) => string
}

const STATUS_COLORS: Record<string, string> = {
  running: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444',
  queued: '#eab308',
  pending: '#6b7280',
}

export default function WorkflowCard({
  workflow,
  onView,
  onCancel,
  onRetry,
  getStatusDisplay,
  formatDuration
}: WorkflowCardProps) {
  const [showActions, setShowActions] = useState(false)

  const statusDisplay = getStatusDisplay ? getStatusDisplay(workflow) : {
    color: 'text-gray-600 bg-gray-100',
    icon: <Clock className="w-4 h-4" />,
    label: workflow.status
  }

  const formatTime = formatDuration || ((minutes?: number) => {
    if (!minutes) return 'N/A'
    if (minutes < 60) return `${Math.round(minutes)}m`
    return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}m`
  })

  const canCancel = workflow.status === 'running' || workflow.status === 'queued'
  const canRetry = workflow.status === 'failed'
  const runtimeStatus = workflow.runtime_status || workflow.status
  const borderColor = STATUS_COLORS[runtimeStatus] || '#6b7280'

  return (
    <div
      className="card-hover"
      style={{
        borderRadius: '14px',
        background: 'rgba(15, 15, 26, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeft: `3px solid ${borderColor}`,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
      }}
    >
      <div style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className={`rounded-full px-2 py-1 flex items-center space-x-1 ${statusDisplay.color}`}>
              {statusDisplay.icon}
              <span className="text-xs font-medium">{statusDisplay.label}</span>
            </div>

            {workflow.queue_position && (
              <span style={{
                fontSize: '0.75rem',
                padding: '3px 8px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.45)',
              }}>
                #{workflow.queue_position}
              </span>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowActions(!showActions)}
              style={{
                padding: '4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.35)',
                transition: 'color 0.2s',
              }}
            >
              <MoreVertical size={16} />
            </button>

            {showActions && (
              <div style={{
                position: 'absolute',
                right: 0,
                marginTop: '4px',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(15, 15, 26, 0.95)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                zIndex: 10,
                minWidth: '130px',
              }}>
                {onView && (
                  <button
                    onClick={() => { onView(); setShowActions(false) }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.7)',
                      transition: 'background 0.15s',
                    }}
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                )}

                {canCancel && onCancel && (
                  <button
                    onClick={() => { onCancel(); setShowActions(false) }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#f87171',
                      transition: 'background 0.15s',
                    }}
                  >
                    <StopCircle size={14} />
                    Cancel
                  </button>
                )}

                {canRetry && onRetry && (
                  <button
                    onClick={() => { onRetry(); setShowActions(false) }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#60a5fa',
                      transition: 'background 0.15s',
                    }}
                  >
                    <RefreshCw size={14} />
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Workflow Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{
            fontWeight: 600,
            fontSize: '1rem',
            color: '#fff',
            letterSpacing: '-0.01em',
          }}>
            {workflow.name || workflow.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h3>

          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
            {workflow.type} • {workflow.id.slice(0, 8)}
          </p>

          {/* Error Message */}
          {workflow.error_message && (
            <div style={{
              fontSize: '0.8rem',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              borderLeft: '3px solid #ef4444',
              color: '#f87171',
            }}>
              {workflow.error_message}
            </div>
          )}

          {/* Progress Bar */}
          {(runtimeStatus === 'running' || runtimeStatus === 'pending') && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Progress</span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{workflow.progress || 0}%</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: '3px',
                  width: `${workflow.progress || 0}%`,
                  background: runtimeStatus === 'running' ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.15)',
                  transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                }} />
              </div>
            </div>
          )}
          {runtimeStatus === 'completed' && (
            <div style={{ marginTop: '12px', height: '6px', borderRadius: '3px', background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' }} />
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
            {new Date(workflow.created_at).toLocaleString()}
          </span>

          {(workflow.actual_duration || workflow.runtime_duration) && (
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
              {formatTime(workflow.actual_duration || workflow.runtime_duration)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
