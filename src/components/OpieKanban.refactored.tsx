// src/components/OpieKanban.tsx
// Refactored: < 200 lines — pure layout and composition
'use client';
import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { Task } from './ActiveTasksPanel';
import { ViewId, useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useTheme } from '../contexts/ThemeContext';
import { useBottomNav, useResponsive, useHaptic } from '../hooks/useMobileGestures';
import { useChat } from '../hooks/useChat';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import { NotificationProvider } from './NotificationCenter';
import AppSidebar from './sidebar/AppSidebar';
import ChatContainer from './chat/ChatContainer';
import LoadingSpinner from './shared/LoadingSpinner';
import { ErrorBoundary } from './shared/ErrorBoundary';
import ParticleBackground from './ParticleBackground';
import ImmersiveVoiceMode from './ImmersiveVoiceMode';
import MobileNavigation, { MobileHeader } from './MobileNavigation';
import { FloatingActionButton } from './BottomSheet';
import CommandPalette, { ShortcutsHelp } from './CommandPalette';
// globalStyles.ts was removed — all CSS is now in src/styles/premium.css

// Lazy-loaded views (code splitting)
const DashboardView = lazy(() => import('./dashboard/DashboardView'));
const SettingsPanel = lazy(() => import('./settings/SettingsPanel'));
const VoiceView = lazy(() => import('./voice/VoiceView'));
const AgentsPanel = lazy(() => import('./AgentsPanel'));
const SkillsPanel = lazy(() => import('./SkillsPanel'));
const ActiveTasksPanel = lazy(() => import('./ActiveTasksPanel'));
const CronsPanel = lazy(() => import('./CronsPanel'));
const AgentLeaderboard = lazy(() => import('./AgentLeaderboard'));
const ContextWindowVisualizer = lazy(() => import('./ContextWindowVisualizer'));
const MemoryPanel = lazy(() => import('./MemoryPanel'));
const WorkspaceBrowser = lazy(() => import('./WorkspaceBrowser'));
const MobileChat = lazy(() => import('./MobileChat'));

// Persistence helpers
function getSavedView(): ViewId {
  if (typeof window === 'undefined') return 'dashboard';
  return (localStorage.getItem('opie-active-view') as ViewId) || 'dashboard';
}
function saveView(view: string): void {
  if (typeof window !== 'undefined') localStorage.setItem('opie-active-view', view);
}
function getSidebarState(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('opie-sidebar-expanded');
  return saved === null ? true : saved === 'true';
}
function saveSidebarState(expanded: boolean): void {
  if (typeof window !== 'undefined') localStorage.setItem('opie-sidebar-expanded', String(expanded));
}

// ============================================================================
// Main Component
// ============================================================================

