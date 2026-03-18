'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Toast } from '../../hooks/useRealTimeData'

type WorkflowFilter = 'all' | 'running' | 'completed' | 'failed' | 'queued'
type WorkflowSort = 'newest' | 'oldest' | 'priority' | 'duration'
type WizardStep = 1 | 2 | 3
type Priority = 'low' | 'normal' | 'high'
type Tone = 'professional' | 'casual' | 'persuasive' | 'educational'

interface WorkflowRecord {
  id: string
  name?: string | null
  type: string
  status: string
  runtime_status?: string | null
  input?: unknown
  output?: unknown
  agent_logs?: Array<{ agent?: string; timestamp?: string; level?: string; message?: string }> | null
  error_message?: string | null
  created_at: string
  started_at?: string | null
  completed_at?: string | null
  estimated_duration?: number | null
  actual_duration?: number | null
  runtime_duration?: number | null
  priority?: number | null
  progress?: number | null
}

interface SystemStatus {
  activeWorkflows: number
  queuedWorkflows: number
  utilizationRate: number
}

interface WorkflowHubProps {
  supabase: SupabaseClient | null
  showToast?: (toast: Omit<Toast, 'id'>) => string
}

interface WorkflowTemplate {
  id: string
  name: string
  type: string
  input: WorkflowInput
  createdAt: string
}

interface WorkflowInput {
  topic: string
  trade: string
  priority: number
  timeframe: string
  target_platforms: string[]
  tone: Tone
  custom_instructions: string
}

interface DraftState {
  type: string
  topic: string
  trade: string
  priority: Priority
  autoStart: boolean
  timeframe: string
  targetPlatforms: string[]
  tone: Tone
  customInstructions: string
}

interface OutputSection {
  key: string
  label: string
  content: string
}

interface WorkflowType {
  type: string
  title: string
  description: string
  eta: string
  icon: LucideIcon
}

const STORAGE_KEY = 'workflow-hub-templates'

const WORKFLOW_TYPES: WorkflowType[] = [
  { type: 'content-machine', title: 'Content Machine', description: 'Generate a full content suite.', eta: '~6 min', icon: Megaphone },
  { type: 'research-trends', title: 'Trend Research', description: 'Analyze trends and competitors.', eta: '~8 min', icon: Search },
  { type: 'hook-generator', title: 'Hook Generator', description: 'Generate hooks and CTAs.', eta: '~3 min', icon: CheckCircle2 },
  { type: 'batch-content', title: 'Batch Content', description: 'Bulk generate multiple pieces.', eta: '~12 min', icon: RotateCcw },
]

const TARGET_PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'Email']

const glassCard: CSSProperties = {
  borderRadius: '14px',
  background: 'rgba(15, 15, 26, 0.7)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.06)',
}

const inputStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#e2e8f0',
  padding: '10px 14px',
  width: '100%',
  outline: 'none',
}

const resetButton: CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer' }

const emptyDraft: DraftState = {
  type: '',
  topic: '',
  trade: '',
  priority: 'normal',
  autoStart: true,
  timeframe: 'last 30 days',
  targetPlatforms: ['LinkedIn', 'Email'],
  tone: 'professional',
  customInstructions: '',
}

function normalizeStatus(workflow: WorkflowRecord): string {
  return workflow.runtime_status || workflow.status || 'pending'
}

function isRunning(status: string): boolean {
  return status === 'running'
}

function isQueued(status: string): boolean {
  return status === 'queued' || status === 'pending'
}

function statusColor(status: string): string {
  if (status === 'running') return '#3b82f6'
  if (status === 'completed') return '#22c55e'
  if (status === 'failed') return '#ef4444'
  if (isQueued(status)) return '#eab308'
  return '#6b7280'
}

function labelize(value: string): string {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function relativeTime(value?: string | null): string {
  if (!value) return 'Unknown'
  const delta = Date.now() - new Date(value).getTime()
  if (delta < 60_000) return 'Now'
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m`
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h`
  return `${Math.floor(delta / 86_400_000)}d`
}

function fullDate(value?: string | null): string {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString()
}

function formatMinutes(value?: number | null): string {
  if (!value || value < 1) return '<1m'
  if (value < 60) return `${Math.round(value)}m`
  return `${Math.floor(value / 60)}h ${Math.round(value % 60)}m`
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((v) => asText(v)).join(', ')
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2)
  return '-'
}

function parseOutput(output: unknown): OutputSection[] {
  if (!output) return []
  if (typeof output === 'string') return [{ key: 'content', label: 'Generated Content', content: output }]
  const rec = toRecord(output)
  const order = ['email', 'linkedin', 'instagram', 'video_script', 'blog_outline']
  const seen = new Set<string>()
  const sections: OutputSection[] = []
  for (const key of order) {
    if (rec[key] !== undefined && rec[key] !== null) {
      sections.push({ key, label: labelize(key), content: asText(rec[key]) })
      seen.add(key)
    }
  }
  for (const [key, val] of Object.entries(rec)) {
    if (seen.has(key) || val === null || val === undefined) continue
    sections.push({ key, label: labelize(key), content: asText(val) })
  }
  return sections
}

function draftToInput(draft: DraftState): WorkflowInput {
  const priority = draft.priority === 'high' ? 2 : draft.priority === 'normal' ? 1 : 0
  return {
    topic: draft.topic.trim(),
    trade: draft.trade.trim(),
    priority,
    timeframe: draft.timeframe,
    target_platforms: draft.targetPlatforms,
    tone: draft.tone,
    custom_instructions: draft.customInstructions.trim(),
  }
}

