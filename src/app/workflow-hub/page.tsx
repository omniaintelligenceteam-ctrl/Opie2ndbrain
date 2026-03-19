'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import WorkflowHub from '../../components/content-dashboard/WorkflowHub'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useRealTimeData'
import { ToastContainer } from '../../components/NotificationCenter'

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
  { href: '/', label: 'Dashboard', icon: '??', id: 'dashboard' },
  { href: '/content-command-center', label: 'Content Center', icon: '??', id: 'content-center' },
  { href: '/workflow-hub', label: 'Workflow Hub', icon: '??', id: 'workflow-hub' },
]

export default function WorkflowHubPage() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    setSidebarExpanded(getSidebarState())
  }, [])

  const toggleSidebar = () => {
    const next = !sidebarExpanded
    setSidebarExpanded(next)
    saveSidebarState(next)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a14' }}>
      <aside style={{ ...sidebarStyles.sidebar, width: sidebarExpanded ? '240px' : '72px' }}>
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
            ??
          </div>
          {sidebarExpanded && (
            <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Opie 2nd Brain
            </span>
          )}
        </div>

        <nav style={{ flex: 1, padding: sidebarExpanded ? '12px 14px' : '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          {NAV_LINKS.map((link) => {
            const isActive = link.id === 'workflow-hub'
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
                <span style={{ fontSize: '1.15rem', width: '24px', textAlign: 'center', flexShrink: 0 }}>{link.icon}</span>
                {sidebarExpanded && <span style={{ flex: 1, fontWeight: 500 }}>{link.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '8px 14px', display: 'flex', justifyContent: sidebarExpanded ? 'flex-end' : 'center' }}>
          <button onClick={toggleSidebar} style={sidebarStyles.collapseBtn} aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}>
            {sidebarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        <div style={sidebarStyles.footer}>
          {sidebarExpanded ? <span style={sidebarStyles.footerText}>Omnia Intelligence</span> : <span style={{ fontSize: '18px', opacity: 0.5 }}>??</span>}
        </div>
      </aside>

      <main style={{ flex: 1, marginLeft: sidebarExpanded ? '240px' : '72px', transition: 'margin-left 0.35s cubic-bezier(0.16, 1, 0.3, 1)', minHeight: '100vh', overflow: 'auto' }}>
        <div style={{ maxWidth: '1500px', margin: '0 auto', padding: '24px 24px', color: 'var(--text-primary)' }}>
          <WorkflowHub supabase={supabase} showToast={showToast} />
        </div>
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