export default function OpieKanban(): React.ReactElement {
  // Navigation state
  const [activeView, setActiveView] = useState<ViewId>(getSavedView);
  const [sidebarExpanded, setSidebarExpanded] = useState(getSidebarState);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);

  // Task state (stays here — drives sidebar badge counts)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cronCount, setCronCount] = useState(4);
  const [localActiveAgents, setLocalActiveAgents] = useState<string[]>([]);

  // Hooks
  const chat = useChat();
  const responsive = useResponsive();
  const isMobile = responsive.isMobile;
  const isTablet = responsive.isTablet;
  const { triggerHaptic } = useHaptic();
  const bottomNavVisible = useBottomNav();
  const { theme } = useTheme();

  const shouldPollAgents = activeView === 'agents' || activeView === 'dashboard';
  const gateway = useGatewayStatus(shouldPollAgents);
  const activeAgents = useMemo(
    () => Array.from(new Set([...gateway.realActiveAgents, ...localActiveAgents])),
    [gateway.realActiveAgents, localActiveAgents]
  );

  const runningTasksCount = useMemo(() => tasks.filter((t) => t.status === 'running').length, [tasks]);

  // Navigation
  const handleViewChange = useCallback(
    (view: ViewId) => {
      setActiveView(view);
      saveView(view);
      if (isMobile) {
        setMobileMenuOpen(false);
        triggerHaptic('selection');
      }
    },
    [isMobile, triggerHaptic]
  );

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      saveSidebarState(next);
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNavigate: handleViewChange,
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
    onNewMessage: () => setActiveView('voice'),
    onCloseModal: () => {
      if (commandPaletteOpen) setCommandPaletteOpen(false);
      else if (shortcutsHelpOpen) setShortcutsHelpOpen(false);
      else if (mobileMenuOpen) setMobileMenuOpen(false);
    },
    onShowHelp: () => setShortcutsHelpOpen(true),
  });

  // Agent deployment
  const handleDeployAgent = useCallback(
    async (agentId: string, taskLabel: string) => {
      const agentInfo: Record<string, { name: string; emoji: string }> = {
        research: { name: 'Research Agent', emoji: '🔍' },
        code: { name: 'Code Agent', emoji: '💻' },
        content: { name: 'Content Agent', emoji: '✍️' },
        analyst: { name: 'Analyst Agent', emoji: '📊' },
        outreach: { name: 'Outreach Agent', emoji: '📧' },
        qa: { name: 'QA Agent', emoji: '✅' },
        sales: { name: 'Sales Agent', emoji: '💰' },
        contractor: { name: 'Contractor Expert', emoji: '🏗️' },
        mockup: { name: 'Mockup Agent', emoji: '🎨' },
        proposal: { name: 'Proposal Agent', emoji: '📝' },
        success: { name: 'Success Agent', emoji: '🌟' },
      };
      const taskId = Date.now().toString();
      const newTask: Task = {
        id: taskId,
        agentId,
        agentName: agentInfo[agentId]?.name || 'Agent',
        agentEmoji: agentInfo[agentId]?.emoji || '🤖',
        label: taskLabel,
        startTime: new Date(),
        status: 'running',
        output: 'Spawning agent...',
      };
      setTasks((prev) => [newTask, ...prev]);
      setLocalActiveAgents((prev) => (prev.includes(agentId) ? prev : [...prev, agentId]));
      handleViewChange('tasks');
      try {
        const response = await fetch('/api/agents/spawn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentType: agentId, task: taskLabel, label: `${agentId}-${taskId}` }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, output: `Agent spawned: ${data.sessionId}`, sessionId: data.sessionId } : t)));
          gateway.refreshAgents();
        } else {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'failed', output: data.error || 'Spawn failed' } : t)));
          setLocalActiveAgents((prev) => prev.filter((id) => id !== agentId));
        }
      } catch (error) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'failed', output: error instanceof Error ? error.message : 'Network error' } : t)));
        setLocalActiveAgents((prev) => prev.filter((id) => id !== agentId));
      }
    },
    [handleViewChange, gateway]
  );

  const lastResponse = chat.messages[chat.messages.length - 1]?.role === 'assistant' ? chat.messages[chat.messages.length - 1].text : '';

  return (
    <NotificationProvider>
      <ErrorBoundary>
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a14', position: 'relative' }}>
          <ParticleBackground particleCount={50} intensity="low" mouseAttraction={!isMobile} />
          <ImmersiveVoiceMode isActive={activeView === 'voice' && chat.micOn && !isMobile} isSpeaking={chat.isSpeaking} isListening={chat.micOn && !chat.isLoading && !chat.isSpeaking} isLoading={chat.isLoading} transcript={chat.transcript} lastResponse={lastResponse} onClose={() => chat.toggleMic()} onMicToggle={chat.toggleMic} micOn={chat.micOn} />
          {isMobile && activeView !== 'voice' && <MobileHeader title="Opie" subtitle={gateway.liveStatus?.agents?.active ? `${gateway.liveStatus.agents.active} agents active` : undefined} status={chat.micOn ? 'listening' : chat.isSpeaking ? 'speaking' : chat.isLoading ? 'thinking' : 'online'} onMenuClick={() => setMobileMenuOpen(true)} />}
          {isMobile && mobileMenuOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 99 }} onClick={() => setMobileMenuOpen(false)} />}
          <AppSidebar sidebarExpanded={sidebarExpanded} isMobile={isMobile} mobileMenuOpen={mobileMenuOpen} activeView={activeView} activeAgentCount={activeAgents.length} runningTasksCount={runningTasksCount} cronCount={cronCount} onNavigate={handleViewChange} onToggleSidebar={toggleSidebar} />
          <main style={{ flex: 1, minHeight: isMobile ? '100dvh' : '100vh', marginLeft: isMobile ? 0 : sidebarExpanded ? '240px' : '72px', transition: 'margin-left 0.35s cubic-bezier(0.16, 1, 0.3, 1)', background: 'linear-gradient(180deg, #0a0a14 0%, #0d0d18 100%)' }}>
            <Suspense fallback={<LoadingSpinner label="Loading view..." />}>
              {activeView === 'dashboard' && <DashboardView isMobile={isMobile} isTablet={isTablet} isLoading={chat.isLoading} realActiveCount={gateway.realActiveCount} selectedModel={chat.selectedModel} showModelDropdown={chat.showModelDropdown} onModelDropdownToggle={() => chat.setShowModelDropdown(!chat.showModelDropdown)} onModelChange={chat.handleModelChange} onNavigate={handleViewChange} />}
              {activeView === 'agents' && <ViewWrapper isMobile={isMobile} isTablet={isTablet} title="🤖 Agent Command Center" subtitle="Deploy and manage your specialist AI agents in real-time"><AgentsPanel onDeploy={handleDeployAgent} activeAgents={activeAgents} /></ViewWrapper>}
              {activeView === 'skills' && <ViewWrapper isMobile={isMobile} isTablet={isTablet} title="Skill Catalog" subtitle="Browse available capabilities"><SkillsPanel /></ViewWrapper>}
              {activeView === 'tasks' && <ViewWrapper isMobile={isMobile} isTablet={isTablet} title="📋 Active Tasks" subtitle="Monitor and manage active task execution"><ActiveTasksPanel tasks={tasks} /></ViewWrapper>}
              {activeView === 'crons' && <ViewWrapper isMobile={isMobile} isTablet={isTablet} title="Scheduled Jobs" subtitle="Manage automated cron tasks"><CronsPanel pollInterval={30000} onCronCountChange={setCronCount} /></ViewWrapper>}
              {activeView === 'voice' && (isMobile ? <MobileChat messages={chat.messages} input={chat.input} setInput={chat.setInput} isLoading={chat.isLoading} onSend={() => chat.handleSend(chat.input)} micOn={chat.micOn} onMicToggle={chat.toggleMic} isSpeaking={chat.isSpeaking} transcript={chat.transcript} onBack={() => handleViewChange('dashboard')} /> : <VoiceView messages={chat.messages} input={chat.input} setInput={chat.setInput} isLoading={chat.isLoading} micOn={chat.micOn} isSpeaking={chat.isSpeaking} transcript={chat.transcript} onSend={(text) => chat.handleSend(text)} onMicToggle={chat.toggleMic} />)}
              {activeView === 'memory' && <ViewWrapper isMobile={isMobile} isTablet={isTablet} title="Memory Bank" subtitle="Browse memories, daily notes, and workspace files"><div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}><MemoryPanel /><WorkspaceBrowser /></div></ViewWrapper>}
              {activeView === 'leaderboard' && <ViewWrapper isMobile={isMobile} isTablet={isTablet} title="Agent Leaderboard" subtitle="Track agent performance"><div style={{ maxWidth: 800 }}><AgentLeaderboard /></div></ViewWrapper>}
              {activeView === 'context' && <ViewWrapper isMobile={isMobile} isTablet={isTablet} title="Context Window" subtitle="See what's in the agent's working memory"><div style={{ maxWidth: 600 }}><ContextWindowVisualizer enabled={activeView === 'context'} /></div></ViewWrapper>}
              {activeView === 'settings' && <ViewWrapper isMobile={isMobile} isTablet={isTablet} title="Settings" subtitle="Configure your Opie instance"><SettingsPanel sidebarExpanded={sidebarExpanded} isMobile={isMobile} isTablet={isTablet} onToggleSidebar={toggleSidebar} onShowShortcuts={() => setShortcutsHelpOpen(true)} /></ViewWrapper>}
            </Suspense>
          </main>
          <ChatContainer messages={chat.messages} input={chat.input} setInput={chat.setInput} isLoading={chat.isLoading} onSend={chat.handleSend} micOn={chat.micOn} onMicToggle={chat.toggleMic} isSpeaking={chat.isSpeaking} onStopSpeaking={chat.stopSpeaking} transcript={chat.transcript} interactionMode={chat.interactionMode} onInteractionModeChange={chat.setInteractionMode} selectedModel={chat.selectedModel} onModelChange={chat.handleModelChange} conversations={chat.conversations} activeConversationId={chat.activeConversation?.id || null} onConversationCreate={chat.createConversation} onConversationSwitch={chat.switchConversation} onConversationDelete={chat.deleteConversation} onConversationFork={chat.forkConversation} onSummarizeAndContinue={chat.handleSummarizeAndContinue} pinnedConversationIds={chat.pinnedConversationIds} onPinConversation={chat.pinConversation} onUnpinConversation={chat.unpinConversation} pinnedInputs={chat.pinnedInputs} onPinnedInputChange={(id, val) => chat.setPinnedInputs((prev) => ({ ...prev, [id]: val }))} pinnedLoading={chat.pinnedLoading} onSendToPinned={chat.handleSendToPinned} onCreateSecondaryConversation={chat.createConversationForSecondary} />
          <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onNavigate={handleViewChange} onNewMessage={() => { setActiveView('voice'); setCommandPaletteOpen(false); }} />
          <ShortcutsHelp isOpen={shortcutsHelpOpen} onClose={() => setShortcutsHelpOpen(false)} />
          {isMobile && activeView !== 'voice' && <MobileNavigation activeView={activeView} onNavigate={handleViewChange} agentCount={activeAgents.length} taskCount={runningTasksCount} isVisible={bottomNavVisible} />}
          {isMobile && activeView === 'dashboard' && <FloatingActionButton icon="⚡" onClick={() => handleViewChange('voice')} color="primary" label="Quick Chat" />}
          {/* Global styles loaded via premium.css import in layout.tsx */}
        </div>
      </ErrorBoundary>
    </NotificationProvider>
  );
}

/** Reusable view wrapper with header */
function ViewWrapper({ children, isMobile, isTablet, title, subtitle }: { children: React.ReactNode; isMobile: boolean; isTablet: boolean; title: string; subtitle: string }) {
  return (
    <div style={{ padding: isMobile ? '16px' : isTablet ? '24px' : '32px', paddingTop: isMobile ? '72px' : undefined, paddingBottom: isMobile ? '100px' : undefined, maxWidth: '1480px', animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ color: '#fff', fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.85) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', margin: 0 }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
