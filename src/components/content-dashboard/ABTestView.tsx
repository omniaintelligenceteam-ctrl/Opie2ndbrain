'use client'

import { useState, useEffect, useCallback } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  GitBranch,
  Plus,
  X,
  Loader,
  Trophy,
  BarChart3,
  Trash2,
  Eye
} from 'lucide-react'
import type { Toast } from '../../hooks/useRealTimeData'

interface ABTest {
  id: string
  name: string
  bundle_a_id: string
  bundle_b_id: string
  status: string
  winner: string | null
  metrics: {
    a: { views: number; clicks: number; engagement: number }
    b: { views: number; clicks: number; engagement: number }
  }
  created_at: string
  completed_at: string | null
  bundle_a?: { topic: string; trade: string; quality_score: number } | null
  bundle_b?: { topic: string; trade: string; quality_score: number } | null
}

interface ABTestDetail extends ABTest {
  bundle_a: { topic: string; trade: string; quality_score: number; assets: any[] } | null
  bundle_b: { topic: string; trade: string; quality_score: number; assets: any[] } | null
}

interface ABTestViewProps {
  supabase: SupabaseClient | null
  showToast?: (toast: Omit<Toast, 'id'>) => string
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af' },
  running: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
  completed: { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' },
}

export default function ABTestView({ supabase, showToast }: ABTestViewProps) {
  const [tests, setTests] = useState<ABTest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [bundles, setBundles] = useState<any[]>([])
  const [bundlesLoading, setBundlesLoading] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', bundleAId: '', bundleBId: '' })
  const [creating, setCreating] = useState(false)
  const [selectedTest, setSelectedTest] = useState<ABTestDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editMetrics, setEditMetrics] = useState<ABTest['metrics'] | null>(null)

  const fetchTests = useCallback(async () => {
    try {
      const response = await fetch('/api/content-dashboard/ab-tests')
      const data = await response.json()
      if (data.success) {
        setTests(data.data.tests || [])
      }
    } catch (err) {
      console.error('Failed to fetch A/B tests:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTests()
  }, [fetchTests])

  // Real-time subscription
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel('ab_tests_monitor')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ab_tests' },
        () => fetchTests()
      )
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [supabase, fetchTests])

