'use client'

import { useState, useEffect, useCallback } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  Loader,
  Send,
  Trash2
} from 'lucide-react'
import type { Toast } from '../../hooks/useRealTimeData'

interface ScheduledAsset {
  id: string
  bundle_id: string
  type: string
  content: string
  status: string
  scheduled_for: string
  platform: string | null
  created_at: string
}

interface ScheduleViewProps {
  supabase: SupabaseClient | null
  showToast?: (toast: Omit<Toast, 'id'>) => string
}

const PLATFORM_OPTIONS = ['linkedin', 'instagram', 'email', 'twitter', 'facebook']

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: '#0a66c2',
  instagram: '#e4405f',
  email: '#a855f7',
  twitter: '#1da1f2',
  facebook: '#1877f2',
}

const TYPE_COLORS: Record<string, string> = {
  email: '#a855f7',
  linkedin: '#06b6d4',
  heygen: '#f97316',
  image: '#22c55e',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ScheduleView({ supabase, showToast }: ScheduleViewProps) {
  const [scheduled, setScheduled] = useState<ScheduledAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [availableAssets, setAvailableAssets] = useState<any[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    assetId: '',
    date: '',
    time: '09:00',
    platform: 'linkedin',
  })
  const [scheduling, setScheduling] = useState(false)

  const fetchScheduled = useCallback(async () => {
    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const from = new Date(year, month, 1).toISOString()
      const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

      const response = await fetch(`/api/content-dashboard/schedule?from=${from}&to=${to}`)
      const data = await response.json()
      if (data.success) {
        setScheduled(data.data.scheduled || [])
      }
    } catch (err) {
      console.error('Failed to fetch schedule:', err)
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    fetchScheduled()
  }, [fetchScheduled])

  // Real-time subscription
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel('schedule_monitor')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'content_assets' },
        () => fetchScheduled()
      )
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [supabase, fetchScheduled])

  const fetchAvailableAssets = async () => {
    setAssetsLoading(true)
    try {
      const response = await fetch('/api/content-dashboard/assets?limit=50')
      const data = await response.json()
      if (data.success) {
        // Only show unscheduled, non-published assets
        setAvailableAssets(
          (data.data.assets || []).filter((a: any) => a.status !== 'published' && a.status !== 'scheduled')
        )
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err)
    } finally {
      setAssetsLoading(false)
    }
  }

  const handleSchedule = async () => {
    if (!scheduleForm.assetId || !scheduleForm.date) return
    setScheduling(true)
    try {
      const scheduledFor = new Date(`${scheduleForm.date}T${scheduleForm.time}:00`).toISOString()
      const response = await fetch('/api/content-dashboard/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: scheduleForm.assetId,
          scheduled_for: scheduledFor,
          platform: scheduleForm.platform,
        }),
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'success', title: 'Scheduled!', message: 'Asset scheduled for publishing', duration: 3000 })
        setShowScheduleModal(false)
        setScheduleForm({ assetId: '', date: '', time: '09:00', platform: 'linkedin' })
        fetchScheduled()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast?.({ type: 'error', title: 'Failed', message: err.message || 'Could not schedule asset', duration: 5000 })
    } finally {
      setScheduling(false)
    }
  }

  const handleUnschedule = async (assetId: string) => {
    try {
      const response = await fetch('/api/content-dashboard/schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'info', title: 'Unscheduled', message: 'Asset removed from schedule', duration: 3000 })
        fetchScheduled()
      }
    } catch (err) {
      console.error('Failed to unschedule:', err)
    }
  }

  const handlePublishNow = async (assetId: string) => {
    try {
      const asset = scheduled.find(a => a.id === assetId)
      const response = await fetch('/api/content-dashboard/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, platform: asset?.platform }),
      })
      const data = await response.json()
      if (data.success) {
        showToast?.({ type: 'success', title: 'Published!', message: 'Asset published successfully', duration: 3000 })
        fetchScheduled()
      }
    } catch (err) {
      console.error('Failed to publish:', err)
    }
  }

  // Calendar helpers
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i)

  const getScheduledForDay = (day: number) => {
    return scheduled.filter(a => {
      const d = new Date(a.scheduled_for)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  const selectedDayAssets = selectedDay
    ? scheduled.filter(a => {
        const d = new Date(a.scheduled_for)
        return d.getFullYear() === selectedDay.getFullYear() && d.getMonth() === selectedDay.getMonth() && d.getDate() === selectedDay.getDate()
      })
    : []

  // Next 7 days upcoming
  const upcoming = scheduled
    .filter(a => new Date(a.scheduled_for) >= today)
    .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
    .slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={20} style={{ color: '#667eea' }} />
          Content Schedule
        </h2>
        <button
          onClick={() => { setShowScheduleModal(true); fetchAvailableAssets() }}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Clock size={14} /> Schedule Asset
        </button>
      </div>

      {/* Calendar */}
      <div className="glass-card" style={{ padding: '24px' }}>
        {/* Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button
            onClick={() => setCurrentMonth(new Date(year, month - 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: '6px' }}
          >
            <ChevronLeft size={20} />
          </button>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(year, month + 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: '6px' }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', padding: '6px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '10px' }}>
            <Loader size={18} className="animate-spin" style={{ color: '#667eea' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Loading schedule...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />
              const dayAssets = getScheduledForDay(day)
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
              const isSelected = selectedDay?.getFullYear() === year && selectedDay?.getMonth() === month && selectedDay?.getDate() === day

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(new Date(year, month, day))}
                  style={{
                    padding: '8px',
                    minHeight: '70px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: isSelected
                      ? '1px solid rgba(102,126,234,0.5)'
                      : isToday
                      ? '1px solid rgba(102,126,234,0.25)'
                      : '1px solid rgba(255,255,255,0.04)',
                    background: isSelected
                      ? 'rgba(102,126,234,0.1)'
                      : isToday
                      ? 'rgba(102,126,234,0.05)'
                      : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#667eea' : 'rgba(255,255,255,0.6)',
                    marginBottom: '4px',
                  }}>
                    {day}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                    {dayAssets.slice(0, 3).map(a => (
                      <div
                        key={a.id}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: TYPE_COLORS[a.type] || '#667eea',
                        }}
                      />
                    ))}
                    {dayAssets.length > 3 && (
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>+{dayAssets.length - 3}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Day Detail */}
      {selectedDay && selectedDayAssets.length > 0 && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
            {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginLeft: '10px' }}>{selectedDayAssets.length} scheduled</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedDayAssets.map(asset => (
              <div key={asset.id} style={{
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: `${TYPE_COLORS[asset.type] || '#667eea'}20`,
                      color: TYPE_COLORS[asset.type] || '#667eea',
                      fontWeight: 600,
                      textTransform: 'uppercase' as const,
                    }}>
                      {asset.type}
                    </span>
                    {asset.platform && (
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: `${PLATFORM_COLORS[asset.platform] || '#6b7280'}20`,
                        color: PLATFORM_COLORS[asset.platform] || '#6b7280',
                        fontWeight: 600,
                      }}>
                        {asset.platform}
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                      {new Date(asset.scheduled_for).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {asset.content?.slice(0, 100) || 'No content'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handlePublishNow(asset.id)}
                    title="Publish now"
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#22c55e',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    <Send size={12} /> Publish
                  </button>
                  <button
                    onClick={() => handleUnschedule(asset.id)}
                    title="Unschedule"
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Schedule */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} style={{ color: '#667eea' }} />
          Upcoming
        </h3>
        {upcoming.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', textAlign: 'center', padding: '24px' }}>
            No upcoming scheduled content. Click &quot;Schedule Asset&quot; to get started.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcoming.map(asset => (
              <div key={asset.id} style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: TYPE_COLORS[asset.type] || '#667eea',
                  }} />
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                      {asset.type.toUpperCase()}
                    </span>
                    {asset.platform && (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginLeft: '8px' }}>
                        → {asset.platform}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                  {new Date(asset.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at{' '}
                  {new Date(asset.scheduled_for).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Asset Modal */}
      {showScheduleModal && (
        <div
          onClick={() => { if (!scheduling) setShowScheduleModal(false) }}
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
            style={{ width: '90%', maxWidth: '500px', padding: '28px', height: 'fit-content' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Schedule Asset</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                disabled={scheduling}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Asset Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Select Asset
                </label>
                {assetsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px' }}>
                    <Loader size={14} className="animate-spin" style={{ color: '#667eea' }} />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading assets...</span>
                  </div>
                ) : (
                  <select
                    value={scheduleForm.assetId}
                    onChange={(e) => setScheduleForm(p => ({ ...p, assetId: e.target.value }))}
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
                    <option value="">Choose an asset...</option>
                    {availableAssets.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        [{a.type.toUpperCase()}] {a.content?.slice(0, 60) || a.id}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date + Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: '8px' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm(p => ({ ...p, date: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(15, 15, 26, 0.8)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box' as const,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: '8px' }}>
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm(p => ({ ...p, time: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(15, 15, 26, 0.8)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box' as const,
                    }}
                  />
                </div>
              </div>

              {/* Platform */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: '8px' }}>
                  Platform
                </label>
                <select
                  value={scheduleForm.platform}
                  onChange={(e) => setScheduleForm(p => ({ ...p, platform: e.target.value }))}
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
                  {PLATFORM_OPTIONS.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSchedule}
                disabled={scheduling || !scheduleForm.assetId || !scheduleForm.date}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: scheduling || !scheduleForm.assetId || !scheduleForm.date
                    ? 'rgba(102, 126, 234, 0.3)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: scheduling || !scheduleForm.assetId || !scheduleForm.date ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {scheduling && <Loader size={16} className="animate-spin" />}
                {scheduling ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
