'use client'

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  FileText,
  Video,
  Image as ImageIcon,
  Mail,
  TrendingUp,
  Plus,
  Eye,
  X,
  Loader,
  Copy,
  Download,
  Bookmark,
  FileUp,
  Trash2,
  Film,
  FolderOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  Zap,
  FlaskConical,
  BarChart3,
  Calendar,
  Settings2,
  Search,
  MessageSquare,
} from 'lucide-react'
import type { Toast } from '../../hooks/useRealTimeData'
import { useTheme } from '../../contexts/ThemeContext'
import { Badge, Button, Input, EmptyState, SkeletonMetricCard, SkeletonList, Alert, AlertDescription } from '../ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui'
import VideoPlayer from './VideoPlayer'
import { ResearchPanel } from './ResearchPanel'
import { AssetCompare } from './AssetCompare'

const ABTestView = lazy(() => import('./ABTestView'))
const ScheduleView = lazy(() => import('./ScheduleView'))
const IntegrationsView = lazy(() => import('./IntegrationsView'))

interface ContentBundle {
  id: string
  topic: string
  trade?: string
  quality_score: number
  status: string
  created_at: string
  research_findings?: Record<string, unknown>
  research_progress?: {
    stage: string
    message: string
    progress_percent: number
    details?: Record<string, unknown>
  }
  strategy_doc?: Record<string, unknown>
}

interface ContentAsset {
  id: string
  bundle_id: string
  type: string
  content: string
  status: string
  metadata: Record<string, unknown> | null
  research_influence?: Record<string, string> | null
  version?: number
  created_at: string
}

interface AssetCounts {
  email: number
  linkedin: number
  heygen: number
  image: number
}

interface ContentStudioProps {
  supabase: SupabaseClient | null
  onRefresh?: () => void
  showToast?: (toast: Omit<Toast, 'id'>) => string
}

const ASSET_COLORS = ['#a855f7', '#06b6d4', '#f97316', '#22c55e']

const INDUSTRY_SUGGESTIONS = [
  'HVAC', 'Plumbing', 'Electrical', 'Roofing',
  'General Contracting', 'Landscaping', 'Painting', 'Solar',
  'Cleaning Services', 'Pest Control', 'Real Estate', 'Property Management',
  'Auto Services', 'Restaurant', 'Retail', 'Healthcare',
  'Fitness', 'Education', 'Technology', 'Photography',
  'Finance', 'Marketing', 'E-Commerce', 'SaaS',
]

// Map UI labels to DB asset types
const ASSET_TYPE_MAP: Record<string, string> = {
  'Emails': 'email',
  'Posts': 'linkedin',
  'Videos': 'heygen',
  'Images': 'image',
}

const AVAILABLE_ASSET_TYPES = [
  { type: 'email', name: 'Email Sequence', icon: Mail, description: '3-email nurture sequence' },
  { type: 'linkedin', name: 'LinkedIn Post', icon: FileText, description: 'Engagement-optimized post' },
  { type: 'instagram', name: 'Instagram Caption', icon: ImageIcon, description: 'Caption with hashtags' },
  { type: 'video_script', name: 'Video Script', icon: Video, description: '30-60s HeyGen script' },
  { type: 'hooks', name: 'Marketing Hooks', icon: Zap, description: '10 compelling hooks' },
  { type: 'image_prompt', name: 'Image Prompts', icon: Sparkles, description: '5 AI image prompts' },
]

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'educational', label: 'Educational' },
  { value: 'conversational', label: 'Conversational' },
]

const ALL_ASSET_TYPES = AVAILABLE_ASSET_TYPES.map(a => a.type)

type ContentTab = 'dashboard' | 'ab-tests' | 'schedule' | 'integrations'

