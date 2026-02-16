'use client'

import React from 'react'
import {
  Eye,
  XCircle,
  RefreshCw
} from 'lucide-react'

interface Workflow {
  id: string
  name?: string
  type: string
  status: string
  runtime_status?: string
  created_at: string
  started_at?: string
  actual_duration?: number
}

interface WorkflowCardProps {
  workflow: Workflow
  onView: () => void
  onCancel: () => Promise<any>
  onRetry: () => Promise<any>
  getStatusDisplay: (workflow: Workflow) => { color: string; icon: React.ReactNode; label: string }
  formatDuration: (minutes?: number) => string
}

export default function WorkflowCard({
  workflow,
  onView,
  onCancel,
  onRetry,
  getStatusDisplay,
  formatDuration
}: WorkflowCardProps) {
  const status = getStatusDisplay(workflow)

  return (
    <div
      className="p-4 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {status.icon}
          <div>
            <h4 className="font-medium text-sm">{workflow.name || workflow.type}</h4>
            <p className="text-xs text-gray-400">ID: {workflow.id.slice(0, 8)}...</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
          {status.label}
        </span>
      </div>

      {workflow.actual_duration != null && (
        <p className="text-xs text-gray-400 mb-3">
          Duration: {formatDuration(workflow.actual_duration)}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Eye className="w-3 h-3" /> View
        </button>
        {(workflow.status === 'running' || workflow.status === 'queued') && (
          <button
            onClick={(e) => { e.stopPropagation(); onCancel(); }}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <XCircle className="w-3 h-3" /> Cancel
          </button>
        )}
        {workflow.status === 'failed' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRetry(); }}
            className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        )}
      </div>
    </div>
  )
}
