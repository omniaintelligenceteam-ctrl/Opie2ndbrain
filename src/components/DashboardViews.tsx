'use client';

import React from 'react';
import { ViewId } from '../hooks/useKeyboardShortcuts';
import { Task } from './ActiveTasksPanel';
import { ChatMessage } from '@/types/chat';
import { ErrorBoundary } from './ErrorBoundary';
import { CollapsibleSection } from './BottomSheet';

// View components
import AgentsPanel from './AgentsPanel';
import SkillsPanel from './SkillsPanel';
import ActiveTasksPanel from './ActiveTasksPanel';
import CronsPanel from './CronsPanel';
import MemoryPanel from './MemoryPanel';
import WorkspaceBrowser from './WorkspaceBrowser';
import SmartDashboardHome from './SmartDashboardHome';
import OrchestrationStatus from './OrchestrationStatus';
import ActivityFeed from './ActivityFeed';
import { SystemHealthPanel } from './StatusIndicators';
import MobileChat from './MobileChat';
import ChatPanel from './ChatPanel';
import KanbanBoard from './KanbanBoard';
import SettingsView from './SettingsView';
import OrganizationChart from './OrganizationChart';

export interface DashboardViewsProps {
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
  isMobile: boolean;
  isTablet: boolean;
  // Agent-related
  activeAgents: string[];
  onDeployAgent: (agentId: string, taskLabel: string) => void;
  // Tasks
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  // Crons
  cronCount: number;
  onCronCountChange: (count: number) => void;
  // Voice/Chat
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  onSend: (text?: string) => void;
  micOn: boolean;
  onMicToggle: () => void;
  isSpeaking: boolean;
  transcript: string;
  // Settings callbacks
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
  onShowShortcuts: () => void;
  // Real-time data
  realActiveCount: number;
  triggerHaptic: (intensity?: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error') => void;
}

export function DashboardViews(props: DashboardViewsProps): React.ReactElement {
  const {
    activeView,
    onViewChange,
    isMobile,
    isTablet,
    activeAgents,
    onDeployAgent,
    tasks,
    onTaskClick,
    cronCount,
    onCronCountChange,
    messages,
    input,
    setInput,
    isLoading,
    onSend,
    micOn,
    onMicToggle,
    isSpeaking,
    transcript,
    sidebarExpanded,
    onToggleSidebar,
    onShowShortcuts,
    realActiveCount,
  } = props;

  const viewContainerStyle = {
    ...styles.viewContainer,
    padding: isMobile ? '16px' : isTablet ? '24px' : '32px',
    paddingTop: isMobile ? '72px' : undefined,
    paddingBottom: isMobile ? '100px' : undefined,
  };

  return (
    <>
      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <ErrorBoundary section="Dashboard">
          <div style={viewContainerStyle}>
            {/* TOP: Hero Section - Greeting + Orchestration Side by Side */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : '1fr 1.2fr',
              gap: '24px',
              marginBottom: '24px',
            }}>
              <ErrorBoundary section="Smart Dashboard Home">
                <div>
                  <SmartDashboardHome 
                    userName="Wes"
                    onNavigate={(view) => onViewChange(view as ViewId)}
                    onQuickAction={(action) => {
                      if (action === 'deploy') onViewChange('agents');
                    }}
                  />
                </div>
              </ErrorBoundary>
              
              <ErrorBoundary section="Orchestration Status">
                <div>
                  {isMobile ? (
                    <CollapsibleSection title="Agent Orchestration Network" icon="🌌" badge={realActiveCount} defaultOpen>
                      <OrchestrationStatus compact={true} />
                    </CollapsibleSection>
                  ) : (
                    <OrchestrationStatus />
                  )}
                </div>
              </ErrorBoundary>
            </div>

            {/* Kanban Board */}
            <ErrorBoundary section="Kanban Board">
              <KanbanBoard isMobile={isMobile} />
            </ErrorBoundary>
            
            {/* Activity Feed */}
            <div style={{ marginTop: '24px' }}>
              <ErrorBoundary section="Activity Feed">
                {isMobile ? (
                  <>
                    <CollapsibleSection title="Activity Feed" icon="⚡" defaultOpen>
                      <ActivityFeed 
                        maxItems={20}
                        pollInterval={15000}
                        isThinking={isLoading}
                      />
                    </CollapsibleSection>
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <CollapsibleSection title="System Health" icon="🩺">
                        <SystemHealthPanel />
                      </CollapsibleSection>
                    </div>
                  </>
                ) : (
                  <ActivityFeed 
                    maxItems={50}
                    pollInterval={10000}
                    isThinking={isLoading}
                  />
                )}
              </ErrorBoundary>
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* Agents View */}
      {activeView === 'agents' && (
        <ErrorBoundary section="Agents">
          <div style={viewContainerStyle}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                🤖 Agent Command Center
              </h1>
              <p style={styles.viewSubtitle}>
                {isMobile ? 'Deploy & monitor AI agents' : 'Deploy and manage your specialist AI agents in real-time'}
              </p>
            </div>
            <AgentsPanel onDeploy={onDeployAgent} activeAgents={activeAgents} />
          </div>
        </ErrorBoundary>
      )}

