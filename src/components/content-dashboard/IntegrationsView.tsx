'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Webhook,
  Plus,
  X,
  Loader,
  Trash2,
  Zap,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import type { Toast } from '../../hooks/useRealTimeData'

interface WebhookConfig {
  id: string
  name: string
  url: string
  events: string[]
  secret: string | null
  enabled: boolean
  last_triggered: string | null
  last_status: number | null
  created_at: string
}

interface IntegrationsViewProps {
  showToast?: (toast: Omit<Toast, 'id'>) => string
}

const EVENT_TYPES = [
  { value: 'workflow.completed', label: 'Workflow Completed' },
  { value: 'workflow.failed', label: 'Workflow Failed' },
  { value: 'bundle.created', label: 'Bundle Created' },
  { value: 'asset.published', label: 'Asset Published' },
]

export default function IntegrationsView({ showToast }: IntegrationsViewProps) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', url: '', events: [] as string[], secret: '' })
  const [creating, setCreating] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await fetch('/api/content-dashboard/webhooks')
      const data = await response.json()
      if (data.success) setWebhooks(data.data.webhooks || [])
    } catch (err) {
      console.error('Failed to fetch webhooks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWebhooks()
  }, [fetchWebhooks])

  const handleCreate = async () => {
    if (!createForm.name || !createForm.url) return
    setCreating(true)
    try {
      const response = await fetch('/api/content-dashboard/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          url: createForm.url,
          events: createForm.events,
          secret: createForm.secret || undefined,
        }),
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'success', title: 'Webhook Created', message: `"${createForm.name}" is ready`, duration: 3000 })
        setShowCreateModal(false)
        setCreateForm({ name: '', url: '', events: [], secret: '' })
        fetchWebhooks()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast?.({ type: 'error', title: 'Failed', message: err.message || 'Could not create webhook', duration: 5000 })
    } finally {
      setCreating(false)
    }
  }

  const handleTest = async (webhookId: string) => {
    setTesting(webhookId)
    try {
      const response = await fetch(`/api/content-dashboard/webhooks/${webhookId}/test`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({
          type: data.data.status < 400 ? 'success' : 'warning',
          title: `Test ${data.data.status < 400 ? 'Succeeded' : 'Failed'}`,
          message: `Status ${data.data.status} ${data.data.statusText}`,
          duration: 4000,
        })
        fetchWebhooks()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast?.({ type: 'error', title: 'Test Failed', message: err.message || 'Could not reach webhook URL', duration: 5000 })
    } finally {
      setTesting(null)
    }
  }

  const handleToggle = async (webhook: WebhookConfig) => {
    try {
      const response = await fetch('/api/content-dashboard/webhooks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: webhook.id, enabled: !webhook.enabled }),
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'info', title: webhook.enabled ? 'Webhook Disabled' : 'Webhook Enabled', duration: 2000 })
        fetchWebhooks()
      }
    } catch (err) {
      console.error('Failed to toggle webhook:', err)
    }
  }

  const handleDelete = async (webhookId: string) => {
    try {
      const response = await fetch('/api/content-dashboard/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: webhookId }),
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'info', title: 'Webhook Deleted', duration: 2000 })
        fetchWebhooks()
      }
    } catch (err) {
      console.error('Failed to delete webhook:', err)
    }
  }

  const toggleEvent = (event: string) => {
    setCreateForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Webhook size={20} style={{ color: '#06b6d4' }} />
          Webhook Integrations
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Plus size={14} /> Add Webhook
        </button>
      </div>

      {/* Webhooks List */}
      {loading ? (
        <div className="glass-card" style={{ padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Loader size={18} className="animate-spin" style={{ color: '#06b6d4' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Loading webhooks...</span>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Webhook size={32} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.95rem' }}>No webhooks configured.</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', marginTop: '6px' }}>
            Add a webhook to integrate with Zapier, Make, or custom services.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {webhooks.map(webhook => (
            <div key={webhook.id} className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>{webhook.name}</h4>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '3px 8px',
                      borderRadius: '20px',
                      ...(webhook.enabled
                        ? { background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }
                        : { background: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af' }),
                      fontWeight: 600,
                    }}>
                      {webhook.enabled ? 'Active' : 'Disabled'}
                    </span>
                    {webhook.last_status !== null && (
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        ...(webhook.last_status < 400
                          ? { background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }
                          : { background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }),
                      }}>
                        {webhook.last_status < 400 ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {webhook.last_status}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginBottom: '6px', wordBreak: 'break-all' }}>
                    {webhook.url}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {webhook.events.map(event => (
                      <span key={event} style={{
                        fontSize: '0.65rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(6, 182, 212, 0.1)',
                        color: '#06b6d4',
                        fontWeight: 500,
                      }}>
                        {event}
                      </span>
                    ))}
                  </div>
                  {webhook.last_triggered && (
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: '6px' }}>
                      Last triggered: {new Date(webhook.last_triggered).toLocaleString()}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '16px' }}>
                  <button
                    onClick={() => handleTest(webhook.id)}
                    disabled={testing === webhook.id}
                    style={{
                      padding: '6px 12px', borderRadius: '6px', border: 'none',
                      background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4',
                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    {testing === webhook.id ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
                    Test
                  </button>
                  <button
                    onClick={() => handleToggle(webhook)}
                    style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: webhook.enabled ? '#4ade80' : 'rgba(255,255,255,0.3)' }}
                    title={webhook.enabled ? 'Disable' : 'Enable'}
                  >
                    {webhook.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div
          onClick={() => { if (!creating) setShowCreateModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', justifyContent: 'center', paddingTop: '80px', paddingBottom: '40px' }}
        >
          <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '500px', padding: '28px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Add Webhook</h3>
              <button onClick={() => setShowCreateModal(false)} disabled={creating} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Zapier Workflow"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 15, 26, 0.8)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Webhook URL</label>
                <input
                  type="url"
                  value={createForm.url}
                  onChange={(e) => setCreateForm(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://hooks.zapier.com/..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 15, 26, 0.8)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Events</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {EVENT_TYPES.map(event => (
                    <button
                      key={event.value}
                      onClick={() => toggleEvent(event.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        ...(createForm.events.includes(event.value)
                          ? { background: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }),
                      }}
                    >
                      {event.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, marginBottom: '8px' }}>
                  Secret <span style={{ fontWeight: 400, textTransform: 'none' as const }}>(optional, for HMAC signing)</span>
                </label>
                <input
                  type="text"
                  value={createForm.secret}
                  onChange={(e) => setCreateForm(p => ({ ...p, secret: e.target.value }))}
                  placeholder="my-webhook-secret"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 15, 26, 0.8)', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const }}
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={creating || !createForm.name || !createForm.url}
                style={{
                  padding: '12px 24px', borderRadius: '10px', border: 'none',
                  background: creating || !createForm.name || !createForm.url ? 'rgba(6, 182, 212, 0.3)' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  color: '#fff', fontWeight: 600, fontSize: '0.9rem',
                  cursor: creating || !createForm.name || !createForm.url ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {creating && <Loader size={16} className="animate-spin" />}
                {creating ? 'Creating...' : 'Add Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