export default function WorkflowHub({ supabase, showToast }: WorkflowHubProps) {
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<WorkflowFilter>('all')
  const [sort, setSort] = useState<WorkflowSort>('newest')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createMode, setCreateMode] = useState(false)
  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [draft, setDraft] = useState<DraftState>(emptyDraft)
  const [advanced, setAdvanced] = useState(false)
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set())
  const [selectedTab, setSelectedTab] = useState('')
  const [logsOpen, setLogsOpen] = useState(true)
  const [mobile, setMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const prevMap = useRef<Map<string, string>>(new Map())

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedId) || null,
    [workflows, selectedId],
  )
  const outputSections = useMemo(() => parseOutput(selectedWorkflow?.output), [selectedWorkflow?.output])

  useEffect(() => {
    if (!outputSections.length) return
    if (!outputSections.some((s) => s.key === selectedTab)) setSelectedTab(outputSections[0].key)
  }, [outputSections, selectedTab])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => {
      const next = window.innerWidth <= 1024
      setMobile(next)
      if (!next) setSidebarOpen(true)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as WorkflowTemplate[]
      if (Array.isArray(parsed)) setTemplates(parsed)
    } catch {
      showToast?.({ type: 'error', title: 'Template Error', message: 'Failed to load templates.' })
    }
  }, [showToast])

  const saveTemplates = useCallback((next: WorkflowTemplate[]) => {
    setTemplates(next)
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const fetchWorkflows = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true)
      else setLoading(true)
      const response = await fetch('/api/content-dashboard/workflows?limit=120', { cache: 'no-store' })
      const data = (await response.json()) as { success: boolean; data?: WorkflowRecord[]; system_status?: SystemStatus; error?: string }
      if (!data.success) throw new Error(data.error || 'Could not load workflows')
      const next = data.data || []
      setWorkflows(next)
      setSystemStatus(data.system_status || null)
      if (selectedId && !next.some((workflow) => workflow.id === selectedId)) setSelectedId(null)
      if (showToast && prevMap.current.size > 0) {
        for (const workflow of next) {
          const prev = prevMap.current.get(workflow.id)
          const current = normalizeStatus(workflow)
          if (!prev || prev === current) continue
          const title = workflow.name || labelize(workflow.type)
          if (current === 'completed') showToast({ type: 'success', title: 'Workflow Completed', message: title })
          if (current === 'failed') showToast({ type: 'error', title: 'Workflow Failed', message: title })
        }
      }
      prevMap.current = new Map(next.map((workflow) => [workflow.id, normalizeStatus(workflow)]))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load workflows')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedId, showToast])

  useEffect(() => { void fetchWorkflows() }, [fetchWorkflows])

  useEffect(() => {
    const interval = setInterval(() => { void fetchWorkflows(true) }, 10_000)
    let unsubscribed = false
    if (supabase) {
      const channel = supabase
        .channel('workflow_hub')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workflows' }, () => { void fetchWorkflows(true) })
        .subscribe()
      return () => {
        clearInterval(interval)
        if (!unsubscribed) {
          unsubscribed = true
          void channel.unsubscribe()
        }
      }
    }
    return () => clearInterval(interval)
  }, [fetchWorkflows, supabase])

  useEffect(() => {
    const running = workflows.filter((workflow) => isRunning(normalizeStatus(workflow))).map((workflow) => workflow.id)
    if (!running.length) return
    const poll = async () => {
      try {
        await fetch('/api/content-dashboard/workflows/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowIds: running }),
        })
      } catch {}
    }
    void poll()
    const interval = setInterval(() => { void poll() }, 5000)
    return () => clearInterval(interval)
  }, [workflows])

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase()
    return workflows
      .filter((workflow) => !clearedIds.has(workflow.id))
      .filter((workflow) => {
        const status = normalizeStatus(workflow)
        if (filter === 'all') return true
        if (filter === 'running') return status === 'running'
        if (filter === 'completed') return status === 'completed'
        if (filter === 'failed') return status === 'failed'
        return isQueued(status)
      })
      .filter((workflow) => {
        if (!text) return true
        const input = toRecord(workflow.input)
        return [
          workflow.name || '',
          workflow.type,
          workflow.id,
          typeof input.topic === 'string' ? input.topic : '',
          typeof input.trade === 'string' ? input.trade : '',
        ].join(' ').toLowerCase().includes(text)
      })
      .sort((a, b) => {
        if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        if (sort === 'priority') return (b.priority || 0) - (a.priority || 0)
        if (sort === 'duration') return ((b.actual_duration || b.runtime_duration || 0) - (a.actual_duration || a.runtime_duration || 0))
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [clearedIds, filter, search, sort, workflows])

  const stats = useMemo(() => {
    const cutoff = Date.now() - 86_400_000
    const completed = workflows.filter((workflow) => normalizeStatus(workflow) === 'completed' && (workflow.completed_at ? new Date(workflow.completed_at).getTime() >= cutoff : false))
    const failed = workflows.filter((workflow) => normalizeStatus(workflow) === 'failed' && (workflow.completed_at ? new Date(workflow.completed_at).getTime() >= cutoff : false))
    const rateBase = completed.length + failed.length
    const rate = rateBase > 0 ? Math.round((completed.length / rateBase) * 100) : 100
    const durations = completed.map((workflow) => workflow.actual_duration || workflow.runtime_duration || 0).filter((value) => value > 0)
    const avg = durations.length ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10 : 0
    return {
      active: systemStatus?.activeWorkflows ?? workflows.filter((workflow) => normalizeStatus(workflow) === 'running').length,
      queued: systemStatus?.queuedWorkflows ?? workflows.filter((workflow) => isQueued(normalizeStatus(workflow))).length,
      completed: completed.length,
      failed: failed.length,
      successRate: rate,
      avgDuration: avg,
    }
  }, [systemStatus, workflows])

  const outputText = useMemo(
    () => outputSections.map((section) => `--- ${section.label} ---\n\n${section.content}`).join('\n\n'),
    [outputSections],
  )

  const runAction = useCallback(async (key: string, fn: () => Promise<void>) => {
    setActionKey(key)
    try {
      await fn()
    } finally {
      setActionKey(null)
    }
  }, [])

  const handleCopy = useCallback(async (text: string, label: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      showToast?.({ type: 'success', title: 'Copied', message: `${label} copied.` })
    } catch {
      showToast?.({ type: 'error', title: 'Copy Failed', message: 'Clipboard was unavailable.' })
    }
  }, [showToast])

  const exportOutput = useCallback(async (mode: 'copy' | 'email' | 'download') => {
    if (!selectedWorkflow || !outputText) return
    if (mode === 'copy') {
      await handleCopy(outputText, 'All output')
      return
    }
    if (mode === 'email') {
      const subject = encodeURIComponent(`Workflow Output: ${selectedWorkflow.name || labelize(selectedWorkflow.type)}`)
      const body = encodeURIComponent(outputText)
      window.open(`mailto:?subject=${subject}&body=${body}`, '_self')
      return
    }
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = `workflow-${selectedWorkflow.id.slice(0, 8)}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }, [handleCopy, outputText, selectedWorkflow])

  const openCreate = useCallback(() => {
    setCreateMode(true)
    setSelectedId(null)
    if (mobile) setSidebarOpen(false)
  }, [mobile])

  const closeCreate = useCallback(() => {
    setCreateMode(false)
    setWizardStep(1)
    setAdvanced(false)
    setDraft(emptyDraft)
  }, [])

  const cancelWorkflow = useCallback(async (workflow: WorkflowRecord) => {
    await runAction(`cancel-${workflow.id}`, async () => {
      const response = await fetch(`/api/content-dashboard/workflows/${workflow.id}`, { method: 'DELETE' })
      const data = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !data.success) throw new Error(data.error || 'Cancel failed')
      showToast?.({ type: 'info', title: 'Workflow Cancelled', message: workflow.name || labelize(workflow.type) })
      await fetchWorkflows(true)
    })
  }, [fetchWorkflows, runAction, showToast])

  const retryWorkflow = useCallback(async (workflow: WorkflowRecord) => {
    await runAction(`retry-${workflow.id}`, async () => {
      const response = await fetch(`/api/content-dashboard/workflows/${workflow.id}/retry`, { method: 'POST' })
      const data = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !data.success) throw new Error(data.error || 'Retry failed')
      showToast?.({ type: 'success', title: 'Retry Started', message: workflow.name || labelize(workflow.type) })
      await fetchWorkflows(true)
    })
  }, [fetchWorkflows, runAction, showToast])

  const cloneWorkflow = useCallback((workflow: WorkflowRecord) => {
    const input = toRecord(workflow.input)
    const priorityVal = typeof input.priority === 'number' ? input.priority : workflow.priority || 1
    const priority: Priority = priorityVal >= 2 ? 'high' : priorityVal === 1 ? 'normal' : 'low'
    setDraft({
      type: workflow.type,
      topic: typeof input.topic === 'string' ? input.topic : '',
      trade: typeof input.trade === 'string' ? input.trade : '',
      priority,
      autoStart: true,
      timeframe: typeof input.timeframe === 'string' ? input.timeframe : 'last 30 days',
      targetPlatforms: Array.isArray(input.target_platforms) ? input.target_platforms.map((p) => asText(p)) : ['LinkedIn', 'Email'],
      tone: (typeof input.tone === 'string' ? input.tone : 'professional') as Tone,
      customInstructions: typeof input.custom_instructions === 'string' ? input.custom_instructions : '',
    })
    setWizardStep(2)
    setCreateMode(true)
    setSelectedId(null)
    if (mobile) setSidebarOpen(false)
    showToast?.({ type: 'info', title: 'Workflow Cloned', message: 'Review settings and launch.' })
  }, [mobile, showToast])

  const deleteWorkflow = useCallback(async (workflow: WorkflowRecord) => {
    if (!window.confirm(`Delete workflow "${workflow.name || labelize(workflow.type)}"?`)) return
    await runAction(`delete-${workflow.id}`, async () => {
      const response = await fetch(`/api/content-dashboard/workflows/${workflow.id}`, { method: 'DELETE' })
      const data = (await response.json()) as { success?: boolean; error?: string }
      if (response.ok && data.success) {
        showToast?.({ type: 'success', title: 'Workflow Removed', message: workflow.name || labelize(workflow.type) })
      } else {
        showToast?.({ type: 'info', title: 'Removed From View', message: 'Server delete is unavailable for this workflow state.' })
      }
      setClearedIds((prev) => {
        const next = new Set(prev)
        next.add(workflow.id)
        return next
      })
      if (selectedId === workflow.id) setSelectedId(null)
      await fetchWorkflows(true)
    })
  }, [fetchWorkflows, runAction, selectedId, showToast])

  const retryAllFailed = useCallback(async () => {
    const failed = visible.filter((workflow) => normalizeStatus(workflow) === 'failed')
    if (!failed.length) return
    await runAction('retry-all', async () => {
      let count = 0
      for (const workflow of failed) {
        try {
          const res = await fetch(`/api/content-dashboard/workflows/${workflow.id}/retry`, { method: 'POST' })
          const data = (await res.json()) as { success?: boolean }
          if (res.ok && data.success) count += 1
        } catch {}
      }
      showToast?.({ type: count > 0 ? 'success' : 'error', title: 'Retry All', message: `${count} workflows retried.` })
      await fetchWorkflows(true)
    })
  }, [fetchWorkflows, runAction, showToast, visible])

  const clearCompleted = useCallback(() => {
    const ids = workflows.filter((workflow) => normalizeStatus(workflow) === 'completed').map((workflow) => workflow.id)
    if (!ids.length) return
    setClearedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
    showToast?.({ type: 'info', title: 'Completed Cleared', message: `${ids.length} workflows removed from view.` })
  }, [showToast, workflows])

  const launchWorkflow = useCallback(async () => {
    if (!draft.type) {
      showToast?.({ type: 'error', title: 'Missing Type', message: 'Choose a workflow type.' })
      setWizardStep(1)
      return
    }
    if (!draft.topic.trim()) {
      showToast?.({ type: 'error', title: 'Missing Topic', message: 'Topic is required.' })
      setWizardStep(2)
      return
    }
    await runAction('launch', async () => {
      const response = await fetch('/api/content-dashboard/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: draft.type, input: draftToInput(draft), auto_start: draft.autoStart }),
      })
      const data = (await response.json()) as { success?: boolean; data?: WorkflowRecord; error?: string }
      if (!response.ok || !data.success || !data.data) throw new Error(data.error || 'Launch failed')
      showToast?.({ type: 'success', title: 'Workflow Launched', message: data.data.name || labelize(data.data.type) })
      closeCreate()
      setSelectedId(data.data.id)
      await fetchWorkflows(true)
    })
  }, [closeCreate, draft, fetchWorkflows, runAction, showToast])

  const saveTemplate = useCallback(() => {
    if (!draft.type || !draft.topic.trim()) {
      showToast?.({ type: 'error', title: 'Missing Data', message: 'Type and topic are required.' })
      return
    }
    const nextTemplate: WorkflowTemplate = {
      id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${labelize(draft.type)}: ${draft.topic.trim()}`.slice(0, 70),
      type: draft.type,
      input: draftToInput(draft),
      createdAt: new Date().toISOString(),
    }
    saveTemplates([nextTemplate, ...templates].slice(0, 25))
    showToast?.({ type: 'success', title: 'Template Saved', message: nextTemplate.name })
  }, [draft, saveTemplates, showToast, templates])

  const launchTemplate = useCallback(async (template: WorkflowTemplate) => {
    await runAction(`template-${template.id}`, async () => {
      const response = await fetch('/api/content-dashboard/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: template.type, input: template.input, auto_start: true }),
      })
      const data = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !data.success) throw new Error(data.error || 'Template launch failed')
      showToast?.({ type: 'success', title: 'Template Launched', message: template.name })
      await fetchWorkflows(true)
    })
  }, [fetchWorkflows, runAction, showToast])

  const removeTemplate = useCallback((templateId: string) => {
    saveTemplates(templates.filter((template) => template.id !== templateId))
  }, [saveTemplates, templates])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const el = event.target as HTMLElement | null
      const isInput = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
      if (event.key === 'Escape') {
        event.preventDefault()
        setSelectedId(null)
        closeCreate()
        return
      }
      if (isInput) return
      const key = event.key.toLowerCase()
      if (key === 'n') {
        event.preventDefault()
        openCreate()
        return
      }
      if (key === 'r' && selectedWorkflow && normalizeStatus(selectedWorkflow) === 'failed') {
        event.preventDefault()
        void retryWorkflow(selectedWorkflow)
        return
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!visible.length) return
        event.preventDefault()
        const current = visible.findIndex((workflow) => workflow.id === selectedId)
        const next = event.key === 'ArrowDown'
          ? (current + 1 + visible.length) % visible.length
          : (current - 1 + visible.length) % visible.length
        setSelectedId(visible[next].id)
        setCreateMode(false)
        if (mobile) setSidebarOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeCreate, mobile, openCreate, retryWorkflow, selectedId, selectedWorkflow, visible])

  const currentView: 'detail' | 'create' | 'empty' = createMode ? 'create' : selectedWorkflow ? 'detail' : 'empty'
  const failedCount = visible.filter((workflow) => normalizeStatus(workflow) === 'failed').length
  const activeOutput = outputSections.find((section) => section.key === selectedTab) || outputSections[0]

  const renderStat = (title: string, value: string | number, color: string, subtitle: string, bar?: number) => (
    <div style={{ ...glassCard, padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase' }}>{title}</span>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
      </div>
      <span style={{ color: '#e2e8f0', fontSize: '1.35rem', fontWeight: 700 }}>{value}</span>
      <span style={{ color: '#64748b', fontSize: '0.74rem' }}>{subtitle}</span>
      {typeof bar === 'number' && (
        <div style={{ width: '100%', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}>
          <div style={{ width: `${Math.max(0, Math.min(100, bar))}%`, height: '100%', borderRadius: '999px', background: '#22c55e' }} />
        </div>
      )}
    </div>
  )

  if (loading && workflows.length === 0) {
    return (
      <div style={{ ...glassCard, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#94a3b8' }}>
        <Loader2 size={18} style={{ animation: 'spin 0.9s linear infinite' }} />
        Loading workflows...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Workflow Hub</h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.84rem' }}>Real-time orchestration, execution, and workflow control center.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => void fetchWorkflows(true)} style={{ ...resetButton, ...glassCard, color: '#cbd5e1', padding: '8px 11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.9s linear infinite' : 'none' }} />
            Refresh
          </button>
          {mobile && (
            <button onClick={() => setSidebarOpen((open) => !open)} style={{ ...resetButton, ...glassCard, color: '#cbd5e1', padding: '8px 11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              {sidebarOpen ? 'Hide List' : 'Show List'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '8px' }}>
        {renderStat('Active', stats.active, '#3b82f6', 'Running now')}
        {renderStat('Queued', stats.queued, '#eab308', 'Waiting')}
        {renderStat('Completed', stats.completed, '#22c55e', 'Last 24h')}
        {renderStat('Failed', stats.failed, '#ef4444', 'Last 24h')}
        {renderStat('Success Rate', `${stats.successRate}%`, '#22c55e', 'Completion ratio', stats.successRate)}
        {renderStat('Avg Duration', `${stats.avgDuration.toFixed(1)}m`, '#64748b', 'Recent')}
      </div>

      {error && (
        <div style={{ ...glassCard, padding: '10px 12px', borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(48,16,22,0.6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={15} color="#ef4444" />
          <span style={{ color: '#fecaca', fontSize: '0.82rem' }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: '10px', alignItems: 'stretch' }}>
        {(!mobile || sidebarOpen) && (
          <aside style={{ ...glassCard, width: mobile ? '100%' : '280px', minWidth: mobile ? '100%' : '280px', maxHeight: mobile ? 'none' : '73vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workflows..." style={{ ...inputStyle, paddingLeft: '30px', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                {(['all', 'running', 'completed', 'failed', 'queued'] as WorkflowFilter[]).map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setFilter(chip)}
                    style={{
                      ...resetButton,
                      padding: '5px 9px',
                      borderRadius: '999px',
                      background: filter === chip ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.08)',
                      color: filter === chip ? '#fff' : '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                    }}
                  >
                    {chip === 'all' ? 'All' : chip[0].toUpperCase() + chip.slice(1)}
                  </button>
                ))}
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value as WorkflowSort)} style={{ ...inputStyle, fontSize: '0.78rem', padding: '7px 10px' }}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="priority">Priority</option>
                <option value="duration">Duration</option>
              </select>
            </div>

            <div style={{ padding: '8px 10px 0', color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase' }}>Workflows ({visible.length})</div>
            <div style={{ padding: '8px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {!visible.length && <div style={{ ...glassCard, padding: '12px', color: '#94a3b8', fontSize: '0.8rem' }}>No workflows match this filter.</div>}
              {visible.map((workflow) => {
                const status = normalizeStatus(workflow)
                const selected = workflow.id === selectedId && !createMode
                return (
                  <button
                    key={workflow.id}
                    onClick={() => {
                      setSelectedId(workflow.id)
                      setCreateMode(false)
                      if (mobile) setSidebarOpen(false)
                    }}
                    style={{
                      ...resetButton,
                      ...glassCard,
                      textAlign: 'left',
                      padding: '9px',
                      borderColor: selected ? 'rgba(102,126,234,0.45)' : 'rgba(255,255,255,0.06)',
                      background: selected ? 'linear-gradient(135deg, rgba(102,126,234,0.18) 0%, rgba(118,75,162,0.12) 100%)' : 'rgba(15,15,26,0.65)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor(status), flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {workflow.name || labelize(workflow.type)}
                        </span>
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.71rem' }}>{relativeTime(workflow.created_at)}</span>
                    </div>
                    <div style={{ marginTop: '5px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', padding: '2px 7px', color: '#94a3b8', fontSize: '0.68rem' }}>{labelize(workflow.type)}</span>
                      <span style={{ color: statusColor(status), fontSize: '0.68rem', fontWeight: 700 }}>{labelize(status)}</span>
                    </div>
                    {isRunning(status) && (
                      <div style={{ marginTop: '7px', width: '100%', height: '5px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}>
                        <div style={{ width: `${Math.max(0, Math.min(100, workflow.progress || 0))}%`, height: '100%', borderRadius: '999px', background: '#3b82f6' }} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '9px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase' }}>Templates</span>
              {!templates.length && <span style={{ color: '#64748b', fontSize: '0.76rem' }}>No templates saved.</span>}
              {templates.map((template) => (
                <div key={template.id} style={{ ...glassCard, padding: '7px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => void launchTemplate(template)} style={{ ...resetButton, color: '#cbd5e1', fontSize: '0.74rem', textAlign: 'left', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={template.name}>
                    {template.name}
                  </button>
                  <button onClick={() => removeTemplate(template.id)} style={{ ...resetButton, color: '#fca5a5' }} title="Delete template">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}
        <section style={{ ...glassCard, flex: 1, minHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
              {currentView === 'detail' && selectedWorkflow ? `Workflow Detail · ${selectedWorkflow.id.slice(0, 8)}` : currentView === 'create' ? 'Create New Workflow' : 'No Workflow Selected'}
            </span>
            {currentView === 'create' && <button onClick={closeCreate} style={{ ...resetButton, color: '#94a3b8', fontSize: '0.8rem' }}><XCircle size={14} /></button>}
          </div>
          <div style={{ padding: '14px', flex: 1, overflowY: 'auto' }}>
            {currentView === 'detail' && selectedWorkflow && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ ...glassCard, padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.02rem' }}>{selectedWorkflow.name || labelize(selectedWorkflow.type)}</h3>
                      <div style={{ marginTop: '5px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: '0.72rem', padding: '3px 8px' }}>{labelize(selectedWorkflow.type)}</span>
                        <span style={{ borderRadius: '999px', background: `${statusColor(normalizeStatus(selectedWorkflow))}22`, color: statusColor(normalizeStatus(selectedWorkflow)), fontSize: '0.72rem', padding: '3px 8px' }}>{labelize(normalizeStatus(selectedWorkflow))}</span>
                      </div>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.74rem', textAlign: 'right' }}>
                      <div>Created: {fullDate(selectedWorkflow.created_at)}</div>
                      <div>Duration: {formatMinutes(selectedWorkflow.actual_duration || selectedWorkflow.runtime_duration || selectedWorkflow.estimated_duration)}</div>
                    </div>
                  </div>
                </div>

                {isRunning(normalizeStatus(selectedWorkflow)) && (
                  <div style={{ ...glassCard, padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                      <span>Progress: {Math.round(selectedWorkflow.progress || 0)}%</span>
                      <span>Stage: {(selectedWorkflow.progress || 0) < 25 ? 'Researching' : (selectedWorkflow.progress || 0) < 60 ? 'Generating' : (selectedWorkflow.progress || 0) < 90 ? 'Reviewing' : 'Finalizing'} → Complete</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{ width: `${Math.max(0, Math.min(100, selectedWorkflow.progress || 0))}%`, height: '100%', borderRadius: '999px', background: '#3b82f6' }} />
                    </div>
                  </div>
                )}

                <div style={{ ...glassCard, padding: '12px' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#cbd5e1' }}>Input Parameters</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(2,minmax(0,1fr))', gap: '7px' }}>
                    {Object.entries(toRecord(selectedWorkflow.input)).map(([key, value]) => (
                      <div key={key} style={{ ...glassCard, padding: '8px' }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.71rem' }}>{labelize(key)}</div>
                        <div style={{ color: '#e2e8f0', fontSize: '0.78rem', marginTop: '3px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{asText(value)}</div>
                      </div>
                    ))}
                    {!Object.keys(toRecord(selectedWorkflow.input)).length && <div style={{ color: '#64748b', fontSize: '0.78rem' }}>No input values recorded.</div>}
                  </div>
                </div>

                {!!outputSections.length && (
                  <div style={{ ...glassCard, padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>Output</h4>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={() => void handleCopy(outputText, 'All output')} style={{ ...resetButton, background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', borderRadius: '7px', padding: '5px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Copy size={12} />
                          Copy All
                        </button>
                        <select onChange={(e) => { const val = e.target.value as 'copy' | 'email' | 'download' | ''; if (val) void exportOutput(val); e.target.value = '' }} style={{ ...inputStyle, fontSize: '0.72rem', padding: '6px 8px' }}>
                          <option value="">Export</option>
                          <option value="copy">Copy</option>
                          <option value="email">Email</option>
                          <option value="download">Download .txt</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {outputSections.map((section) => (
                        <button key={section.key} onClick={() => setSelectedTab(section.key)} style={{ ...resetButton, padding: '5px 8px', borderRadius: '999px', fontSize: '0.7rem', background: selectedTab === section.key ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.08)', color: selectedTab === section.key ? '#fff' : '#94a3b8' }}>
                          {section.label}
                        </button>
                      ))}
                    </div>
                    {activeOutput && (
                      <div style={{ ...glassCard, padding: '9px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 600 }}>{activeOutput.label}</span>
                          <button onClick={() => void handleCopy(activeOutput.content, activeOutput.label)} style={{ ...resetButton, background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', borderRadius: '6px', padding: '4px 6px', fontSize: '0.7rem' }}>Copy</button>
                        </div>
                        <pre style={{ margin: 0, fontSize: '0.77rem', color: '#d1d5db', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.55 }}>{activeOutput.content}</pre>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ ...glassCard, padding: '12px' }}>
                  <button onClick={() => setLogsOpen((open) => !open)} style={{ ...resetButton, width: '100%', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                    Agent Logs
                    {logsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  {logsOpen && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {(selectedWorkflow.agent_logs || []).map((log, index) => (
                        <div key={`${log.timestamp || 'log'}-${index}`} style={{ ...glassCard, padding: '7px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.69rem' }}>
                            <span>{log.agent || 'workflow-engine'}</span>
                            <span>{fullDate(log.timestamp)}</span>
                          </div>
                          <div style={{ marginTop: '3px', color: log.level === 'error' ? '#fca5a5' : log.level === 'warning' ? '#fcd34d' : '#d1d5db', fontSize: '0.78rem' }}>
                            {log.message || 'No message'}
                          </div>
                        </div>
                      ))}
                      {!(selectedWorkflow.agent_logs || []).length && <span style={{ color: '#64748b', fontSize: '0.76rem' }}>No logs available.</span>}
                    </div>
                  )}
                </div>

                <div style={{ ...glassCard, padding: '10px', display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {isRunning(normalizeStatus(selectedWorkflow)) && <button onClick={() => void cancelWorkflow(selectedWorkflow)} disabled={actionKey === `cancel-${selectedWorkflow.id}`} style={{ ...resetButton, background: 'rgba(239,68,68,0.2)', color: '#fecaca', padding: '7px 10px', borderRadius: '7px', fontSize: '0.76rem' }}>Cancel</button>}
                  {normalizeStatus(selectedWorkflow) === 'failed' && <button onClick={() => void retryWorkflow(selectedWorkflow)} disabled={actionKey === `retry-${selectedWorkflow.id}`} style={{ ...resetButton, background: 'rgba(234,179,8,0.2)', color: '#fef08a', padding: '7px 10px', borderRadius: '7px', fontSize: '0.76rem' }}>Retry</button>}
                  <button onClick={() => cloneWorkflow(selectedWorkflow)} style={{ ...resetButton, background: 'rgba(102,126,234,0.2)', color: '#c7d2fe', padding: '7px 10px', borderRadius: '7px', fontSize: '0.76rem' }}>Clone</button>
                  <button onClick={() => void deleteWorkflow(selectedWorkflow)} disabled={actionKey === `delete-${selectedWorkflow.id}`} style={{ ...resetButton, background: 'rgba(248,113,113,0.2)', color: '#fecaca', padding: '7px 10px', borderRadius: '7px', fontSize: '0.76rem' }}>Delete</button>
                </div>
              </div>
            )}
            {currentView === 'create' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ ...glassCard, padding: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[1, 2, 3].map((step) => (
                    <button key={step} onClick={() => setWizardStep(step as WizardStep)} style={{ ...resetButton, background: wizardStep === step ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.08)', color: wizardStep === step ? '#fff' : '#94a3b8', borderRadius: '999px', padding: '6px 10px', fontSize: '0.74rem', fontWeight: 600 }}>
                      {step === 1 ? 'Choose Type' : step === 2 ? 'Configure' : 'Review & Launch'}
                    </button>
                  ))}
                </div>

                {wizardStep === 1 && (
                  <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(2,minmax(0,1fr))', gap: '8px' }}>
                    {WORKFLOW_TYPES.map((type) => {
                      const Icon = type.icon
                      const selected = draft.type === type.type
                      return (
                        <button key={type.type} onClick={() => { setDraft((prev) => ({ ...prev, type: type.type })); setWizardStep(2) }} style={{ ...resetButton, ...glassCard, textAlign: 'left', padding: '11px', borderColor: selected ? 'rgba(102,126,234,0.45)' : 'rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <Icon size={16} color={selected ? '#c7d2fe' : '#94a3b8'} />
                            <span style={{ color: '#64748b', fontSize: '0.68rem' }}>{type.eta}</span>
                          </div>
                          <div style={{ color: '#e2e8f0', fontSize: '0.82rem', fontWeight: 700 }}>{type.title}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.73rem', marginTop: '3px' }}>{type.description}</div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {wizardStep === 2 && (
                  <div style={{ ...glassCard, padding: '11px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    <div>
                      <label style={{ color: '#94a3b8', fontSize: '0.76rem', display: 'block', marginBottom: '4px' }}>Topic *</label>
                      <input value={draft.topic} onChange={(e) => setDraft((prev) => ({ ...prev, topic: e.target.value }))} style={inputStyle} placeholder="What is the workflow about?" />
                    </div>
                    <div>
                      <label style={{ color: '#94a3b8', fontSize: '0.76rem', display: 'block', marginBottom: '4px' }}>Trade / Industry</label>
                      <input value={draft.trade} onChange={(e) => setDraft((prev) => ({ ...prev, trade: e.target.value }))} style={inputStyle} placeholder="Optional" />
                    </div>
                    <div>
                      <label style={{ color: '#94a3b8', fontSize: '0.76rem', display: 'block', marginBottom: '4px' }}>Priority</label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(['low', 'normal', 'high'] as Priority[]).map((p) => (
                          <button key={p} onClick={() => setDraft((prev) => ({ ...prev, priority: p }))} style={{ ...resetButton, padding: '6px 10px', borderRadius: '999px', background: draft.priority === p ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.08)', color: draft.priority === p ? '#fff' : '#94a3b8', fontSize: '0.73rem' }}>{p[0].toUpperCase() + p.slice(1)}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ ...glassCard, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#cbd5e1', fontSize: '0.76rem' }}>Auto-start</span>
                      <button onClick={() => setDraft((prev) => ({ ...prev, autoStart: !prev.autoStart }))} style={{ ...resetButton, width: '40px', height: '20px', borderRadius: '999px', background: draft.autoStart ? '#22c55e' : 'rgba(255,255,255,0.2)', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '2px', left: draft.autoStart ? '22px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff' }} />
                      </button>
                    </div>
                    <button onClick={() => setAdvanced((open) => !open)} style={{ ...resetButton, color: '#94a3b8', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <ChevronDown size={14} style={{ transform: advanced ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                      Advanced options
                    </button>
                    {advanced && (
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <select value={draft.timeframe} onChange={(e) => setDraft((prev) => ({ ...prev, timeframe: e.target.value }))} style={inputStyle}>
                          <option value="last 7 days">Last 7 days</option>
                          <option value="last 30 days">Last 30 days</option>
                          <option value="last 90 days">Last 90 days</option>
                        </select>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {TARGET_PLATFORMS.map((platform) => {
                            const checked = draft.targetPlatforms.includes(platform)
                            return (
                              <button key={platform} onClick={() => setDraft((prev) => ({ ...prev, targetPlatforms: checked ? prev.targetPlatforms.filter((v) => v !== platform) : [...prev.targetPlatforms, platform] }))} style={{ ...resetButton, borderRadius: '999px', padding: '5px 9px', background: checked ? 'rgba(59,130,246,0.24)' : 'rgba(255,255,255,0.08)', color: checked ? '#bfdbfe' : '#94a3b8', fontSize: '0.72rem' }}>
                                {platform}
                              </button>
                            )
                          })}
                        </div>
                        <select value={draft.tone} onChange={(e) => setDraft((prev) => ({ ...prev, tone: e.target.value as Tone }))} style={inputStyle}>
                          <option value="professional">Professional</option>
                          <option value="casual">Casual</option>
                          <option value="persuasive">Persuasive</option>
                          <option value="educational">Educational</option>
                        </select>
                        <textarea value={draft.customInstructions} onChange={(e) => setDraft((prev) => ({ ...prev, customInstructions: e.target.value }))} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Custom instructions" />
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                      <button onClick={() => setWizardStep(1)} style={{ ...resetButton, background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', borderRadius: '7px', padding: '7px 10px', fontSize: '0.76rem' }}>Back</button>
                      <button onClick={() => setWizardStep(3)} style={{ ...resetButton, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', borderRadius: '7px', padding: '7px 10px', fontSize: '0.76rem', fontWeight: 600 }}>Review</button>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div style={{ ...glassCard, padding: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(2,minmax(0,1fr))', gap: '6px' }}>
                      {[
                        ['Type', labelize(draft.type || 'not set')],
                        ['Topic', draft.topic || 'not set'],
                        ['Trade', draft.trade || 'N/A'],
                        ['Priority', draft.priority],
                        ['Timeframe', draft.timeframe],
                        ['Platforms', draft.targetPlatforms.join(', ') || 'N/A'],
                      ].map(([k, v]) => (
                        <div key={k} style={{ ...glassCard, padding: '8px' }}>
                          <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{k}</div>
                          <div style={{ color: '#e2e8f0', fontSize: '0.78rem', marginTop: '3px' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {!!draft.customInstructions && <pre style={{ ...glassCard, padding: '8px', margin: 0, fontSize: '0.76rem', color: '#d1d5db', whiteSpace: 'pre-wrap' }}>{draft.customInstructions}</pre>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => setWizardStep(2)} style={{ ...resetButton, background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', borderRadius: '7px', padding: '7px 10px', fontSize: '0.76rem' }}>Back</button>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={saveTemplate} style={{ ...resetButton, background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', borderRadius: '7px', padding: '7px 10px', fontSize: '0.76rem' }}>Save as Template</button>
                        <button onClick={() => void launchWorkflow()} disabled={actionKey === 'launch'} style={{ ...resetButton, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', borderRadius: '7px', padding: '7px 10px', fontSize: '0.76rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', opacity: actionKey === 'launch' ? 0.8 : 1 }}>
                          {actionKey === 'launch' && <Loader2 size={12} style={{ animation: 'spin 0.9s linear infinite' }} />}
                          Launch Workflow
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {currentView === 'empty' && (
              <div style={{ minHeight: '56vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '11px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(102,126,234,0.22) 0%, rgba(118,75,162,0.22) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Megaphone size={26} color="#c7d2fe" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Select a workflow or create a new one</h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', maxWidth: '420px' }}>Use the sidebar list, or quick-start a workflow type below.</p>
                <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(2,minmax(0,1fr))', gap: '7px', width: '100%', maxWidth: '700px' }}>
                  {WORKFLOW_TYPES.map((type) => {
                    const Icon = type.icon
                    return (
                      <button key={type.type} onClick={() => { setDraft((prev) => ({ ...prev, type: type.type })); setWizardStep(2); openCreate() }} style={{ ...resetButton, ...glassCard, textAlign: 'left', padding: '10px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <Icon size={16} color="#c7d2fe" />
                        <div>
                          <div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 700 }}>{type.title}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '2px' }}>{type.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <div style={{ ...glassCard, position: 'sticky', bottom: 0, zIndex: 20, padding: '9px', display: 'flex', justifyContent: 'space-between', gap: '7px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
          <button onClick={openCreate} style={{ ...resetButton, borderRadius: '7px', padding: '7px 10px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', fontSize: '0.76rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Plus size={12} />
            New Workflow
          </button>
          {failedCount > 0 && (
            <button onClick={() => void retryAllFailed()} disabled={actionKey === 'retry-all'} style={{ ...resetButton, borderRadius: '7px', padding: '7px 10px', background: 'rgba(234,179,8,0.2)', color: '#fef08a', fontSize: '0.76rem' }}>
              Retry All Failed
            </button>
          )}
          <button onClick={clearCompleted} style={{ ...resetButton, borderRadius: '7px', padding: '7px 10px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: '0.76rem' }}>
            Clear Completed
          </button>
        </div>
        <button onClick={() => void fetchWorkflows(true)} style={{ ...resetButton, width: '33px', height: '33px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={13} />
        </button>
      </div>
    </div>
  )
}