      {/* Organization View */}
      {activeView === 'organization' && (
        <ErrorBoundary section="Organization">
          <div style={viewContainerStyle}>
            <OrganizationChart 
              isMobile={isMobile}
              isTablet={isTablet}
              onNodeClick={(node) => {
                console.log('Organization node clicked:', node);
              }}
            />
          </div>
        </ErrorBoundary>
      )}

      {/* Skills View */}
      {activeView === 'skills' && (
        <ErrorBoundary section="Skills">
          <div style={viewContainerStyle}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                Skill Catalog
              </h1>
              <p style={styles.viewSubtitle}>Browse available capabilities</p>
            </div>
            <SkillsPanel />
          </div>
        </ErrorBoundary>
      )}

      {/* Tasks View */}
      {activeView === 'tasks' && (
        <ErrorBoundary section="Tasks">
          <div style={viewContainerStyle}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                📋 Active Tasks
              </h1>
              <p style={styles.viewSubtitle}>
                {isMobile ? 'Task monitoring' : 'Monitor and manage active task execution'}
              </p>
            </div>
            <ActiveTasksPanel 
              tasks={tasks} 
              onTaskClick={onTaskClick}
            />
          </div>
        </ErrorBoundary>
      )}

      {/* Crons View */}
      {activeView === 'crons' && (
        <ErrorBoundary section="Crons">
          <div style={viewContainerStyle}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                Scheduled Jobs
              </h1>
              <p style={styles.viewSubtitle}>
                {isMobile ? 'Automated tasks' : 'Manage automated cron tasks'}
              </p>
            </div>
            <CronsPanel 
              pollInterval={30000}
              onCronCountChange={onCronCountChange}
            />
          </div>
        </ErrorBoundary>
      )}

      {/* Voice View */}
      {activeView === 'voice' && (
        <ErrorBoundary section="Voice Chat">
          {isMobile ? (
            <MobileChat
              messages={messages}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              onSend={() => onSend(input)}
              micOn={micOn}
              onMicToggle={onMicToggle}
              isSpeaking={isSpeaking}
              transcript={transcript}
              onBack={() => onViewChange('dashboard')}
            />
          ) : (
            <ChatPanel
              messages={messages}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              onSend={onSend}
              micOn={micOn}
              onMicToggle={onMicToggle}
              isSpeaking={isSpeaking}
              transcript={transcript}
            />
          )}
        </ErrorBoundary>
      )}

      {/* Memory View */}
      {activeView === 'memory' && (
        <ErrorBoundary section="Memory">
          <div style={viewContainerStyle}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                Memory Bank
              </h1>
              <p style={styles.viewSubtitle}>
                {isMobile ? 'Memories & files' : 'Browse memories, daily notes, and workspace files'}
              </p>
            </div>
            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <CollapsibleSection title="Memory" icon="🧠" defaultOpen>
                  <MemoryPanel />
                </CollapsibleSection>
                <CollapsibleSection title="Workspace Files" icon="📁">
                  <WorkspaceBrowser />
                </CollapsibleSection>
              </div>
            ) : (
              <div style={{
                ...styles.memoryGrid,
                gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr',
                gap: isTablet ? '16px' : '24px',
              }}>
                <MemoryPanel />
                <WorkspaceBrowser />
              </div>
            )}
          </div>
        </ErrorBoundary>
      )}

      {/* Settings View */}
      {activeView === 'settings' && (
        <ErrorBoundary section="Settings">
          <div style={viewContainerStyle}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                Settings
              </h1>
              <p style={styles.viewSubtitle}>Configure your Opie instance</p>
            </div>
            <SettingsView 
              isMobile={isMobile}
              isTablet={isTablet}
              sidebarExpanded={sidebarExpanded}
              onToggleSidebar={onToggleSidebar}
              onShowShortcuts={onShowShortcuts}
            />
          </div>
        </ErrorBoundary>
      )}
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  viewContainer: {
    padding: '40px',
    maxWidth: '1480px',
    animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  viewHeader: {
    marginBottom: '36px',
  },
  viewTitle: {
    color: '#fff',
    fontSize: '2rem',
    fontWeight: 700,
    margin: '0 0 8px 0',
    letterSpacing: '-0.03em',
    lineHeight: 1.2,
    background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.85) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  viewSubtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '1rem',
    margin: 0,
    fontWeight: 400,
    letterSpacing: '-0.01em',
  },
  memoryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '28px',
  },
};

export default DashboardViews;
