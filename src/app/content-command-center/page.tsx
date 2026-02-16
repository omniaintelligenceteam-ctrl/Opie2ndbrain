'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import WorkflowMonitor from '../../components/content-dashboard/WorkflowMonitor'
import ContentStudio from '../../components/content-dashboard/ContentStudio'
import DashboardHeader from '../../components/content-dashboard/DashboardHeader'
import { supabase } from '../../lib/supabase'
import { Activity, FileText, ChevronLeft, ChevronRight } from 'lucide-react'

interface DashboardStats {
  activeWorkflows: number
  queuedWorkflows: number
  approvedContent: number
  queuedTopics: number
  avgAgentHealth: number
  scheduledPosts: number
}

// Sidebar persistence
function getSidebarState(): boolean {
  if (typeof window === 'undefined') return true
  const saved = localStorage.getItem('ccc-sidebar-expanded')
  return saved === null ? true : saved === 'true'
}

function saveSidebarState(expanded: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ccc-sidebar-expanded', String(expanded))
  }
}

// ─── Sidebar Styles (matching OpieKanban/kanbanStyles.ts) ────────────────────
const sidebarStyles = {
  sidebar: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    height: '100vh',
    background: '#020514',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column' as const,
    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 100,
    boxShadow: '4px 0 30px rgba(0,0,0,0.3)',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '0.925rem',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    textAlign: 'left' as const,
    width: '100%',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    textDecoration: 'none',
  },
  navItemActive: {
    background: 'linear-gradient(135deg, rgba(102,126,234,0.18) 0%, rgba(118,75,162,0.12) 100%)',
    color: '#fff',
    boxShadow: 'inset 0 0 0 1px rgba(102,126,234,0.2), 0 2px 12px rgba(102,126,234,0.1)',
  },
  footer: {
    padding: '18px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center' as const,
    background: 'linear-gradient(180deg, transparent 0%, rgba(102,126,234,0.03) 100%)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.03em',
    textTransform: 'uppercase' as const,
  },
  collapseBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
}

const NAV_LINKS = [
  { href: '/', label: 'Dashboard', icon: '🏠', id: 'dashboard' },
  { href: '/content-command-center', label: 'Content Center', icon: '📡', id: 'content-center' },
]

export default function ContentCommandCenter() {
  const [activeTab, setActiveTab] = useState('workflows')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  // Load sidebar state on mount
  useEffect(() => {
    setSidebarExpanded(getSidebarState())
  }, [])

  const toggleSidebar = () => {
    const newState = !sidebarExpanded
    setSidebarExpanded(newState)
    saveSidebarState(newState)
  }

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/content-dashboard/analytics')

      const data = await response.json()
      if (data.success) {
        setStats(data.data)
        setError(null)
      } else {
        throw new Error(data.error || 'Failed to fetch stats')
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err)

      setStats({
        activeWorkflows: 0,
        queuedWorkflows: 0,
        approvedContent: 0,
        queuedTopics: 0,
        avgAgentHealth: 0.0,
        scheduledPosts: 0
      })

      setError('Dashboard temporarily using cached data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const tabs = [
    { id: 'workflows', label: 'Workflow Monitor', icon: Activity },
    { id: 'content', label: 'Content Studio', icon: FileText },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a14' }}>
      {/* ─── Sidebar ──────────────────────────────────────────────── */}
      <aside style={{
        ...sidebarStyles.sidebar,
        width: sidebarExpanded ? '240px' : '72px',
      }}>
        {/* Logo / Brand */}
        <div style={{
          padding: sidebarExpanded ? '24px 20px' : '24px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
            flexShrink: 0,
          }}>
            🧠
          </div>
          {sidebarExpanded && (
            <span style={{
              color: '#fff',
              fontSize: '1.2rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Opie 2nd Brain
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: sidebarExpanded ? '12px 14px' : '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          {NAV_LINKS.map((link) => {
            const isActive = link.id === 'content-center'
            return (
              <Link
                key={link.id}
                href={link.href}
                style={{
                  ...sidebarStyles.navItem,
                  ...(isActive ? sidebarStyles.navItemActive : {}),
                  justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                }}
                title={!sidebarExpanded ? link.label : undefined}
              >
                <span style={{ fontSize: '1.15rem', width: '24px', textAlign: 'center', flexShrink: 0 }}>
                  {link.icon}
                </span>
                {sidebarExpanded && (
                  <span style={{ flex: 1, fontWeight: 500 }}>{link.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Collapse Toggle */}
        <div style={{
          padding: '8px 14px',
          display: 'flex',
          justifyContent: sidebarExpanded ? 'flex-end' : 'center',
        }}>
          <button
            onClick={toggleSidebar}
            style={sidebarStyles.collapseBtn}
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        {/* Footer */}
        <div style={sidebarStyles.footer}>
          {sidebarExpanded ? (
            <span style={sidebarStyles.footerText}>Omnia Intelligence</span>
          ) : (
            <span style={{ fontSize: '18px', opacity: 0.5 }}>🌟</span>
          )}
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        marginLeft: sidebarExpanded ? '240px' : '72px',
        transition: 'margin-left 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        minHeight: '100vh',
        overflow: 'auto',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '32px 40px',
          color: 'var(--text-primary)',
        }}>
          {/* Dashboard Header */}
          <DashboardHeader
            stats={stats}
            loading={loading}
            error={error}
            onRefresh={fetchStats}
          />

          {/* ─── Premium Tab Navigation ───────────────────────────── */}
          <div style={{
            marginBottom: '36px',
            padding: '6px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'inline-flex',
            gap: '4px',
          }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    ...(isActive ? {
                      background: 'linear-gradient(135deg, rgba(102,126,234,0.2) 0%, rgba(118,75,162,0.15) 100%)',
                      color: '#fff',
                      boxShadow: 'inset 0 0 0 1px rgba(102,126,234,0.25), 0 2px 12px rgba(102,126,234,0.15)',
                    } : {
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.5)',
                    }),
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'workflows' && (
            <WorkflowMonitor supabase={supabase} />
          )}

          {activeTab === 'content' && (
            <ContentStudio supabase={supabase} />
          )}
        </div>
      </main>
    </div>
  )
}
