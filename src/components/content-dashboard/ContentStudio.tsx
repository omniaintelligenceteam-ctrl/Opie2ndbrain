'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import type { Toast } from '../../hooks/useRealTimeData'
import VideoPlayer from './VideoPlayer'

interface ContentBundle {
  id: string
  topic: string
  trade?: string
  quality_score: number
  status: string
  created_at: string
}

interface ContentAsset {
  id: string
  bundle_id: string
  type: string
  content: string
  status: string
  metadata: Record<string, unknown> | null
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

const TRADE_OPTIONS = [
  'HVAC', 'Plumbing', 'Electrical', 'Roofing',
  'General Contracting', 'Landscaping', 'Painting', 'Solar'
]

// Map UI labels to DB asset types
const ASSET_TYPE_MAP: Record<string, string> = {
  'Emails': 'email',
  'Posts': 'linkedin',
  'Videos': 'heygen',
  'Images': 'image',
}

export default function ContentStudio({ supabase, onRefresh, showToast }: ContentStudioProps) {
  const [bundles, setBundles] = useState<ContentBundle[]>([])
  const [selectedBundle, setSelectedBundle] = useState<ContentBundle | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ topic: '', trade: 'HVAC' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
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
  const [importForm, setImportForm] = useState({ content: '', type: 'email', trade: 'HVAC' })
  const [importing, setImporting] = useState(false)
  const [generatingVideo, setGeneratingVideo] = useState<string | null>(null)
  const [videoJobs, setVideoJobs] = useState<Record<string, Record<string, unknown>>>({})
  const [selectedAvatar, setSelectedAvatar] = useState<{ avatar_id: string; avatar_name: string; default_voice_id: string } | null>(null)
  const [comments, setComments] = useState<{ id: string; author: string; content: string; created_at: string }[]>([])
  const [newComment, setNewComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)

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
  const fetchBundles = useCallback(async () => {
    try {
      const response = await fetch('/api/content-dashboard/bundles?limit=5')
      const data = await response.json()
      if (data.success) {
        setBundles(data.data.bundles || [])
      }
    } catch (err) {
      console.error('Failed to fetch bundles:', err)
    }
  }, [])

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

  // Load data on mount
  useEffect(() => {
    fetchBundles()
    fetchAssetCounts()

    // Real-time subscription for bundles
    if (supabase) {
      const channel = supabase
        .channel('content_bundles_monitor')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'content_bundles' },
          () => {
            fetchBundles()
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
  }, [fetchBundles, fetchAssetCounts, supabase])

  // Create bundle via API
  const handleCreateBundle = useCallback(async () => {
    if (!createForm.topic.trim()) {
      setCreateError('Please enter a topic')
      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/content-dashboard/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: createForm.topic.trim(),
          trade: createForm.trade,
        }),
      })

      if (!response.ok) throw new Error('Failed to create bundle')

      const data = await response.json()
      if (data.success) {
        setCreateForm({ topic: '', trade: 'HVAC' })
        setShowCreateModal(false)
        fetchBundles()
        fetchAssetCounts()
        onRefresh?.()
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create bundle')
    } finally {
      setCreating(false)
    }
  }, [createForm, onRefresh, fetchBundles, fetchAssetCounts])

  // View all assets
  const handleViewAllAssets = useCallback(async () => {
    setShowAssets(true)
    setAssetsLoading(true)
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
    try {
      const response = await fetch(`/api/content-dashboard/bundles/${bundle.id}`)
      const data = await response.json()
      if (data.success) {
        setBundleAssets(data.data.content_assets || [])
      }
    } catch (err) {
      console.error('Failed to fetch bundle assets:', err)
      setBundleAssets([])
    } finally {
      setBundleAssetsLoading(false)
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
  }, [fetchComments, startPollingJob])

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
      {/* Asset Library */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {assetTypes.map((asset) => (
          <div
            key={asset.label}
            className="card-hover"
            style={{
              padding: '22px',
              borderRadius: '14px',
              background: 'rgba(15, 15, 26, 0.7)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.06)',
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
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                {asset.label}
              </span>
            </div>
            <p style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {asset.count}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Bundles */}
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
          <TrendingUp size={18} style={{ color: '#a855f7' }} />
          Recent Content Bundles
        </h3>

        {bundles.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.95rem' }}>No content bundles yet.</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', marginTop: '6px' }}>
              Click &quot;Create New Bundle&quot; to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bundles.slice(0, 5).map((bundle) => (
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{bundle.topic}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                      {bundle.trade} {bundle.quality_score > 0 && `• Quality: ${bundle.quality_score}/100`}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    ...(bundle.status === 'complete'
                      ? { background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }
                      : { background: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24' }),
                  }}>
                    {bundle.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Templates Library */}
      {templates.length > 0 && (
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
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginLeft: '4px' }}>
              ({templates.length})
            </span>
          </h3>
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
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
          <Plus size={16} />
          Create New Bundle
        </button>
        <button
          onClick={handleViewAllAssets}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
          <Eye size={16} />
          View All Assets
        </button>
        <button
          onClick={() => setShowImportModal(true)}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
          <FileUp size={16} />
          Import Content
        </button>
      </div>

      {/* Create Bundle Modal */}
      {showCreateModal && (
        <div
          onClick={() => { if (!creating) setShowCreateModal(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '80px',
            paddingBottom: '40px',
          }}
        >
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '480px',
              padding: '28px',
              height: 'fit-content',
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
                  placeholder="e.g., HVAC maintenance tips for spring"
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
                  Trade
                </label>
                <select
                  value={createForm.trade}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, trade: e.target.value }))}
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(15, 15, 26, 0.8)',
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                >
                  {TRADE_OPTIONS.map((trade) => (
                    <option key={trade} value={trade}>{trade}</option>
                  ))}
                </select>
              </div>

              {createError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  fontSize: '0.85rem',
                }}>
                  {createError}
                </div>
              )}

              <button
                onClick={handleCreateBundle}
                disabled={creating}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: creating
                    ? 'rgba(168, 85, 247, 0.5)'
                    : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: creating ? 'none' : '0 4px 15px rgba(168, 85, 247, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {creating && <Loader size={16} className="animate-spin" />}
                {creating ? 'Creating Bundle...' : 'Create Bundle'}
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
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '60px',
            paddingBottom: '40px',
            overflowY: 'auto',
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
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                All Content Assets
              </h3>
              <button
                onClick={() => setShowAssets(false)}
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

            {assetsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                <Loader size={20} className="animate-spin" style={{ color: '#667eea' }} />
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Loading assets...</span>
              </div>
            ) : allAssets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)' }}>No assets yet. Create a bundle to generate content.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                {allAssets.map((asset) => (
                  <div
                    key={asset.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(168, 85, 247, 0.15)',
                        color: '#a855f7',
                        fontWeight: 600,
                        textTransform: 'uppercase' as const,
                      }}>
                        {asset.type}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(asset.content, asset.type) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '5px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', cursor: 'pointer' }}
                        >
                          <Copy size={10} /> Copy
                        </button>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          ...(asset.status === 'published'
                            ? { background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }
                            : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }),
                        }}>
                          {asset.status}
                        </span>
                      </div>
                    </div>
                    {asset.content && (
                      <p style={{
                        fontSize: '0.85rem',
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: 1.5,
                        maxHeight: '60px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {asset.content.slice(0, 200)}{asset.content.length > 200 ? '...' : ''}
                      </p>
                    )}
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: '6px' }}>
                      {new Date(asset.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bundle Detail Modal */}
      {selectedBundle && (
        <div
          onClick={() => { setSelectedBundle(null); setBundleAssets([]) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', justifyContent: 'center', paddingTop: '60px', paddingBottom: '40px', overflowY: 'auto' }}
        >
          <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '700px', padding: '28px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{selectedBundle.topic}</h3>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{selectedBundle.trade} • {bundleAssets.length} assets</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {bundleAssets.length > 0 && (
                  <>
                    <button onClick={() => copyAllAssets(bundleAssets)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', border: 'none', background: 'rgba(102, 126, 234, 0.15)', color: '#667eea', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                      <Copy size={14} /> Copy All
                    </button>
                    <button onClick={() => downloadAsZip(bundleAssets, selectedBundle.topic)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', border: 'none', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                      <Download size={14} /> ZIP
                    </button>
                    <a href={generateMailtoLink(bundleAssets, selectedBundle.topic)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                      <Mail size={14} /> Email
                    </a>
                    <button onClick={() => setShowSaveTemplate(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', border: 'none', background: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                      <Bookmark size={14} /> Template
                    </button>
                  </>
                )}
                <button onClick={() => { setSelectedBundle(null); setBundleAssets([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                  <X size={22} />
                </button>
              </div>
            </div>

            {bundleAssetsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                <Loader size={20} className="animate-spin" style={{ color: '#667eea' }} />
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Loading assets...</span>
              </div>
            ) : bundleAssets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)' }}>No assets in this bundle yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                {bundleAssets.map((asset) => (
                  <div key={asset.id} style={{ padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase' as const }}>{asset.type}</span>
                      <button onClick={() => copyToClipboard(asset.content, asset.type)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <Copy size={12} /> Copy
                      </button>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '200px', overflow: 'auto' }}>
                      {asset.content}
                    </div>
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
                ))}
              </div>
            )}

            {/* Comments Section */}
            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                Comments ({comments.length})
              </h4>
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
        </div>
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
                    Trade
                  </label>
                  <select
                    value={importForm.trade}
                    onChange={(e) => setImportForm(p => ({ ...p, trade: e.target.value }))}
                    disabled={importing}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(15, 15, 26, 0.8)', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' as const,
                    }}
                  >
                    {TRADE_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
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