export default function ContentStudio({ supabase, onRefresh, showToast }: ContentStudioProps) {
  const { theme } = useTheme()
  const c = theme.colors

  const [initialLoading, setInitialLoading] = useState(true)
  const [assetSearchQuery, setAssetSearchQuery] = useState('')
  const [assetTypeFilter, setAssetTypeFilter] = useState<string | null>(null)
  const [bundleDetailTab, setBundleDetailTab] = useState<string>('content')

  const [bundles, setBundles] = useState<ContentBundle[]>([])
  const [selectedBundle, setSelectedBundle] = useState<ContentBundle | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    topic: '',
    trade: '',
    selectedAssets: ALL_ASSET_TYPES as string[],
    tone: 'professional',
    targetAudience: '',
    skipResearch: false,
    autoApprove: false,
    customTypes: [] as Array<{ type: string; name: string }>,
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showAdvancedCreate, setShowAdvancedCreate] = useState(false)
  const [customTypeInput, setCustomTypeInput] = useState('')
  const [activeTab, setActiveTab] = useState<ContentTab>('dashboard')
  const [assetCounts, setAssetCounts] = useState<AssetCounts>({ email: 0, linkedin: 0, heygen: 0, image: 0 })
  const [showAssets, setShowAssets] = useState(false)
  const [allAssets, setAllAssets] = useState<ContentAsset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [bundleAssets, setBundleAssets] = useState<ContentAsset[]>([])
  const [bundleAssetsLoading, setBundleAssetsLoading] = useState(false)
  const [templates, setTemplates] = useState<(ContentBundle & { template_name?: string; use_count?: number })[]>([])
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importForm, setImportForm] = useState({ content: '', type: 'email', trade: '' })
  const [importing, setImporting] = useState(false)
  const [generatingVideo, setGeneratingVideo] = useState<string | null>(null)
  const [videoJobs, setVideoJobs] = useState<Record<string, Record<string, unknown>>>({})
  const [selectedAvatar, setSelectedAvatar] = useState<{ avatar_id: string; avatar_name: string; default_voice_id: string } | null>(null)
  const [comments, setComments] = useState<{ id: string; author: string; content: string; created_at: string }[]>([])
  const [newComment, setNewComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [researchExpanded, setResearchExpanded] = useState(false)
  const [researchTimeout, setResearchTimeout] = useState(false)
  const researchPollingStartRef = useRef<number>(0)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingBundleId, setDeletingBundleId] = useState<string | null>(null)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)
  const [cancellingBundleId, setCancellingBundleId] = useState<string | null>(null)
  const [completedBundles, setCompletedBundles] = useState<ContentBundle[]>([])
  // Strategy approval state
  const [strategyDoc, setStrategyDoc] = useState<Record<string, unknown> | null>(null)
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [approvingStrategy, setApprovingStrategy] = useState(false)
  const [regeneratingStrategy, setRegeneratingStrategy] = useState(false)
  // Asset viewing state
  const [expandedAssetIds, setExpandedAssetIds] = useState<Set<string>>(new Set())
  const [compareAsset, setCompareAsset] = useState<ContentAsset | null>(null)

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'accent' | 'muted'; label: string }> = {
      complete: { color: 'success', label: 'Complete' },
      researching: { color: 'info', label: 'Researching...' },
      creating: { color: 'info', label: 'Creating...' },
      awaiting_strategy_approval: { color: 'warning', label: 'Strategy Review' },
      cancelled: { color: 'error', label: 'Cancelled' },
      failed: { color: 'error', label: 'Failed' },
    }
    const cfg = map[status] || { color: 'muted' as const, label: status }
    return <Badge variant="status" color={cfg.color}>{cfg.label}</Badge>
  }

  // Copy to clipboard with toast feedback
  const copyToClipboard = async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast?.({ type: 'success', title: 'Copied!', message: label ? `${label} copied to clipboard` : 'Content copied to clipboard', duration: 2000 })
    } catch {
      showToast?.({ type: 'error', title: 'Copy failed', message: 'Could not copy to clipboard', duration: 3000 })
    }
  }

  const copyAllAssets = async (assets: ContentAsset[]) => {
    const text = assets.map(a => `--- ${a.type.toUpperCase()} ---\n\n${a.content}`).join('\n\n')
    await copyToClipboard(text, 'All assets')
  }

  const downloadAsZip = async (assets: ContentAsset[], bundleTopic?: string) => {
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      for (const asset of assets) {
        const filename = `${asset.type}-${asset.id.slice(0, 8)}.txt`
        zip.file(filename, asset.content || '')
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(bundleTopic || 'content-bundle').replace(/\s+/g, '-')}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast?.({ type: 'success', title: 'Download started', message: `ZIP with ${assets.length} files`, duration: 3000 })
    } catch (err) {
      console.error('ZIP generation failed:', err)
      showToast?.({ type: 'error', title: 'Download failed', message: 'Could not generate ZIP file', duration: 5000 })
    }
  }

  const generateMailtoLink = (assets: ContentAsset[], topic?: string): string => {
    const subject = encodeURIComponent(`Content Bundle: ${topic || 'Untitled'}`)
    const body = encodeURIComponent(assets.map(a => `=== ${a.type.toUpperCase()} ===\n\n${a.content}`).join('\n\n---\n\n'))
    return `mailto:?subject=${subject}&body=${body}`
  }

  // Fetch HeyGen avatars (lazy, called on first video generation attempt)
  const fetchAvatars = useCallback(async () => {
    try {
      const res = await fetch('/api/content-dashboard/heygen/avatars')
      const data = await res.json()
      if (data.success && data.data.configured) {
        setSelectedAvatar(data.data.defaultAvatar)
      }
    } catch (err) {
      console.error('Failed to fetch avatars:', err)
    }
  }, [])

  // Generate video for a bundle's heygen asset
  const handleGenerateVideo = useCallback(async (bundleId: string, asset: ContentAsset) => {
    setGeneratingVideo(bundleId)
    try {
      // Lazy-load default avatar if not yet fetched
      if (!selectedAvatar) await fetchAvatars()

      const res = await fetch('/api/content-dashboard/heygen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleId,
          assetId: asset.id,
          scriptText: asset.content,
          avatarId: selectedAvatar?.avatar_id,
          voiceId: selectedAvatar?.default_voice_id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast?.({ type: 'success', title: 'Video Generation Started', message: 'Your video is being generated by HeyGen', duration: 5000 })
        startPollingJob(data.data.jobId)
      } else {
        throw new Error(data.error)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not start video generation'
      showToast?.({ type: 'error', title: 'Video Generation Failed', message, duration: 5000 })
    } finally {
      setGeneratingVideo(null)
    }
  }, [selectedAvatar, fetchAvatars, showToast])

  // Poll a HeyGen job for completion
  const startPollingJob = useCallback((jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/content-dashboard/heygen/status/${jobId}`)
        const data = await res.json()
        if (data.success && data.data) {
          setVideoJobs(prev => ({ ...prev, [jobId]: data.data }))
          if (data.data.status === 'completed' || data.data.status === 'failed') {
            clearInterval(pollInterval)
            if (data.data.status === 'completed') {
              showToast?.({ type: 'success', title: 'Video Ready!', message: 'Your HeyGen video has been generated', duration: 5000 })
            }
          }
        }
      } catch {
        // Silently retry on next interval
      }
    }, 5000)
    // Safety: stop after 10 minutes
    setTimeout(() => clearInterval(pollInterval), 600000)
  }, [showToast])

  // Retry a failed job
  const handleRetryJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/content-dashboard/heygen/retry/${jobId}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showToast?.({ type: 'info', title: 'Retrying video generation...', duration: 3000 })
        startPollingJob(jobId)
      } else {
        throw new Error(data.error)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Retry failed'
      showToast?.({ type: 'error', title: 'Retry Failed', message, duration: 5000 })
    }
  }, [showToast, startPollingJob])

  // Fetch bundles from API
  const [bundleStatusFilter, setBundleStatusFilter] = useState<string>('all')
  const [bundlePage, setBundlePage] = useState(0)
  const [hasMoreBundles, setHasMoreBundles] = useState(false)
  const BUNDLES_PER_PAGE = 10

  const fetchBundles = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: String(BUNDLES_PER_PAGE), offset: String(bundlePage * BUNDLES_PER_PAGE) })
      if (bundleStatusFilter !== 'all') params.set('status', bundleStatusFilter)
      const response = await fetch(`/api/content-dashboard/bundles?${params}`)
      const data = await response.json()
      if (data.success) {
        setBundles(data.data.bundles || [])
        setHasMoreBundles((data.data.bundles || []).length === BUNDLES_PER_PAGE)
      }
    } catch (err) {
      console.error('Failed to fetch bundles:', err)
    }
  }, [bundleStatusFilter, bundlePage])

  // Fetch asset counts from API
  const fetchAssetCounts = useCallback(async () => {
    try {
      const types = ['email', 'linkedin', 'heygen', 'image']
      const results = await Promise.all(
        types.map(type =>
          fetch(`/api/content-dashboard/assets?type=${type}&limit=0`)
            .then(r => r.json())
            .then(d => ({ type, count: d.data?.totalCount || 0 }))
            .catch(() => ({ type, count: 0 }))
        )
      )

      const counts: AssetCounts = { email: 0, linkedin: 0, heygen: 0, image: 0 }
      for (const r of results) {
        counts[r.type as keyof AssetCounts] = r.count
      }
      setAssetCounts(counts)
    } catch (err) {
      console.error('Failed to fetch asset counts:', err)
    }
  }, [])

  // Fetch completed bundles for Content Library
  const fetchCompletedBundles = useCallback(async () => {
    try {
      const response = await fetch('/api/content-dashboard/bundles?status=complete&limit=20')
      const data = await response.json()
      if (data.success) {
        setCompletedBundles(data.data.bundles || [])
      }
    } catch (err) {
      console.error('Failed to fetch completed bundles:', err)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    Promise.all([fetchBundles(), fetchAssetCounts(), fetchCompletedBundles()])
      .finally(() => setInitialLoading(false))

    // Real-time subscription for bundles
    if (supabase) {
      const channel = supabase
        .channel('content_bundles_monitor')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'content_bundles' },
          () => {
            fetchBundles()
            fetchCompletedBundles()
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'content_assets' },
          () => {
            fetchAssetCounts()
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'heygen_jobs' },
          (payload) => {
            const job = payload.new as Record<string, unknown>
            if (job?.id) {
              setVideoJobs(prev => ({ ...prev, [job.id as string]: job }))
            }
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'image_generation_jobs' },
          (payload) => {
            const job = payload.new as Record<string, unknown>
            if (job?.status === 'completed') {
              fetchAssetCounts()
            }
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    }
  }, [fetchBundles, fetchAssetCounts, fetchCompletedBundles, supabase])

  // Create bundle via research-first API
  const handleCreateBundle = useCallback(async () => {
    if (!createForm.topic.trim()) {
      setCreateError('Please enter a topic')
      return
    }
    if (createForm.selectedAssets.length === 0) {
      setCreateError('Please select at least one content type')
      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/content-dashboard/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: createForm.topic.trim(),
          trade: createForm.trade || 'General',
          selectedAssets: createForm.selectedAssets,
          tone: createForm.tone,
          intent: 'full_creation',
          autoApprove: createForm.autoApprove,
          skipResearch: createForm.skipResearch,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Server error (${response.status})`)
      }

      const topicText = createForm.topic.trim()
      const tradeText = createForm.trade

      setCreateForm({ topic: '', trade: '', selectedAssets: ALL_ASSET_TYPES as string[], tone: 'professional', targetAudience: '', skipResearch: false, autoApprove: false, customTypes: [] })
      setCustomTypeInput('')
      setShowCreateModal(false)
      showToast?.({
        type: 'success',
        title: createForm.skipResearch ? 'Content Creation Started!' : 'Research Started!',
        message: createForm.skipResearch
          ? `Creating ${createForm.selectedAssets.length} content assets for "${topicText}"...`
          : `Researching "${topicText}" before creating content...`,
        duration: 5000,
      })
      fetchBundles()
      fetchAssetCounts()
      onRefresh?.()

      // Auto-open the newly created bundle in detail view
      // Set selectedBundle directly — the research polling effect will load data
      setSelectedBundle({
        id: data.data.bundleId,
        topic: topicText,
        trade: tradeText,
        quality_score: 0,
        status: 'researching',
        created_at: new Date().toISOString(),
      })
      setBundleAssets([])
      setResearchExpanded(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create bundle'
      setCreateError(message)
    } finally {
      setCreating(false)
    }
  }, [createForm, onRefresh, fetchBundles, fetchAssetCounts, showToast])

  // Fetch strategy doc for a bundle
  const fetchStrategyDoc = useCallback(async (bundleId: string) => {
    setStrategyLoading(true)
    try {
      const res = await fetch(`/api/content-dashboard/strategy?bundleId=${bundleId}`)
      const data = await res.json()
      if (data.success && data.data?.strategy_doc) {
        setStrategyDoc(data.data.strategy_doc)
      }
    } catch {
      // Strategy may not exist yet
    } finally {
      setStrategyLoading(false)
    }
  }, [])

  // Approve strategy and proceed to content creation
  const handleApproveStrategy = useCallback(async () => {
    if (!selectedBundle) return
    setApprovingStrategy(true)
    try {
      const res = await fetch('/api/content-dashboard/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId: selectedBundle.id, action: 'approve' }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      showToast?.({ type: 'success', title: 'Strategy Approved!', message: 'Content creation has started.', duration: 4000 })
      setSelectedBundle({ ...selectedBundle, status: 'creating' })
      setStrategyDoc(null)
      fetchBundles()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to approve strategy'
      showToast?.({ type: 'error', title: 'Approval Failed', message: msg, duration: 5000 })
    } finally {
      setApprovingStrategy(false)
    }
  }, [selectedBundle, fetchBundles, showToast])

  // Regenerate strategy
  const handleRegenerateStrategy = useCallback(async () => {
    if (!selectedBundle) return
    setRegeneratingStrategy(true)
    try {
      const res = await fetch('/api/content-dashboard/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId: selectedBundle.id, action: 'regenerate' }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      showToast?.({ type: 'success', title: 'Regenerating Strategy', message: 'A new strategy is being generated from research...', duration: 4000 })
      setStrategyDoc(null)
      setSelectedBundle({ ...selectedBundle, status: 'researching' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to regenerate strategy'
      showToast?.({ type: 'error', title: 'Regeneration Failed', message: msg, duration: 5000 })
    } finally {
      setRegeneratingStrategy(false)
    }
  }, [selectedBundle, showToast])

  // ESC key handler for all modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cancelConfirmOpen) { setCancelConfirmOpen(false); return }
        if (deleteConfirmId) { setDeleteConfirmId(null); return }
        if (showSaveTemplate) { setShowSaveTemplate(false); return }
        if (compareAsset) { setCompareAsset(null); return }
        if (selectedBundle) { setSelectedBundle(null); setBundleAssets([]); return }
        if (showAssets) { setShowAssets(false); return }
        if (showCreateModal && !creating) { setShowCreateModal(false); return }
        if (showImportModal && !importing) { setShowImportModal(false); return }
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [cancelConfirmOpen, deleteConfirmId, showSaveTemplate, compareAsset, selectedBundle, showAssets, showCreateModal, creating, showImportModal, importing])

  // View all assets
  const handleViewAllAssets = useCallback(async (typeFilter?: string) => {
    setShowAssets(true)
    setAssetsLoading(true)
    setAssetTypeFilter(typeFilter || null)
    setAssetSearchQuery('')
    try {
      const response = await fetch('/api/content-dashboard/assets?limit=50')
      const data = await response.json()
      if (data.success) {
        setAllAssets(data.data.assets || [])
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err)
    } finally {
      setAssetsLoading(false)
    }
  }, [])

  // Fetch comments for a bundle
  const fetchComments = useCallback(async (bundleId: string) => {
    try {
      const response = await fetch(`/api/content-dashboard/comments?bundleId=${bundleId}`)
      const data = await response.json()
      if (data.success) setComments(data.data.comments || [])
    } catch (err) {
      console.error('Failed to fetch comments:', err)
    }
  }, [])

  // View bundle detail with assets
  const handleViewBundle = useCallback(async (bundle: ContentBundle) => {
    setSelectedBundle(bundle)
    setBundleAssetsLoading(true)
    setComments([])
    setStrategyDoc(null)
    setExpandedAssetIds(new Set())
    // Auto-select tab based on status
    if (bundle.status === 'researching' || bundle.status === 'awaiting_strategy_approval') {
      setBundleDetailTab('research')
    } else {
      setBundleDetailTab('content')
    }
    try {
      const response = await fetch(`/api/content-dashboard/bundles/${bundle.id}`)
      const data = await response.json()
      if (data.success) {
        setBundleAssets(data.data.content_assets || [])
        // Update bundle with latest data from server
        if (data.data.strategy_doc) {
          setStrategyDoc(data.data.strategy_doc)
        }
        if (data.data.status) {
          setSelectedBundle(prev => prev ? { ...prev, status: data.data.status, research_findings: data.data.research_findings, strategy_doc: data.data.strategy_doc } : prev)
        }
      }
    } catch (err) {
      console.error('Failed to fetch bundle assets:', err)
      setBundleAssets([])
    } finally {
      setBundleAssetsLoading(false)
    }

    // Fetch strategy if awaiting approval
    if (bundle.status === 'awaiting_strategy_approval') {
      fetchStrategyDoc(bundle.id)
    }

    fetchComments(bundle.id)

    // Fetch HeyGen jobs for this bundle
    try {
      const jobsRes = await fetch(`/api/content-dashboard/heygen/jobs?bundleId=${bundle.id}`)
      const jobsData = await jobsRes.json()
      if (jobsData.success && jobsData.data.jobs.length > 0) {
        const jobMap: Record<string, Record<string, unknown>> = {}
        for (const job of jobsData.data.jobs) {
          jobMap[job.id] = job
          if (job.status === 'pending' || job.status === 'processing') {
            startPollingJob(job.id)
          }
        }
        setVideoJobs(prev => ({ ...prev, ...jobMap }))
      }
    } catch {
      // Non-critical
    }
  }, [fetchComments, startPollingJob, fetchStrategyDoc])

  const handleAddComment = async () => {
    if (!selectedBundle || !newComment.trim()) return
    setAddingComment(true)
    try {
      const response = await fetch('/api/content-dashboard/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId: selectedBundle.id, content: newComment.trim() }),
      })
      const data = await response.json()
      if (data.success) {
        setNewComment('')
        fetchComments(selectedBundle.id)
      }
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setAddingComment(false)
    }
  }

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/content-dashboard/templates')
      const data = await response.json()
      if (data.success) setTemplates(data.data.templates || [])
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }, [])

  // Load templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Poll research progress when viewing a researching bundle
  useEffect(() => {
    if (!selectedBundle || selectedBundle.status !== 'researching') {
      setResearchTimeout(false)
      researchPollingStartRef.current = 0
      return
    }

    const bundleId = selectedBundle.id

    // Track when polling started
    if (!researchPollingStartRef.current) {
      researchPollingStartRef.current = Date.now()
    }

    const pollResearch = async () => {
      try {
        const [bundleRes, researchRes] = await Promise.all([
          fetch(`/api/content-dashboard/bundles/${bundleId}`),
          fetch(`/api/content-dashboard/research?bundleId=${bundleId}`),
        ])
        const bundleData = await bundleRes.json()
        const researchData = await researchRes.json()

        if (!bundleData.success) return

        const updatedBundle: ContentBundle = {
          id: bundleData.data.id,
          topic: bundleData.data.topic,
          trade: bundleData.data.trade,
          quality_score: bundleData.data.quality_score || 0,
          status: bundleData.data.status,
          created_at: bundleData.data.created_at,
          research_findings: bundleData.data.research_findings || undefined,
          research_progress: researchData.data?.progress || undefined,
          strategy_doc: bundleData.data.strategy_doc || undefined,
        }

        setSelectedBundle(updatedBundle)

        // If research is done, refresh assets and bundle list
        if (updatedBundle.status !== 'researching') {
          setBundleAssets(bundleData.data.content_assets || [])
          fetchBundles()
          researchPollingStartRef.current = 0
          setResearchTimeout(false)
          setResearchExpanded(true) // Auto-expand research findings
          // If strategy is ready, fetch it
          if (updatedBundle.status === 'awaiting_strategy_approval') {
            fetchStrategyDoc(updatedBundle.id)
          }
          if (bundleData.data.strategy_doc) {
            setStrategyDoc(bundleData.data.strategy_doc)
          }
        }
      } catch (err) {
        console.error('Research polling error:', err)
      }

      // Check for timeout (12 minutes)
      if (researchPollingStartRef.current) {
        const elapsed = Date.now() - researchPollingStartRef.current
        if (elapsed > 720000) {
          setResearchTimeout(true)
        }
      }
    }

    pollResearch()
    const interval = setInterval(pollResearch, 3000)

    // Safety: stop polling after 15 minutes
    const maxPollTimer = setTimeout(() => {
      clearInterval(interval)
    }, 900000)

    return () => {
      clearInterval(interval)
      clearTimeout(maxPollTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBundle?.id, selectedBundle?.status])

  // Save bundle as template
  const handleSaveAsTemplate = async () => {
    if (!selectedBundle || !templateName.trim()) return
    setSavingTemplate(true)
    try {
      const response = await fetch('/api/content-dashboard/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId: selectedBundle.id, templateName: templateName.trim() }),
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'success', title: 'Template Saved!', message: `"${templateName}" saved as template`, duration: 3000 })
        setShowSaveTemplate(false)
        setTemplateName('')
        fetchTemplates()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast?.({ type: 'error', title: 'Failed', message: err.message || 'Could not save template', duration: 5000 })
    } finally {
      setSavingTemplate(false)
    }
  }

  // Cancel pipeline
  const handleCancelBundle = useCallback(async () => {
    if (!selectedBundle) return
    setCancelling(true)
    try {
      const res = await fetch('/api/content-dashboard/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId: selectedBundle.id, action: 'cancel' }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setSelectedBundle({ ...selectedBundle, status: 'cancelled' })
      fetchBundles()
      showToast?.({ type: 'info', title: 'Bundle Cancelled', message: `"${selectedBundle.topic}" has been cancelled.`, duration: 4000 })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel bundle'
      showToast?.({ type: 'error', title: 'Cancel Failed', message, duration: 5000 })
    } finally {
      setCancelling(false)
      setCancelConfirmOpen(false)
    }
  }, [selectedBundle, fetchBundles, showToast])

  // Cancel a bundle by ID (from list view, no modal needed)
  const handleCancelBundleById = useCallback(async (bundleId: string) => {
    setCancellingBundleId(bundleId)
    try {
      const res = await fetch('/api/content-dashboard/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId, action: 'cancel' }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      fetchBundles()
      const bundle = bundles.find(b => b.id === bundleId)
      showToast?.({ type: 'info', title: 'Bundle Cancelled', message: `"${bundle?.topic || 'Bundle'}" has been cancelled.`, duration: 4000 })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel bundle'
      showToast?.({ type: 'error', title: 'Cancel Failed', message, duration: 5000 })
    } finally {
      setCancellingBundleId(null)
      setCancelConfirmId(null)
    }
  }, [fetchBundles, bundles, showToast])

  // Delete a bundle
  const handleDeleteBundle = useCallback(async (bundleId: string) => {
    setDeletingBundleId(bundleId)
    try {
      const res = await fetch(`/api/content-dashboard/bundles/${bundleId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      if (selectedBundle?.id === bundleId) {
        setSelectedBundle(null)
        setBundleAssets([])
      }
      fetchBundles()
      fetchCompletedBundles()
      fetchAssetCounts()
      showToast?.({ type: 'info', title: 'Bundle Deleted', message: 'Bundle has been permanently deleted.', duration: 3000 })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete bundle'
      showToast?.({ type: 'error', title: 'Delete Failed', message, duration: 5000 })
    } finally {
      setDeletingBundleId(null)
      setDeleteConfirmId(null)
    }
  }, [selectedBundle, fetchBundles, fetchCompletedBundles, fetchAssetCounts, showToast])

  // Use template (duplicate)
  const handleUseTemplate = async (templateId: string) => {
    try {
      showToast?.({ type: 'info', title: 'Creating from template...', duration: 3000 })
      const response = await fetch(`/api/content-dashboard/templates/${templateId}/duplicate`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'success', title: 'Bundle Created!', message: 'New bundle created from template', duration: 4000 })
        fetchBundles()
        fetchTemplates()
        onRefresh?.()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast?.({ type: 'error', title: 'Failed', message: err.message || 'Could not create from template', duration: 5000 })
    }
  }

  // Remove template flag
  const handleDeleteTemplate = async (bundleId: string) => {
    try {
      const response = await fetch('/api/content-dashboard/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId }),
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'info', title: 'Template Removed', duration: 2000 })
        fetchTemplates()
      }
    } catch (err) {
      console.error('Failed to delete template:', err)
    }
  }

  // Import content
  const handleImportContent = async () => {
    if (!importForm.content.trim()) return
    setImporting(true)
    try {
      // Create a bundle first
      const bundleRes = await fetch('/api/content-dashboard/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: `Imported ${importForm.type}`, trade: importForm.trade }),
      })
      const bundleData = await bundleRes.json()
      if (!bundleData.success) throw new Error(bundleData.error || 'Failed to create bundle')

      // Create asset in the bundle
      await fetch('/api/content-dashboard/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundle_id: bundleData.data.bundleId,
          type: importForm.type,
          content: importForm.content.trim(),
          status: 'draft',
        }),
      })

      showToast?.({ type: 'success', title: 'Content Imported!', message: 'New bundle created with imported content', duration: 3000 })
      setShowImportModal(false)
      setImportForm({ content: '', type: 'email', trade: 'HVAC' })
      fetchBundles()
      fetchAssetCounts()
      onRefresh?.()
    } catch (err: any) {
      showToast?.({ type: 'error', title: 'Import Failed', message: err.message || 'Could not import content', duration: 5000 })
    } finally {
      setImporting(false)
    }
  }

  const assetTypes = [
    { icon: Mail, label: 'Emails', count: assetCounts.email, color: ASSET_COLORS[0] },
    { icon: FileText, label: 'Posts', count: assetCounts.linkedin, color: ASSET_COLORS[1] },
    { icon: Video, label: 'Videos', count: assetCounts.heygen, color: ASSET_COLORS[2] },
    { icon: ImageIcon, label: 'Images', count: assetCounts.image, color: ASSET_COLORS[3] }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Animations */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '6px',
        padding: '4px',
        borderRadius: '12px',
        background: 'rgba(15, 15, 26, 0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {([
          { key: 'dashboard' as ContentTab, label: 'Dashboard', icon: TrendingUp },
          { key: 'ab-tests' as ContentTab, label: 'A/B Tests', icon: FlaskConical },
          { key: 'schedule' as ContentTab, label: 'Schedule', icon: Calendar },
          { key: 'integrations' as ContentTab, label: 'Integrations', icon: Settings2 },
        ]).map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                color: isActive ? '#c084fc' : 'rgba(255,255,255,0.35)',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Sub-view rendering */}
      {activeTab === 'ab-tests' && (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}><Loader size={20} className="animate-spin" style={{ margin: '0 auto' }} /></div>}>
          <ABTestView supabase={supabase} showToast={showToast} />
        </Suspense>
      )}
      {activeTab === 'schedule' && (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}><Loader size={20} className="animate-spin" style={{ margin: '0 auto' }} /></div>}>
          <ScheduleView supabase={supabase} showToast={showToast} />
        </Suspense>
      )}
      {activeTab === 'integrations' && (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}><Loader size={20} className="animate-spin" style={{ margin: '0 auto' }} /></div>}>
          <IntegrationsView showToast={showToast} />
        </Suspense>
      )}

      {/* Dashboard Content */}
      {activeTab === 'dashboard' && (<>

      {/* Asset Library */}
      {initialLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <SkeletonMetricCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {assetTypes.map((asset) => (
            <div
              key={asset.label}
              className="card-hover"
              onClick={() => handleViewAllAssets(ASSET_TYPE_MAP[asset.label])}
              style={{
                padding: '22px',
                borderRadius: '14px',
                background: c.glassBg || 'rgba(15, 15, 26, 0.7)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${c.border}`,
                borderTop: `3px solid ${asset.color}`,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${asset.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <asset.icon size={18} style={{ color: asset.color }} />
                </div>
                <span style={{ fontSize: '0.85rem', color: c.textTertiary, fontWeight: 500 }}>
                  {asset.label}
                </span>
              </div>
              <p style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: c.textPrimary,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {asset.count}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Content Bundles */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{
            fontSize: '1.05rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'rgba(255,255,255,0.85)',
          }}>
            <TrendingUp size={18} style={{ color: '#a855f7' }} />
            Content Bundles
          </h3>
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[
            { value: 'all', label: 'All' },
            { value: 'researching', label: 'Researching' },
            { value: 'awaiting_strategy_approval', label: 'Strategy' },
            { value: 'creating', label: 'Creating' },
            { value: 'complete', label: 'Complete' },
            { value: 'failed', label: 'Failed' },
            { value: 'cancelled', label: 'Cancelled' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setBundleStatusFilter(f.value); setBundlePage(0) }}
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                border: `1px solid ${bundleStatusFilter === f.value ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255,255,255,0.06)'}`,
                background: bundleStatusFilter === f.value ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
                color: bundleStatusFilter === f.value ? '#c084fc' : 'rgba(255,255,255,0.4)',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {initialLoading ? (
          <SkeletonList count={3} />
        ) : bundles.length === 0 ? (
          <EmptyState
            icon="📦"
            title={bundleStatusFilter !== 'all' ? `No ${bundleStatusFilter} bundles` : 'No content bundles yet'}
            description={bundleStatusFilter === 'all' ? 'Click "Create New Bundle" to get started.' : 'Try a different filter.'}
            actionLabel={bundleStatusFilter === 'all' ? 'Create Bundle' : undefined}
            onAction={bundleStatusFilter === 'all' ? () => setShowCreateModal(true) : undefined}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bundles.map((bundle) => (
              <div
                key={bundle.id}
                onClick={() => handleViewBundle(bundle)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bundle.topic}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                      {bundle.trade} {bundle.quality_score > 0 && `• Quality: ${bundle.quality_score}/100`}
                      <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
                        • {(() => {
                          const mins = Math.floor((Date.now() - new Date(bundle.created_at).getTime()) / 60000)
                          if (mins < 1) return 'just now'
                          if (mins < 60) return `${mins}m ago`
                          const hrs = Math.floor(mins / 60)
                          if (hrs < 24) return `${hrs}h ago`
                          return `${Math.floor(hrs / 24)}d ago`
                        })()}
                      </span>
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {/* Cancel button for active pipelines */}
                    {['researching', 'awaiting_strategy_approval', 'creating'].includes(bundle.status) && (
                      cancelConfirmId === bundle.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Cancel?</span>
                          <button
                            onClick={() => handleCancelBundleById(bundle.id)}
                            disabled={cancellingBundleId === bundle.id}
                            style={{
                              padding: '3px 8px', borderRadius: '6px', border: 'none',
                              background: 'rgba(239, 68, 68, 0.2)', color: '#f87171',
                              fontSize: '0.7rem', fontWeight: 600, cursor: cancellingBundleId === bundle.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {cancellingBundleId === bundle.id ? '...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setCancelConfirmId(null)}
                            style={{
                              padding: '3px 8px', borderRadius: '6px', border: 'none',
                              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)',
                              fontSize: '0.7rem', cursor: 'pointer',
                            }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setCancelConfirmId(bundle.id) }}
                          style={{
                            background: 'none', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', cursor: 'pointer',
                            color: 'rgba(239, 68, 68, 0.7)', padding: '3px 8px',
                            fontSize: '0.7rem', fontWeight: 500,
                            transition: 'all 0.2s ease',
                          }}
                          title="Cancel pipeline"
                        >
                          Cancel
                        </button>
                      )
                    )}
                    {/* Delete button for terminal states */}
                    {['cancelled', 'failed', 'complete'].includes(bundle.status) && (
                      deleteConfirmId === bundle.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Delete?</span>
                          <button
                            onClick={() => handleDeleteBundle(bundle.id)}
                            disabled={deletingBundleId === bundle.id}
                            style={{
                              padding: '3px 8px', borderRadius: '6px', border: 'none',
                              background: 'rgba(239, 68, 68, 0.2)', color: '#f87171',
                              fontSize: '0.7rem', fontWeight: 600, cursor: deletingBundleId === bundle.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {deletingBundleId === bundle.id ? '...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            style={{
                              padding: '3px 8px', borderRadius: '6px', border: 'none',
                              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)',
                              fontSize: '0.7rem', cursor: 'pointer',
                            }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(bundle.id) }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'rgba(255,255,255,0.25)', padding: '4px',
                            transition: 'color 0.2s ease',
                          }}
                          title="Delete bundle"
                        >
                          <Trash2 size={14} />
                        </button>
                      )
                    )}
                    {getStatusBadge(bundle.status)}
                  </div>
                </div>
                {/* Pipeline phase indicator */}
                {!['cancelled', 'failed'].includes(bundle.status) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {[
                      { key: 'research', label: 'Research', active: ['researching', 'awaiting_strategy_approval', 'creating', 'complete'].includes(bundle.status) },
                      { key: 'strategy', label: 'Strategy', active: ['awaiting_strategy_approval', 'creating', 'complete'].includes(bundle.status) },
                      { key: 'content', label: 'Content', active: ['creating', 'complete'].includes(bundle.status) },
                      { key: 'done', label: 'Done', active: bundle.status === 'complete' },
                    ].map((phase, i) => (
                      <div key={phase.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {i > 0 && <div style={{ width: 12, height: 1, background: phase.active ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.06)' }} />}
                        <div
                          title={phase.label}
                          style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: phase.active ? '#a855f7' : 'rgba(255,255,255,0.08)',
                            transition: 'background 0.3s ease',
                          }}
                        />
                      </div>
                    ))}
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginLeft: '4px' }}>
                      {bundle.status === 'researching' ? '1/4'
                        : bundle.status === 'awaiting_strategy_approval' ? '2/4'
                        : bundle.status === 'creating' ? '3/4'
                        : bundle.status === 'complete' ? '4/4'
                        : ''}
                    </span>
                  </div>
                )}
              </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More / Pagination */}
        {hasMoreBundles && (
          <button
            onClick={() => setBundlePage(p => p + 1)}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Load More Bundles
          </button>
        )}
        {bundlePage > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={() => setBundlePage(p => Math.max(0, p - 1))}
              disabled={bundlePage === 0}
              style={{
                padding: '4px 12px', borderRadius: '6px', border: 'none',
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
                fontSize: '0.75rem', cursor: bundlePage === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', lineHeight: '24px' }}>
              Page {bundlePage + 1}
            </span>
            {hasMoreBundles && (
              <button
                onClick={() => setBundlePage(p => p + 1)}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: 'none',
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.75rem', cursor: 'pointer',
                }}
              >
                Next
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Library — completed bundles */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{
          fontSize: '1.05rem',
          fontWeight: 600,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'rgba(255,255,255,0.85)',
        }}>
          <FolderOpen size={18} style={{ color: '#22c55e' }} />
          Content Library
          {completedBundles.length > 0 && (
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginLeft: '4px' }}>
              ({completedBundles.length})
            </span>
          )}
        </h3>

        {completedBundles.length === 0 ? (
          <EmptyState
            icon="📚"
            title="No completed content yet"
            description="Bundles will appear here when the pipeline finishes."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completedBundles.map((bundle) => (
              <div
                key={bundle.id}
                onClick={() => handleViewBundle(bundle)}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(34, 197, 94, 0.15)',
                  background: 'rgba(34, 197, 94, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{bundle.topic}</h4>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(deleteConfirmId === bundle.id ? null : bundle.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: '2px' }}
                    title="Delete bundle"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>
                  {bundle.trade} • {new Date(bundle.created_at).toLocaleDateString()}
                </p>
                {deleteConfirmId === bundle.id && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }} onClick={(e) => e.stopPropagation()}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Delete this bundle?</span>
                    <button
                      onClick={() => handleDeleteBundle(bundle.id)}
                      disabled={deletingBundleId === bundle.id}
                      style={{
                        padding: '3px 8px', borderRadius: '6px', border: 'none',
                        background: 'rgba(239, 68, 68, 0.2)', color: '#f87171',
                        fontSize: '0.7rem', fontWeight: 600, cursor: deletingBundleId === bundle.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {deletingBundleId === bundle.id ? '...' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      style={{
                        padding: '3px 8px', borderRadius: '6px', border: 'none',
                        background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)',
                        fontSize: '0.7rem', cursor: 'pointer',
                      }}
                    >
                      No
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Badge variant="status" color="success">Complete</Badge>
                  <span style={{ fontSize: '0.75rem', color: c.textMuted }}>
                    Click to view assets
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Templates Library */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{
          fontSize: '1.05rem',
          fontWeight: 600,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'rgba(255,255,255,0.85)',
        }}>
          <Bookmark size={18} style={{ color: '#667eea' }} />
          Templates
          {templates.length > 0 && (
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginLeft: '4px' }}>
              ({templates.length})
            </span>
          )}
        </h3>
        {templates.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px 20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <Bookmark size={28} style={{ color: 'rgba(255,255,255,0.08)', margin: '0 auto 10px' }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>No templates yet</p>
            <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.8rem', marginTop: '4px' }}>
              Save any completed bundle as a template to reuse it later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(102, 126, 234, 0.15)',
                  background: 'rgba(102, 126, 234, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{tpl.template_name || tpl.topic}</h4>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: '2px' }}
                    title="Remove template"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>
                  {tpl.trade} • Used {tpl.use_count || 0} times
                </p>
                <button
                  onClick={() => handleUseTemplate(tpl.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgba(102, 126, 234, 0.15)',
                    color: '#667eea',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowCreateModal(true)}>
          Create New Bundle
        </Button>
        <Button variant="outline" icon={<Eye size={16} />} onClick={() => handleViewAllAssets()}>
          View All Assets
        </Button>
        <Button variant="outline" icon={<FileUp size={16} />} onClick={() => setShowImportModal(true)}>
          Import Content
        </Button>
      </div>

      </>)}

      {/* Create Bundle Modal */}
      {showCreateModal && (
        <div
          onClick={() => { if (!creating) setShowCreateModal(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            background: c.overlay || 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '40px',
            paddingBottom: '40px',
            overflowY: 'auto',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '600px',
              padding: '28px',
              height: 'fit-content',
              animation: 'fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Create New Content Bundle
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)',
                  padding: '4px',
                }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Topic */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.03em',
                  marginBottom: '8px',
                }}>
                  Topic
                </label>
                <input
                  type="text"
                  value={createForm.topic}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, topic: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !creating) handleCreateBundle() }}
                  placeholder="e.g., Spring marketing campaigns, AI tools for small business..."
                  disabled={creating}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(15, 15, 26, 0.8)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              {/* Industry / Niche */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.03em',
                  marginBottom: '8px',
                }}>
                  Industry / Niche
                </label>
                <input
                  type="text"
                  list="industry-suggestions"
                  value={createForm.trade}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, trade: e.target.value }))}
                  placeholder="e.g., Real Estate, Fitness, SaaS, Photography..."
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(15, 15, 26, 0.8)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box' as const,
                  }}
                />
                <datalist id="industry-suggestions">
                  {INDUSTRY_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Content Types */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.03em',
                  }}>
                    Content Types
                  </label>
                  <button
                    onClick={() => {
                      const allTypes = [...ALL_ASSET_TYPES, ...createForm.customTypes.map(ct => ct.type)]
                      const allSelected = createForm.selectedAssets.length === allTypes.length
                      setCreateForm(prev => ({ ...prev, selectedAssets: allSelected ? [] : [...allTypes] }))
                    }}
                    disabled={creating}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a855f7',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {(() => {
                      const allTypes = [...ALL_ASSET_TYPES, ...createForm.customTypes.map(ct => ct.type)]
                      return createForm.selectedAssets.length === allTypes.length ? 'Deselect All' : 'Select All'
                    })()}
                  </button>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                }}>
                  {AVAILABLE_ASSET_TYPES.map((asset) => {
                    const isSelected = createForm.selectedAssets.includes(asset.type)
                    const Icon = asset.icon
                    return (
                      <button
                        key={asset.type}
                        onClick={() => {
                          setCreateForm(prev => ({
                            ...prev,
                            selectedAssets: isSelected
                              ? prev.selectedAssets.filter(a => a !== asset.type)
                              : [...prev.selectedAssets, asset.type],
                          }))
                        }}
                        disabled={creating}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: `1px solid ${isSelected ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255,255,255,0.06)'}`,
                          background: isSelected ? 'rgba(168, 85, 247, 0.1)' : 'rgba(15, 15, 26, 0.5)',
                          color: isSelected ? '#c084fc' : 'rgba(255,255,255,0.5)',
                          cursor: creating ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          textAlign: 'left' as const,
                        }}
                      >
                        <Icon size={16} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.2 }}>{asset.name}</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.6, lineHeight: 1.2, marginTop: '2px' }}>{asset.description}</div>
                        </div>
                        {isSelected && <Check size={14} style={{ flexShrink: 0 }} />}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Content Types */}
                <div style={{ marginTop: '12px' }}>
                  <label style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.03em',
                    marginBottom: '6px',
                    display: 'block',
                  }}>
                    Add Custom Types
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={customTypeInput}
                      onChange={(e) => setCustomTypeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const name = customTypeInput.trim()
                          if (!name) return
                          const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                          if (ALL_ASSET_TYPES.includes(slug) || createForm.customTypes.some(ct => ct.type === slug)) return
                          setCreateForm(prev => ({
                            ...prev,
                            customTypes: [...prev.customTypes, { type: slug, name }],
                            selectedAssets: [...prev.selectedAssets, slug],
                          }))
                          setCustomTypeInput('')
                        }
                      }}
                      placeholder="e.g. TikTok script, blog post, press release..."
                      disabled={creating}
                      style={{
                        flex: 1,
                        padding: '9px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(15, 15, 26, 0.8)',
                        color: '#fff',
                        fontSize: '0.82rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => {
                        const name = customTypeInput.trim()
                        if (!name) return
                        const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                        if (ALL_ASSET_TYPES.includes(slug) || createForm.customTypes.some(ct => ct.type === slug)) return
                        setCreateForm(prev => ({
                          ...prev,
                          customTypes: [...prev.customTypes, { type: slug, name }],
                          selectedAssets: [...prev.selectedAssets, slug],
                        }))
                        setCustomTypeInput('')
                      }}
                      disabled={creating || !customTypeInput.trim()}
                      style={{
                        padding: '9px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        background: 'rgba(168, 85, 247, 0.1)',
                        color: '#c084fc',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: creating || !customTypeInput.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>

                  {createForm.customTypes.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {createForm.customTypes.map((ct) => {
                        const isSelected = createForm.selectedAssets.includes(ct.type)
                        return (
                          <button
                            key={ct.type}
                            onClick={() => {
                              setCreateForm(prev => ({
                                ...prev,
                                selectedAssets: isSelected
                                  ? prev.selectedAssets.filter(a => a !== ct.type)
                                  : [...prev.selectedAssets, ct.type],
                              }))
                            }}
                            disabled={creating}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: `1px solid ${isSelected ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255,255,255,0.06)'}`,
                              background: isSelected ? 'rgba(168, 85, 247, 0.1)' : 'rgba(15, 15, 26, 0.5)',
                              color: isSelected ? '#c084fc' : 'rgba(255,255,255,0.5)',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                            }}
                          >
                            <FileText size={13} />
                            {ct.name}
                            {isSelected && <Check size={12} />}
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                setCreateForm(prev => ({
                                  ...prev,
                                  customTypes: prev.customTypes.filter(c => c.type !== ct.type),
                                  selectedAssets: prev.selectedAssets.filter(a => a !== ct.type),
                                }))
                              }}
                              style={{ marginLeft: '2px', opacity: 0.5, cursor: 'pointer', display: 'flex' }}
                            >
                              <X size={12} />
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Tone */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.03em',
                  marginBottom: '8px',
                }}>
                  Tone
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => setCreateForm(prev => ({ ...prev, tone: tone.value }))}
                      disabled={creating}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: `1px solid ${createForm.tone === tone.value ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                        background: createForm.tone === tone.value ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                        color: createForm.tone === tone.value ? '#c084fc' : 'rgba(255,255,255,0.45)',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        cursor: creating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.03em',
                  marginBottom: '8px',
                }}>
                  Target Audience <span style={{ fontWeight: 400, textTransform: 'none' as const }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={createForm.targetAudience}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="e.g., Small business owners, homeowners aged 30-50..."
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(15, 15, 26, 0.8)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              {/* Advanced Options Toggle */}
              <button
                onClick={() => setShowAdvancedCreate(!showAdvancedCreate)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '0',
                }}
              >
                {showAdvancedCreate ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Advanced Options
              </button>

              {showAdvancedCreate && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: creating ? 'not-allowed' : 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={createForm.skipResearch}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, skipResearch: e.target.checked }))}
                      disabled={creating}
                      style={{ accentColor: '#a855f7' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Skip Research</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                        Content will be created without market research (faster but less targeted)
                      </div>
                    </div>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: creating ? 'not-allowed' : 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={createForm.autoApprove}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, autoApprove: e.target.checked }))}
                      disabled={creating}
                      style={{ accentColor: '#a855f7' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Auto-Approve Strategy</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                        Skip strategy review and go straight to content creation
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {createError && (
                <Alert variant="destructive">
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}

              <button
                onClick={handleCreateBundle}
                disabled={creating || createForm.selectedAssets.length === 0}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: creating || createForm.selectedAssets.length === 0
                    ? 'rgba(168, 85, 247, 0.3)'
                    : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: creating || createForm.selectedAssets.length === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: creating ? 'none' : '0 4px 15px rgba(168, 85, 247, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {creating && <Loader size={16} className="animate-spin" />}
                {creating ? 'Creating Bundle...' : `Create Bundle (${createForm.selectedAssets.length} types)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View All Assets Modal */}
      {showAssets && (
        <div
          onClick={() => setShowAssets(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: c.overlay || 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '60px',
            paddingBottom: '40px',
            overflowY: 'auto',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '700px',
              padding: '28px',
              height: 'fit-content',
              animation: 'fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: c.textPrimary }}>
                All Content Assets
              </h3>
              <button
                onClick={() => setShowAssets(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: c.textTertiary,
                  padding: '4px',
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Search & Filter */}
            <div style={{ marginBottom: '16px' }}>
              <Input
                placeholder="Search assets..."
                value={assetSearchQuery}
                onChange={(e) => setAssetSearchQuery(e.target.value)}
                icon={<Search size={16} />}
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {['All', 'Emails', 'Posts', 'Videos', 'Images'].map(label => (
                  <Button
                    key={label}
                    variant={(assetTypeFilter === null && label === 'All') || assetTypeFilter === ASSET_TYPE_MAP[label] ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setAssetTypeFilter(label === 'All' ? null : ASSET_TYPE_MAP[label])}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {assetsLoading ? (
              <SkeletonList count={4} />
            ) : (() => {
              const filteredAssets = allAssets.filter(a => {
                if (assetTypeFilter && a.type !== assetTypeFilter) return false
                if (assetSearchQuery.trim()) {
                  const q = assetSearchQuery.toLowerCase()
                  return a.content?.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)
                }
                return true
              })
              if (filteredAssets.length === 0 && allAssets.length === 0) {
                return (
                  <EmptyState
                    icon="📝"
                    title="No assets yet"
                    description="Create a bundle to generate content."
                    actionLabel="Create Bundle"
                    onAction={() => { setShowAssets(false); setShowCreateModal(true) }}
                  />
                )
              }
              if (filteredAssets.length === 0) {
                return (
                  <EmptyState
                    icon="🔍"
                    title="No matching assets"
                    description="Try a different search term or filter."
                    actionLabel="Clear Filters"
                    onAction={() => { setAssetSearchQuery(''); setAssetTypeFilter(null) }}
                  />
                )
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: `1px solid ${c.border}`,
                        background: 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <Badge variant="level" color="accent" style={{ textTransform: 'uppercase' }}>{asset.type}</Badge>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <Button variant="ghost" size="sm" icon={<Copy size={10} />} onClick={(e) => { e.stopPropagation(); copyToClipboard(asset.content, asset.type) }}>
                            Copy
                          </Button>
                          <Badge variant="status" color={asset.status === 'published' ? 'success' : 'muted'}>
                            {asset.status}
                          </Badge>
                        </div>
                      </div>
                      {asset.content && (
                        <p style={{
                          fontSize: '0.85rem',
                          color: c.textSecondary,
                          lineHeight: 1.5,
                          maxHeight: '60px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {asset.content.slice(0, 200)}{asset.content.length > 200 ? '...' : ''}
                        </p>
                      )}
                      <p style={{ fontSize: '0.7rem', color: c.textMuted, marginTop: '6px' }}>
                        {new Date(asset.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Bundle Detail Modal */}
      {selectedBundle && (
        <div
          onClick={() => { setSelectedBundle(null); setBundleAssets([]) }}
          style={{ position: 'fixed', inset: 0, background: c.overlay || 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', justifyContent: 'center', paddingTop: '60px', paddingBottom: '40px', overflowY: 'auto', animation: 'fadeIn 0.2s ease' }}
        >
          <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '700px', padding: '28px', height: 'fit-content', animation: 'fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: c.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedBundle.topic}</h3>
                  {getStatusBadge(selectedBundle.status)}
                </div>
                <p style={{ fontSize: '0.8rem', color: c.textTertiary, marginTop: '2px' }}>
                  {selectedBundle.trade} &bull; {bundleAssets.length} assets
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                {['researching', 'awaiting_strategy_approval', 'creating'].includes(selectedBundle.status) && (
                  <Button variant="danger" size="sm" icon={<X size={14} />} onClick={() => setCancelConfirmOpen(true)} disabled={cancelling} loading={cancelling}>
                    Cancel
                  </Button>
                )}
                {bundleAssets.length > 0 && (
                  <>
                    <Button variant="ghost" size="sm" icon={<Copy size={14} />} onClick={() => copyAllAssets(bundleAssets)}>Copy All</Button>
                    <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => downloadAsZip(bundleAssets, selectedBundle.topic)}>ZIP</Button>
                    <Button variant="ghost" size="sm" icon={<Bookmark size={14} />} onClick={() => setShowSaveTemplate(true)}>Template</Button>
                  </>
                )}
                <button onClick={() => { setSelectedBundle(null); setBundleAssets([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textTertiary, padding: '4px' }}>
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Tabbed Layout */}
            <Tabs value={bundleDetailTab} onValueChange={setBundleDetailTab}>
              <TabsList>
                <TabsTrigger value="research" disabled={!selectedBundle.research_findings && selectedBundle.status !== 'researching' && selectedBundle.status !== 'awaiting_strategy_approval'}>
                  Research
                </TabsTrigger>
                <TabsTrigger value="content">
                  Content ({bundleAssets.length})
                </TabsTrigger>
                <TabsTrigger value="comments">
                  <MessageSquare size={13} /> Comments ({comments.length})
                </TabsTrigger>
              </TabsList>

              {/* Research Tab */}
              <TabsContent value="research">
                <div style={{ marginTop: '16px' }}>
                  {/* Research Timeout Warning */}
                  {researchTimeout && selectedBundle.status === 'researching' && (
                    <Alert style={{ marginBottom: '16px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.25)', color: '#fbbf24' }}>
                      <AlertDescription>
                        Research is taking longer than expected. The agent may still be working. If this persists, try closing and re-opening the bundle.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Research Progress / Findings */}
                  {(selectedBundle.status === 'researching' || selectedBundle.research_findings) && (
                    <div style={{ marginBottom: '20px' }}>
                      <ResearchPanel
                        bundle={{
                          id: selectedBundle.id,
                          topic: selectedBundle.topic || '',
                          trade: selectedBundle.trade || '',
                          status: selectedBundle.status,
                          research_findings: selectedBundle.research_findings,
                          research_progress: selectedBundle.research_progress,
                        } as any}
                        expanded={researchExpanded}
                        onToggleExpanded={() => setResearchExpanded(!researchExpanded)}
                        onReload={() => { if (selectedBundle) handleViewBundle(selectedBundle) }}
                      />
                    </div>
                  )}

                  {/* Strategy Approval Section */}
                  {selectedBundle.status === 'awaiting_strategy_approval' && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  background: 'rgba(168, 85, 247, 0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <FlaskConical size={18} style={{ color: '#a855f7' }} />
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: 0 }}>Strategy Review</h4>
                    {strategyDoc && (strategyDoc as Record<string, unknown>).strategy_confidence != null ? (
                      <span style={{
                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px',
                        background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', fontWeight: 600,
                      }}>
                        {String((strategyDoc as Record<string, unknown>).strategy_confidence)}% confidence
                      </span>
                    ) : null}
                  </div>

                  {strategyLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 0' }}>
                      <Loader size={16} className="animate-spin" style={{ color: '#a855f7' }} />
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading strategy...</span>
                    </div>
                  ) : strategyDoc ? (
                    <>
                      {/* Narrative */}
                      {(strategyDoc as Record<string, unknown>).overall_narrative && (
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: '16px' }}>
                          {String((strategyDoc as Record<string, unknown>).overall_narrative)}
                        </p>
                      )}

                      {/* Platform Strategy Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                        {['linkedin_strategy', 'email_strategy', 'instagram_strategy', 'video_strategy'].map((key) => {
                          const strategy = (strategyDoc as Record<string, Record<string, unknown>>)[key]
                          if (!strategy) return null
                          const labels: Record<string, string> = {
                            linkedin_strategy: 'LinkedIn',
                            email_strategy: 'Email',
                            instagram_strategy: 'Instagram',
                            video_strategy: 'Video',
                          }
                          return (
                            <div key={key} style={{
                              padding: '12px',
                              borderRadius: '10px',
                              border: '1px solid rgba(255,255,255,0.06)',
                              background: 'rgba(15, 15, 26, 0.5)',
                            }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a855f7', textTransform: 'uppercase' as const, marginBottom: '8px' }}>
                                {labels[key] || key}
                              </div>
                              {strategy.hook != null && (
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                                  <strong style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Hook: </strong>{String(strategy.hook)}
                                </div>
                              )}
                              {strategy.angle != null && (
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                                  <strong style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Angle: </strong>{String(strategy.angle)}
                                </div>
                              )}
                              {strategy.cta != null && (
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                                  <strong style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>CTA: </strong>{String(strategy.cta)}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={handleApproveStrategy}
                          disabled={approvingStrategy || regeneratingStrategy}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '10px',
                            border: 'none',
                            background: approvingStrategy ? 'rgba(34, 197, 94, 0.3)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: approvingStrategy ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          {approvingStrategy ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                          {approvingStrategy ? 'Approving...' : 'Approve & Create Content'}
                        </button>
                        <button
                          onClick={handleRegenerateStrategy}
                          disabled={approvingStrategy || regeneratingStrategy}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            background: 'transparent',
                            color: '#a855f7',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: regeneratingStrategy ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {regeneratingStrategy ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                          Regenerate
                        </button>
                      </div>
                    </>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
                      Strategy is being generated from research findings...
                    </p>
                  )}
                </div>
              </div>
            )}
                </div>
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content">
                <div style={{ marginTop: '16px' }}>
            {bundleAssetsLoading ? (
              <SkeletonList count={3} />
            ) : bundleAssets.length === 0 ? (
              <EmptyState
                icon="📝"
                title={selectedBundle.status === 'creating' ? 'Content is being created...' : selectedBundle.status === 'cancelled' ? 'Pipeline was cancelled' : 'No content assets yet'}
                description={selectedBundle.status === 'creating' ? 'Assets will appear as they are generated.' : 'Approve the strategy to begin content creation.'}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                {bundleAssets.map((asset) => {
                  const isExpanded = expandedAssetIds.has(asset.id)
                  const isLong = asset.content.length > 300
                  return (
                  <div key={asset.id} style={{ padding: '16px', borderRadius: '10px', border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Badge variant="level" color="accent" style={{ textTransform: 'uppercase' }}>{asset.type}</Badge>
                        {asset.version && asset.version > 1 && (
                          <Badge variant="count" color="info">v{asset.version}</Badge>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Button variant="ghost" size="sm" icon={<RefreshCw size={11} />} onClick={() => setCompareAsset(asset)}>Regenerate</Button>
                        <Button variant="ghost" size="sm" icon={<Copy size={12} />} onClick={() => copyToClipboard(asset.content, asset.type)}>Copy</Button>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      maxHeight: isExpanded ? 'none' : '200px', overflow: isExpanded ? 'visible' : 'hidden',
                      position: 'relative' as const,
                    }}>
                      {asset.content}
                      {!isExpanded && isLong && (
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
                          background: 'linear-gradient(transparent, rgba(15, 15, 26, 0.95))',
                        }} />
                      )}
                    </div>
                    {isLong && (
                      <button
                        onClick={() => setExpandedAssetIds(prev => {
                          const next = new Set(prev)
                          if (next.has(asset.id)) next.delete(asset.id)
                          else next.add(asset.id)
                          return next
                        })}
                        style={{ background: 'none', border: 'none', color: '#a855f7', fontSize: '0.8rem', cursor: 'pointer', marginTop: '6px', padding: 0, fontWeight: 500 }}
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                    {/* Research Influence Tags */}
                    {asset.research_influence && Object.keys(asset.research_influence).length > 0 && (
                      <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.1)' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(168, 85, 247, 0.6)', textTransform: 'uppercase' as const, marginBottom: '6px' }}>AI Research Used</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {Object.entries(asset.research_influence).map(([key, val]) => (
                            <span key={key} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)' }} title={val}>
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* HeyGen Video Generation / Player */}
                    {asset.type === 'heygen' && (
                      <div style={{ marginTop: '12px' }}>
                        {asset.metadata?.video_url ? (
                          <VideoPlayer
                            videoUrl={asset.metadata.video_url as string}
                            thumbnailUrl={(asset.metadata.thumbnail_url as string) || null}
                            duration={(asset.metadata.duration as number) || null}
                            expiresAt={(asset.metadata.video_url_expires_at as string) || null}
                            status="completed"
                            onRetry={() => handleGenerateVideo(selectedBundle!.id, asset)}
                          />
                        ) : (() => {
                          // Check if there's an active job for this asset
                          const activeJob = Object.values(videoJobs).find(
                            j => j.asset_id === asset.id && (j.status === 'pending' || j.status === 'processing')
                          )
                          const failedJob = Object.values(videoJobs).find(
                            j => j.asset_id === asset.id && j.status === 'failed'
                          )
                          if (activeJob) {
                            return (
                              <VideoPlayer
                                videoUrl={null}
                                status={activeJob.status as string}
                              />
                            )
                          }
                          if (failedJob) {
                            return (
                              <VideoPlayer
                                videoUrl={null}
                                status="failed"
                                onRetry={() => handleRetryJob(failedJob.id as string)}
                              />
                            )
                          }
                          return (
                            <button
                              onClick={() => handleGenerateVideo(selectedBundle!.id, asset)}
                              disabled={generatingVideo === selectedBundle!.id}
                              style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: generatingVideo === selectedBundle!.id
                                  ? 'rgba(249, 115, 22, 0.3)'
                                  : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: generatingVideo === selectedBundle!.id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: generatingVideo === selectedBundle!.id
                                  ? 'none' : '0 4px 15px rgba(249, 115, 22, 0.3)',
                              }}
                            >
                              {generatingVideo === selectedBundle!.id ? (
                                <><Loader size={14} className="animate-spin" /> Generating...</>
                              ) : (
                                <><Film size={14} /> Generate Video</>
                              )}
                            </button>
                          )
                        })()}
                      </div>
                    )}
                    {/* Generated Images Grid */}
                    {asset.type === 'image' && Array.isArray((asset.metadata as Record<string, unknown>)?.images) && ((asset.metadata as Record<string, unknown>).images as Array<{ url: string; size_name: string }>).length > 0 && (
                      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {((asset.metadata as Record<string, unknown>).images as Array<{ url: string; size_name: string }>).map((img, idx) => (
                          <div key={idx} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.url} alt={`Generated ${img.size_name}`} style={{ width: '100%', display: 'block' }} />
                            <div style={{ padding: '6px 10px', background: 'rgba(15,15,26,0.9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' as const }}>{img.size_name}</span>
                              <a href={img.url} download target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: '#22c55e', textDecoration: 'none' }}>
                                Download
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {asset.type === 'image' && !Array.isArray((asset.metadata as Record<string, unknown>)?.images) && (
                      <div style={{ marginTop: '12px', padding: '16px', borderRadius: '8px', background: 'rgba(102, 126, 234, 0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Loader size={14} className="animate-spin" style={{ color: '#667eea' }} />
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>Generating images...</span>
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            )}
                </div>
              </TabsContent>

              {/* Comments Tab */}
              <TabsContent value="comments">
                <div style={{ marginTop: '16px' }}>
              {comments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                  {comments.map(comment => (
                    <div key={comment.id} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{comment.author}</span>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !addingComment) handleAddComment() }}
                  placeholder="Add a comment..."
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(15, 15, 26, 0.8)', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const,
                  }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={addingComment || !newComment.trim()}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background: addingComment || !newComment.trim() ? 'rgba(102, 126, 234, 0.2)' : 'rgba(102, 126, 234, 0.3)',
                    color: '#667eea', fontSize: '0.85rem', fontWeight: 600,
                    cursor: addingComment || !newComment.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {addingComment ? '...' : 'Post'}
                </button>
              </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Save as Template inline form */}
            {showSaveTemplate && (
              <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', border: '1px solid rgba(234, 179, 8, 0.2)', background: 'rgba(234, 179, 8, 0.05)' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Template Name</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., HVAC Spring Campaign"
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(15, 15, 26, 0.8)', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const,
                    }}
                  />
                  <button
                    onClick={handleSaveAsTemplate}
                    disabled={savingTemplate || !templateName.trim()}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', border: 'none',
                      background: savingTemplate || !templateName.trim() ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.3)',
                      color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600, cursor: savingTemplate || !templateName.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {savingTemplate ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setShowSaveTemplate(false); setTemplateName('') }}
                    style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cancel Confirmation Dialog */}
          {cancelConfirmOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div className="glass-card" style={{ padding: '24px', maxWidth: '400px', width: '90%' }}>
                <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
                  Cancel Pipeline?
                </h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.5 }}>
                  This will cancel the content pipeline for &ldquo;{selectedBundle.topic}&rdquo;. Any running agent sessions will be abandoned. This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setCancelConfirmOpen(false)}
                    disabled={cancelling}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Keep Running
                  </button>
                  <button
                    onClick={handleCancelBundle}
                    disabled={cancelling}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.85rem', fontWeight: 600, cursor: cancelling ? 'not-allowed' : 'pointer' }}
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel Pipeline'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Asset Regeneration Modal */}
      {compareAsset && (
        <AssetCompare
          asset={compareAsset}
          onClose={() => setCompareAsset(null)}
          onRegenerate={() => {
            if (selectedBundle) handleViewBundle(selectedBundle)
          }}
          showToast={showToast as ((toast: { type: 'success' | 'error' | 'info'; title: string; message: string; duration?: number }) => void) | undefined}
        />
      )}

      {/* Import Content Modal */}
      {showImportModal && (
        <div
          onClick={() => { if (!importing) setShowImportModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', justifyContent: 'center', paddingTop: '80px', paddingBottom: '40px' }}
        >
          <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '550px', padding: '28px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Import Content</h3>
              <button onClick={() => setShowImportModal(false)} disabled={importing} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Content
                </label>
                <textarea
                  value={importForm.content}
                  onChange={(e) => setImportForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Paste your content here..."
                  rows={6}
                  disabled={importing}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(15, 15, 26, 0.8)', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'vertical',
                    fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: '8px' }}>
                    Type
                  </label>
                  <select
                    value={importForm.type}
                    onChange={(e) => setImportForm(p => ({ ...p, type: e.target.value }))}
                    disabled={importing}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(15, 15, 26, 0.8)', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' as const,
                    }}
                  >
                    <option value="email">Email</option>
                    <option value="linkedin">LinkedIn Post</option>
                    <option value="heygen">Video Script</option>
                    <option value="image">Image Description</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: '8px' }}>
                    Industry / Niche
                  </label>
                  <input
                    type="text"
                    list="industry-suggestions-import"
                    value={importForm.trade}
                    onChange={(e) => setImportForm(p => ({ ...p, trade: e.target.value }))}
                    placeholder="e.g., Real Estate, Fitness, SaaS..."
                    disabled={importing}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(15, 15, 26, 0.8)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const,
                    }}
                  />
                  <datalist id="industry-suggestions-import">
                    {INDUSTRY_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              <button
                onClick={handleImportContent}
                disabled={importing || !importForm.content.trim()}
                style={{
                  padding: '12px 24px', borderRadius: '10px', border: 'none',
                  background: importing || !importForm.content.trim() ? 'rgba(168, 85, 247, 0.3)' : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                  color: '#fff', fontWeight: 600, fontSize: '0.9rem',
                  cursor: importing || !importForm.content.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {importing && <Loader size={16} className="animate-spin" />}
                {importing ? 'Importing...' : 'Import Content'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
