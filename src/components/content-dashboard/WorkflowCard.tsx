'use client'

import { 
  PlayCircle, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'

interface Workflow {
  id: string
  name?: string
  type: string
  status: string
  created_at: string
  started_at?: string
  actual_duration?: number
}

interface WorkflowCardProps {
  workflow: Workflow
}

export default function WorkflowCard({ workflow }: WorkflowCardProps) {
  const getStatusIcon = () => {
    switch (workflow.status) {
      case 'running':
        return <PlayCircle className="w-5 h-5 text-blue-400" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />
    }
  }

  const getStatusColor = () => {
    switch (workflow.status) {
      case 'running':
        return 'border-blue-500/30 bg-blue-500/10'
      case 'completed':
        return 'border-green-500/30 bg-green-500/10'
      case 'failed':
        return 'border-red-500/30 bg-red-500/10'
      default:
        return 'border-yellow-500/30 bg-yellow-500/10'
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h4 className="font-medium text-sm">{workflow.name || workflow.type}</h4>
            <p className="text-xs text-gray-400">ID: {workflow.id.slice(0, 8)}...</p>
          </div>
        </div>
        <span className="text-xs capitalize px-2 py-1 rounded-full bg-gray-800">
          {workflow.status}
        </span>
      </div>
      {workflow.actual_duration && (
        <p className="text-xs text-gray-400 mt-2">
          Duration: {formatDuration(workflow.actual_duration)}
        </p>
      )}
    </div>
  )
}
