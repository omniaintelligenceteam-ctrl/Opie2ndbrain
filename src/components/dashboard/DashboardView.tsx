// src/components/dashboard/DashboardView.tsx
// Extracted dashboard view from OpieKanban
'use client';
import React, { memo } from 'react';
import { ViewId } from '../../hooks/useKeyboardShortcuts';
import { AIModel, AI_MODELS } from '../FloatingChat';
import SmartDashboardHome from '../SmartDashboardHome';
import OrchestrationStatus from '../OrchestrationStatus';
import ActivityFeed from '../ActivityFeed';
import { SystemHealthPanel } from '../StatusIndicators';
import { CollapsibleSection } from '../BottomSheet';
import KanbanColumn, { KanbanColumnData } from './KanbanColumn';

interface DashboardViewProps {
  isMobile: boolean;
  isTablet: boolean;
  isLoading: boolean;
  realActiveCount: number;
  selectedModel: AIModel;
  showModelDropdown: boolean;
  onModelDropdownToggle: () => void;
  onModelChange: (model: AIModel) => Promise<void>;
  onNavigate: (view: ViewId) => void;
}

const KANBAN_COLUMNS: KanbanColumnData[] = [
  {
    id: 'todo',
    title: 'To Do',
    color: '#f59e0b',
    tasks: [
      'Memory Integration with Vector DB',
      'HeyGen Avatar Integration',
      'Email Automation Pipeline',
      'Voice Recognition Improvements',
      'Mobile PWA Optimization',
      'Agent Performance Analytics',
      'Security Audit & Compliance',
    ],
  },
  {
    id: 'progress',
    title: 'In Progress',
    color: '#667eea',
    tasks: [
      'Voice Chat Enhancement',
      'Agent Dashboard Redesign',
      'Real-time Orchestration View',
      'Kanban Board Implementation',
    ],
  },
  {
    id: 'done',
    title: 'Done',
    color: '#22c55e',
    tasks: [
      'Dashboard UI Design System',
      'Chat API Integration',
      'TTS Integration with ElevenLabs',
      'Skill Catalog Architecture',
      'Authentication System',
      'Database Schema Design',
      'Docker Containerization',
      'CI/CD Pipeline Setup',
      'Initial Agent Framework',
      'Basic Voice Commands',
      'Settings Panel',
      'Navigation System',
      'Theme System Implementation',
      'Mobile Responsive Design',
      'Error Handling Framework',
    ],
  },
];

const DashboardView: React.FC<DashboardViewProps> = memo(function DashboardView({
  isMobile,
  isTablet,
  isLoading,
  realActiveCount,
  selectedModel,
  showModelDropdown,
  onModelDropdownToggle,
  onModelChange,
  onNavigate,
}) {
  return (
    <div
      style={{
        padding: isMobile ? '16px' : isTablet ? '24px' : '32px',
        paddingTop: isMobile ? '72px' : undefined,
        paddingBottom: isMobile ? '100px' : undefined,
        maxWidth: '1480px',
        animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Hero Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : '1fr 1.2fr',
          gap: '24px',
          marginBottom: '24px',
        }}
      >
        <div>
          <SmartDashboardHome
            userName="Wes"
            onNavigate={(view) => onNavigate(view as ViewId)}
            onQuickAction={(action) => {
              if (action === 'deploy') onNavigate('agents');
            }}
          />
        </div>
        <div>
          {isMobile ? (
            <CollapsibleSection title="Agent Orchestration Network" icon="🌌" badge={realActiveCount} defaultOpen>
              <OrchestrationStatus compact={true} />
            </CollapsibleSection>
          ) : (
            <OrchestrationStatus />
          )}
        </div>
      </div>

      {/* Model Selector */}
      <ModelSelector
        selectedModel={selectedModel}
        showDropdown={showModelDropdown}
        onToggle={onModelDropdownToggle}
        onChange={onModelChange}
      />

      {/* Kanban Board */}
      <div
        style={{
          marginBottom: '32px',
          padding: '24px',
          background:
            'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.03) 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h2
          style={{
            color: '#fff',
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: '0 0 20px 0',
            letterSpacing: '-0.02em',
          }}
        >
          📋 Project Board
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn key={column.id} column={column} isMobile={isMobile} />
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div style={{ marginTop: '24px' }}>
        {isMobile ? (
          <>
            <CollapsibleSection title="Activity Feed" icon="⚡" defaultOpen>
              <ActivityFeed maxItems={20} pollInterval={15000} isThinking={isLoading} enabled />
            </CollapsibleSection>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <CollapsibleSection title="System Health" icon="🩺">
                <SystemHealthPanel />
              </CollapsibleSection>
            </div>
          </>
        ) : (
          <ActivityFeed maxItems={50} pollInterval={15000} isThinking={isLoading} enabled />
        )}
      </div>
    </div>
  );
});

/** Model selector sub-component */
const ModelSelector = memo(function ModelSelector({
  selectedModel,
  showDropdown,
  onToggle,
  onChange,
}: {
  selectedModel: AIModel;
  showDropdown: boolean;
  onToggle: () => void;
  onChange: (model: AIModel) => Promise<void>;
}) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          background:
            'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 500 }}>
          🤖 Active Model
        </span>
        <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
          <button
            onClick={onToggle}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{AI_MODELS.find((m) => m.id === selectedModel)?.name || 'Claude Opus'}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{showDropdown ? '▲' : '▼'}</span>
          </button>
          {showDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '8px',
                background: 'rgba(20, 20, 30, 0.98)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
              }}
            >
              {AI_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => onChange(model.id)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: 'none',
                    background:
                      selectedModel === model.id ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    textAlign: 'left',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{model.name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                    {model.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default DashboardView;