  const fetchBundles = async () => {
    setBundlesLoading(true)
    try {
      const response = await fetch('/api/content-dashboard/bundles?limit=50')
      const data = await response.json()
      if (data.success) setBundles(data.data.bundles || [])
    } catch (err) {
      console.error('Failed to fetch bundles:', err)
    } finally {
      setBundlesLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createForm.name || !createForm.bundleAId || !createForm.bundleBId) return
    setCreating(true)
    try {
      const response = await fetch('/api/content-dashboard/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          bundleAId: createForm.bundleAId,
          bundleBId: createForm.bundleBId,
        }),
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'success', title: 'A/B Test Created', message: `"${createForm.name}" is ready`, duration: 3000 })
        setShowCreateModal(false)
        setCreateForm({ name: '', bundleAId: '', bundleBId: '' })
        fetchTests()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast?.({ type: 'error', title: 'Failed', message: err.message || 'Could not create test', duration: 5000 })
    } finally {
      setCreating(false)
    }
  }

  const handleViewDetail = async (test: ABTest) => {
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/content-dashboard/ab-tests/${test.id}`)
      const data = await response.json()
      if (data.success) {
        setSelectedTest(data.data)
        setEditMetrics(data.data.metrics || { a: { views: 0, clicks: 0, engagement: 0 }, b: { views: 0, clicks: 0, engagement: 0 } })
      }
    } catch (err) {
      console.error('Failed to fetch test detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleUpdateMetrics = async () => {
    if (!selectedTest || !editMetrics) return
    try {
      const response = await fetch(`/api/content-dashboard/ab-tests/${selectedTest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: editMetrics, status: 'running' }),
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'success', title: 'Metrics Updated', duration: 2000 })
        fetchTests()
        setSelectedTest(prev => prev ? { ...prev, metrics: editMetrics, status: 'running' } : null)
      }
    } catch (err) {
      console.error('Failed to update metrics:', err)
    }
  }

  const handleDeclareWinner = async (winner: 'a' | 'b') => {
    if (!selectedTest) return
    try {
      const response = await fetch(`/api/content-dashboard/ab-tests/${selectedTest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner }),
      })
      const data = await response.json()
      if (data.success) {
        const winnerLabel = winner === 'a' ? 'Variant A' : 'Variant B'
        showToast?.({ type: 'success', title: `${winnerLabel} Wins!`, message: `"${selectedTest.name}" completed`, duration: 4000 })
        setSelectedTest(null)
        fetchTests()
      }
    } catch (err) {
      console.error('Failed to declare winner:', err)
    }
  }

  const handleDelete = async (testId: string) => {
    try {
      const response = await fetch(`/api/content-dashboard/ab-tests/${testId}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'info', title: 'Test Deleted', duration: 2000 })
        fetchTests()
      }
    } catch (err) {
      console.error('Failed to delete test:', err)
    }
  }

  const MetricBar = ({ label, valueA, valueB }: { label: string; valueA: number; valueB: number }) => {
    const max = Math.max(valueA, valueB, 1)
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase' as const }}>
          {label}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#60a5fa', width: '50px', textAlign: 'right' }}>{valueA}</span>
          <div style={{ flex: 1, display: 'flex', gap: '4px' }}>
            <div style={{
              height: '20px',
              borderRadius: '4px 0 0 4px',
              background: 'rgba(59, 130, 246, 0.3)',
              width: `${(valueA / max) * 100}%`,
              transition: 'width 0.5s ease',
              minWidth: valueA > 0 ? '4px' : 0,
            }} />
            <div style={{
              height: '20px',
              borderRadius: '0 4px 4px 0',
              background: 'rgba(168, 85, 247, 0.3)',
              width: `${(valueB / max) * 100}%`,
              transition: 'width 0.5s ease',
              minWidth: valueB > 0 ? '4px' : 0,
            }} />
          </div>
          <span style={{ fontSize: '0.8rem', color: '#a855f7', width: '50px' }}>{valueB}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GitBranch size={20} style={{ color: '#a855f7' }} />
          A/B Tests
        </h2>
        <button
          onClick={() => { setShowCreateModal(true); fetchBundles() }}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Plus size={14} /> New A/B Test
        </button>
      </div>

      {/* Tests List */}
      {loading ? (
        <div className="glass-card" style={{ padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Loader size={18} className="animate-spin" style={{ color: '#a855f7' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Loading tests...</span>
        </div>
      ) : tests.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <GitBranch size={32} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.95rem' }}>No A/B tests yet.</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', marginTop: '6px' }}>
            Create a test to compare two content bundles.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tests.map(test => {
            const statusStyle = STATUS_STYLES[test.status] || STATUS_STYLES.draft
            return (
              <div
                key={test.id}
                className="glass-card card-hover"
                style={{ padding: '20px', cursor: 'pointer' }}
                onClick={() => handleViewDetail(test)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>{test.name}</h4>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        fontWeight: 600,
                      }}>
                        {test.status}
                      </span>
                      {test.winner && (
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '3px 8px',
                          borderRadius: '20px',
                          background: 'rgba(234, 179, 8, 0.15)',
                          color: '#fbbf24',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}>
                          <Trophy size={10} /> {test.winner === 'a' ? 'A' : 'B'} wins
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                      <span>A: {test.bundle_a?.topic || test.bundle_a_id.slice(0, 12)}</span>
                      <span>vs</span>
                      <span>B: {test.bundle_b?.topic || test.bundle_b_id.slice(0, 12)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleViewDetail(test) }}
                      style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(test.id) }}
                      style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <div
          onClick={() => { if (!creating) setShowCreateModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', justifyContent: 'center', paddingTop: '80px', paddingBottom: '40px' }}
        >
          <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '500px', padding: '28px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>New A/B Test</h3>
              <button onClick={() => setShowCreateModal(false)} disabled={creating} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Test Name
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., HVAC Email Subject Line Test"
                  disabled={creating}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(15, 15, 26, 0.8)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              {bundlesLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px' }}>
                  <Loader size={14} className="animate-spin" style={{ color: '#667eea' }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading bundles...</span>
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: '8px' }}>
                      Variant A (Bundle)
                    </label>
                    <select
                      value={createForm.bundleAId}
                      onChange={(e) => setCreateForm(p => ({ ...p, bundleAId: e.target.value }))}
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(15, 15, 26, 0.8)', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' as const,
                      }}
                    >
                      <option value="">Select bundle A...</option>
                      {bundles.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.topic} ({b.trade || 'no trade'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: '8px' }}>
                      Variant B (Bundle)
                    </label>
                    <select
                      value={createForm.bundleBId}
                      onChange={(e) => setCreateForm(p => ({ ...p, bundleBId: e.target.value }))}
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(15, 15, 26, 0.8)', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' as const,
                      }}
                    >
                      <option value="">Select bundle B...</option>
                      {bundles.filter((b: any) => b.id !== createForm.bundleAId).map((b: any) => (
                        <option key={b.id} value={b.id}>{b.topic} ({b.trade || 'no trade'})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={handleCreate}
                disabled={creating || !createForm.name || !createForm.bundleAId || !createForm.bundleBId}
                style={{
                  padding: '12px 24px', borderRadius: '10px', border: 'none',
                  background: creating || !createForm.name || !createForm.bundleAId || !createForm.bundleBId
                    ? 'rgba(168, 85, 247, 0.3)'
                    : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                  color: '#fff', fontWeight: 600, fontSize: '0.9rem',
                  cursor: creating || !createForm.name || !createForm.bundleAId || !createForm.bundleBId ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {creating && <Loader size={16} className="animate-spin" />}
                {creating ? 'Creating...' : 'Create A/B Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Detail Modal */}
      {(selectedTest || detailLoading) && (
        <div
          onClick={() => { setSelectedTest(null); setEditMetrics(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', justifyContent: 'center', paddingTop: '40px', paddingBottom: '40px', overflowY: 'auto' }}
        >
          <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '800px', padding: '28px', height: 'fit-content' }}>
            {detailLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '10px' }}>
                <Loader size={18} className="animate-spin" style={{ color: '#a855f7' }} />
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Loading test details...</span>
              </div>
            ) : selectedTest && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{selectedTest.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                      Created {new Date(selectedTest.created_at).toLocaleDateString()}
                      {selectedTest.completed_at && ` • Completed ${new Date(selectedTest.completed_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button onClick={() => { setSelectedTest(null); setEditMetrics(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                    <X size={22} />
                  </button>
                </div>

                {/* Side-by-side comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  {/* Variant A */}
                  <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: selectedTest.winner === 'a' ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255,255,255,0.06)',
                    background: selectedTest.winner === 'a' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.02)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa', padding: '2px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.15)' }}>A</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{selectedTest.bundle_a?.topic || 'Bundle A'}</span>
                      {selectedTest.winner === 'a' && <Trophy size={14} style={{ color: '#fbbf24' }} />}
                    </div>
                    {selectedTest.bundle_a?.assets?.slice(0, 2).map((asset: any) => (
                      <div key={asset.id} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#60a5fa', fontWeight: 600, textTransform: 'uppercase' as const }}>{asset.type}</span>
                        <p style={{ marginTop: '4px', maxHeight: '60px', overflow: 'hidden' }}>{asset.content?.slice(0, 150)}...</p>
                      </div>
                    ))}
                  </div>

                  {/* Variant B */}
                  <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: selectedTest.winner === 'b' ? '2px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255,255,255,0.06)',
                    background: selectedTest.winner === 'b' ? 'rgba(168, 85, 247, 0.05)' : 'rgba(255,255,255,0.02)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a855f7', padding: '2px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.15)' }}>B</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{selectedTest.bundle_b?.topic || 'Bundle B'}</span>
                      {selectedTest.winner === 'b' && <Trophy size={14} style={{ color: '#fbbf24' }} />}
                    </div>
                    {selectedTest.bundle_b?.assets?.slice(0, 2).map((asset: any) => (
                      <div key={asset.id} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase' as const }}>{asset.type}</span>
                        <p style={{ marginTop: '4px', maxHeight: '60px', overflow: 'hidden' }}>{asset.content?.slice(0, 150)}...</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metrics Comparison */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={16} style={{ color: '#667eea' }} /> Performance Metrics
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa' }}>Variant A</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a855f7' }}>Variant B</span>
                  </div>
                  {editMetrics && (
                    <>
                      <MetricBar label="Views" valueA={editMetrics.a.views} valueB={editMetrics.b.views} />
                      <MetricBar label="Clicks" valueA={editMetrics.a.clicks} valueB={editMetrics.b.clicks} />
                      <MetricBar label="Engagement" valueA={editMetrics.a.engagement} valueB={editMetrics.b.engagement} />
                    </>
                  )}
                </div>

                {/* Metric Inputs (only for non-completed tests) */}
                {selectedTest.status !== 'completed' && editMetrics && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>Update Metrics</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {/* A inputs */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa' }}>Variant A</span>
                        {(['views', 'clicks', 'engagement'] as const).map(metric => (
                          <div key={metric} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', width: '80px', textTransform: 'capitalize' as const }}>{metric}</label>
                            <input
                              type="number"
                              value={editMetrics.a[metric]}
                              onChange={(e) => setEditMetrics(prev => prev ? { ...prev, a: { ...prev.a, [metric]: parseInt(e.target.value) || 0 } } : null)}
                              style={{
                                flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(15, 15, 26, 0.8)', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      {/* B inputs */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a855f7' }}>Variant B</span>
                        {(['views', 'clicks', 'engagement'] as const).map(metric => (
                          <div key={metric} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', width: '80px', textTransform: 'capitalize' as const }}>{metric}</label>
                            <input
                              type="number"
                              value={editMetrics.b[metric]}
                              onChange={(e) => setEditMetrics(prev => prev ? { ...prev, b: { ...prev.b, [metric]: parseInt(e.target.value) || 0 } } : null)}
                              style={{
                                flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(15, 15, 26, 0.8)', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleUpdateMetrics}
                      style={{
                        marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                        background: 'rgba(102, 126, 234, 0.15)', color: '#667eea', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Save Metrics
                    </button>
                  </div>
                )}

                {/* Declare Winner */}
                {selectedTest.status !== 'completed' && (
                  <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                    <button
                      onClick={() => handleDeclareWinner('a')}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                        background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      }}
                    >
                      <Trophy size={16} /> A Wins
                    </button>
                    <button
                      onClick={() => handleDeclareWinner('b')}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                        background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      }}
                    >
                      <Trophy size={16} /> B Wins
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
