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

export default function WorkflowCard({ 
  workflow, 
  onView,
  onCancel, 
  onRetry,
  getStatusDisplay,
  formatDuration
}: WorkflowCardProps) {
  const [showActions, setShowActions] = useState(false)
  
  // Use provided status display function or fallback to default
  const statusDisplay = getStatusDisplay ? getStatusDisplay(workflow) : {
    color: 'text-gray-600 bg-gray-100',
    icon: <Clock className="w-4 h-4" />,
    label: workflow.status
  }

  // Use provided format function or fallback to default
  const formatTime = formatDuration || ((minutes?: number) => {
    if (!minutes) return 'N/A'
    if (minutes < 60) return `${Math.round(minutes)}m`
    return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}m`
  })

  const canCancel = workflow.status === 'running' || workflow.status === 'queued'
  const canRetry = workflow.status === 'failed'

  return (
    <div 
      className="rounded-lg border transition-colors hover:shadow-lg relative"
      style={{ 
        background: 'var(--bg-card)',
        borderColor: 'var(--border)'
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`rounded-full px-2 py-1 flex items-center space-x-1 ${statusDisplay.color}`}>
              {statusDisplay.icon}
              <span className="text-xs font-medium">{statusDisplay.label}</span>
            </div>
            
            {workflow.queue_position && (
              <span 
                className="text-xs px-2 py-1 rounded-full"
                style={{ 
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)'
                }}
              >
                #{workflow.queue_position}
              </span>
            )}
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showActions && (
              <div 
                className="absolute right-0 mt-1 py-1 rounded-lg border shadow-lg z-10 min-w-[120px]"
                style={{ 
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)'
                }}
              >
                {onView && (
                  <button
                    onClick={() => { onView(); setShowActions(false) }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center space-x-2 transition-colors"
                    style={{ 
                      color: 'var(--text-primary)',
                      ':hover': { background: 'var(--bg-hover)' }
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                )}
                
                {canCancel && onCancel && (
                  <button
                    onClick={() => { onCancel(); setShowActions(false) }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center space-x-2 transition-colors text-red-500"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                )}
                
                {canRetry && onRetry && (
                  <button
                    onClick={() => { onRetry(); setShowActions(false) }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center space-x-2 transition-colors text-blue-500"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Workflow Info */}
        <div className="space-y-2">
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {workflow.name || workflow.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h3>
          
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {workflow.type} • {workflow.id.slice(0, 8)}
          </p>

          {/* Error Message */}
          {workflow.error_message && (
            <div 
              className="text-sm p-2 rounded border-l-4"
              style={{ 
                background: 'var(--error-bg)',
                borderColor: 'var(--error)',
                color: 'var(--error)'
              }}
            >
              {workflow.error_message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(workflow.created_at).toLocaleString()}
          </span>
          
          {(workflow.actual_duration || workflow.runtime_duration) && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatTime(workflow.actual_duration || workflow.runtime_duration)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
