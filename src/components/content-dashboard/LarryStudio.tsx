'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

interface Toast {
  id: string
  type: 'success' | 'error'
  title: string
  message: string
  duration?: number
}

interface LarryJob {
  id: string
  topic: string
  status: 'generating' | 'complete' | 'failed'
  video_url?: string | null
  error?: string | null
  created_at: string
  updated_at?: string
}

interface LarryStudioProps {
  supabase: SupabaseClient | null
  showToast?: (toast: Omit<Toast, 'id'>) => string
}

const glassCard = {
  borderRadius: '14px',
  background: 'rgba(15, 15, 26, 0.7)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.06)',
  padding: '24px',
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  generating: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', label: 'Generating' },
  complete: { bg: 'rgba(34,197,94,0.15)', text: '#4ade80', label: 'Complete' },
  failed: { bg: 'rgba(239,68,68,0.15)', text: '#f87171', label: 'Failed' },
}

export default function LarryStudio({ supabase, showToast }: LarryStudioProps) {
  const [topic, setTopic] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [jobs, setJobs] = useState<LarryJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/content-dashboard/larry/jobs')
      const data = await res.json()
      if (data.success) {
        setJobs(data.jobs || [])
      }
    } catch (err) {
      console.error('Failed to fetch Larry jobs:', err)
    } finally {
      setLoadingJobs(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // Auto-refresh while any job is generating
  useEffect(() => {
    const hasGenerating = jobs.some((j) => j.status === 'generating')
    if (!hasGenerating) return

    const interval = setInterval(fetchJobs, 10000)
    return () => clearInterval(interval)
  }, [jobs, fetchJobs])

  const handleGenerate = async () => {
    const trimmed = topic.trim()
    if (!trimmed) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/content-dashboard/larry/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: trimmed }),
      })
      const data = await res.json()
      if (data.success) {
        showToast?.({ type: 'success', title: 'Video Queued', message: `Job ${data.jobId} started for "${trimmed}"` })
        setTopic('')
        await fetchJobs()
      } else {
        throw new Error(data.error || 'Generation failed')
      }
    } catch (err: any) {
      showToast?.({ type: 'error', title: 'Generation Failed', message: err.message || 'Unknown error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.6rem' }}>🎬</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Larry Studio
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)' }}>
            Generate TikTok videos with the Larry Skill pipeline
          </p>
        </div>
      </div>

      {/* Topic Input Card */}
      <div style={glassCard}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '10px' }}>
          Video Topic
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !submitting) handleGenerate() }}
            placeholder="e.g. 5 productivity tips for entrepreneurs..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#fff',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          <button
            onClick={handleGenerate}
            disabled={submitting || !topic.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: submitting || !topic.trim()
                ? 'rgba(102,126,234,0.3)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: submitting || !topic.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              opacity: submitting || !topic.trim() ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {submitting && (
              <span
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'larry-spin 0.8s linear infinite',
                }}
              />
            )}
            {submitting ? 'Generating...' : 'Generate TikTok Video'}
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div style={glassCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>Recent Jobs</h3>
          <button
            onClick={fetchJobs}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Refresh
          </button>
        </div>

        {loadingJobs ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
            Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
            No video jobs yet. Enter a topic above to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jobs.map((job) => {
              const status = statusColors[job.status] || statusColors.generating
              return (
                <div
                  key={job.id}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
                      {job.topic}
                    </span>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        background: status.bg,
                        color: status.text,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
                      {job.id}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
                      {new Date(job.created_at).toLocaleString()}
                    </span>
                  </div>

                  {job.status === 'complete' && job.video_url && (
                    <div style={{ marginTop: '4px' }}>
                      <video
                        src={job.video_url}
                        controls
                        style={{
                          width: '100%',
                          maxWidth: '400px',
                          borderRadius: '8px',
                          background: '#000',
                        }}
                      />
                    </div>
                  )}

                  {job.status === 'failed' && job.error && (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      color: '#f87171',
                      fontSize: '0.82rem',
                    }}>
                      {job.error}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Spinner keyframes */}
      <style>{`
        @keyframes larry-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
