'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense, memo } from 'react';
import { useKeyboardShortcuts, ViewId } from '../hooks/useKeyboardShortcuts';
import { apiFetch } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { useSounds } from '../hooks/useSounds';
import { useBottomNav, useResponsive, useHaptic, useLazyLoad } from '../hooks/useMobileGestures';
import { useConversations } from '@/hooks/useConversations';
import { Conversation } from '@/types/conversation';
import { useNotifications, useToast, useSystemStatus } from '../hooks/useRealTimeData';
import { extractMemory, shouldExtractMemory } from '@/lib/memoryExtraction';
import { useMemoryRefresh } from '../hooks/useMemoryRefresh';
import { useActiveAgents, useAgentSessions } from '../hooks/useAgentSessions';
import { AGENT_NODES } from '../lib/agentMapping';
import { useAgentPersonality } from '../contexts/AgentPersonalityContext';
import { useVoiceEngine } from '../hooks/useVoiceEngine';

// ─── Always-visible / critical-path components (loaded eagerly) ──────────────
import CommandPalette, { ShortcutsHelp } from './CommandPalette';
import MobileNavigation, { MobileHeader } from './MobileNavigation';
import BottomSheet, { FloatingActionButton, CollapsibleSection, MobileCard } from './BottomSheet';
import { ChatMessage, InteractionMode, AIModel, PendingExecutionPlan } from '@/types/chat';
import ConversationSidebar, { sidebarAnimationStyles } from './ConversationSidebar';
import OpieAvatar from './OpieAvatar';
import { Camera, Mic } from 'lucide-react';
import { NotificationBell, NotificationProvider } from './NotificationCenter';
import { StatusBar, SystemHealthPanel, LiveAgentCount, LiveTaskCount } from './StatusIndicators';
import StatusOrb from './StatusOrb';

// ─── Lazy-loaded panels (only imported when their view is active) ────────────
const AgentsPanel = lazy(() => import('./AgentsPanel'));
const SkillsPanel = lazy(() => import('./SkillsPanel'));
const ActiveTasksPanel = lazy(() => import('./ActiveTasksPanel'));
const AgentCommandCenter = lazy(() => import('./AgentCommandCenter'));
const CronsPanel = lazy(() => import('./CronsPanel'));
const ActivityFeed = lazy(() => import('./ActivityFeed'));
const MemoryPanel = lazy(() => import('./MemoryPanel'));
const WorkspaceBrowser = lazy(() => import('./WorkspaceBrowser'));
const MobileChat = lazy(() => import('./MobileChat'));
const SmartDashboardHome = lazy(() => import('./SmartDashboardHome'));
const OpieStatusWidget = lazy(() => import('./OpieStatusWidget'));
const SidebarWidgets = lazy(() => import('./SidebarWidgets'));
const AgentLeaderboard = lazy(() => import('./AgentLeaderboard'));
const OrganizationChart = lazy(() => import('./OrganizationChart'));
const ModelCounsel = lazy(() => import('./ModelCounsel'));
const ContextWindowVisualizer = lazy(() => import('./ContextWindowVisualizer'));
const AgentPersonalityPanel = lazy(() => import('./AgentPersonalityPanel'));
const ParticleBackground = lazy(() => import('./ParticleBackground'));
const ImmersiveVoiceMode = lazy(() => import('./ImmersiveVoiceMode'));

// Re-export Task type for backward compat (lazy can't export types directly)
import type { Task } from './ActiveTasksPanel';


// Persistence helpers
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('opie-session-id');
  if (!id) {
    id = `2ndbrain-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('opie-session-id', id);
  }
  return id;
}

function getSavedView(): string {
  if (typeof window === 'undefined') return 'dashboard';
  return localStorage.getItem('opie-active-view') || 'dashboard';
}

function saveView(view: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('opie-active-view', view);
  }
}

function getSidebarState(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('opie-sidebar-expanded');
  return saved === null ? true : saved === 'true';
}

function saveSidebarState(expanded: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('opie-sidebar-expanded', String(expanded));
  }
}

// AI model options (was in FloatingChat, now here since we removed that import)
const AI_MODELS: { id: AIModel; name: string; description: string }[] = [
  { id: 'kimi', name: 'Kimi K2', description: 'Default - fast and capable' },
  { id: 'opus', name: 'Claude Opus', description: 'Most capable, best for complex tasks' },
  { id: 'sonnet', name: 'Claude Sonnet', description: 'Balanced performance and speed' },
  { id: 'haiku', name: 'Claude Haiku', description: 'Fast and cost-effective' },
];

// Daily motivational quotes (rotates by day of year)
const DAILY_QUOTES = [
  { text: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
  { text: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
  { text: 'Move fast and break things.', author: 'Mark Zuckerberg' },
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Ship it.', author: 'Reid Hoffman' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Think big, start small, act fast.', author: 'Anon' },
  { text: 'Execution eats strategy for breakfast.', author: 'Peter Drucker' },
  { text: 'Build something people want.', author: 'Y Combinator' },
  { text: 'Your margin is my opportunity.', author: 'Jeff Bezos' },
  { text: 'Be so good they can\'t ignore you.', author: 'Steve Martin' },
  { text: 'Ideas are easy. Implementation is hard.', author: 'Guy Kawasaki' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'What gets measured gets managed.', author: 'Peter Drucker' },
  { text: 'Doubt kills more dreams than failure ever will.', author: 'Suzy Kassem' },
  { text: 'Every expert was once a beginner.', author: 'Helen Hayes' },
  { text: 'Winners are not afraid of losing.', author: 'Robert Kiyosaki' },
  { text: 'Make each day your masterpiece.', author: 'John Wooden' },
  { text: 'Hustle beats talent when talent doesn\'t hustle.', author: 'Ross Simmonds' },
  { text: 'Fortune favors the bold.', author: 'Virgil' },
  { text: 'Work hard in silence, let success be your noise.', author: 'Frank Ocean' },
  { text: 'Dream big. Start small. Act now.', author: 'Robin Sharma' },
  { text: 'The harder I work, the luckier I get.', author: 'Gary Player' },
  { text: 'Success is not final, failure is not fatal.', author: 'Winston Churchill' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
  { text: 'Strive not to be a success, but to be of value.', author: 'Albert Einstein' },
  { text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
];

function getDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

// Weather code to emoji/description mapping
function getWeatherInfo(code: number): { emoji: string; desc: string } {
  if (code === 0) return { emoji: '☀️', desc: 'Clear' };
  if (code <= 3) return { emoji: '⛅', desc: 'Partly Cloudy' };
  if (code <= 48) return { emoji: '🌫️', desc: 'Foggy' };
  if (code <= 57) return { emoji: '🌦️', desc: 'Drizzle' };
  if (code <= 67) return { emoji: '🌧️', desc: 'Rain' };
  if (code <= 77) return { emoji: '🌨️', desc: 'Snow' };
  if (code <= 82) return { emoji: '🌧️', desc: 'Showers' };
  if (code <= 86) return { emoji: '🌨️', desc: 'Snow Showers' };
  if (code >= 95) return { emoji: '⛈️', desc: 'Thunderstorm' };
  return { emoji: '🌤️', desc: 'Fair' };
}

// ViewId is now imported from useKeyboardShortcuts

interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  showCount?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '💬' },
  { id: 'board', label: 'Project Board', icon: '📋' },
  { id: 'agents', label: 'Agents', icon: '🤖', showCount: true },
  { id: 'organization', label: 'Organization', icon: '🏛️' },
  { id: 'skills', label: 'Skills', icon: '🛠️' },
  { id: 'tasks', label: 'Tasks', icon: '✅', showCount: true },
  { id: 'crons', label: 'Crons', icon: '⏰', showCount: true },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'model-counsel', label: 'Model Counsel', icon: '🎯' },
  { id: 'context', label: 'Context', icon: '🧠' },
  { id: 'voice', label: 'Voice', icon: '🎤' },
  { id: 'memory', label: 'Memory', icon: '📁' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

// Helper to generate message IDs
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Prepare messages with tiered compression strategy
function prepareMessagesWithContext(messages: ChatMessage[]): Array<{role: string, content: string}> {
  const total = messages.length;
  
  // Under 15: send all full
  if (total <= 15) {
    return messages.map(m => ({ role: m.role, content: m.text }));
  }
  
  // Always keep last 15 full
  const recentFull = messages.slice(-15);
  const older = messages.slice(0, total - 15);
  
  let contextBlock = '';
  
  // Tiered compression of older messages
  if (older.length > 0) {
    // 16-25: 2 paragraphs (first 10 of older)
    const tier1 = older.slice(0, 10); 
    if (tier1.length > 0) {
      const summary1 = tier1.map(m => `${m.role === 'user' ? 'Q' : 'A'}: ${m.text.slice(0, 80)}${m.text.length > 80 ? '...' : ''}`).join('\n');
      contextBlock += `Earlier (messages ${Math.max(1, total-14-tier1.length)}-${total-15}):\n${summary1}\n\n`;
    }
    
    // 26-35: 1 paragraph (next 10)
    const tier2 = older.slice(10, 20);
    if (tier2.length > 0) {
      const keyPoints = tier2.map(m => m.text.slice(0, 60)).join('; ');
      contextBlock += `Previous (${tier2.length} msgs): ${keyPoints.slice(0, 150)}...\n\n`;
    }
    
    // 36-45: 2 sentences
    const tier3 = older.slice(20, 30);
    if (tier3.length > 0) {
      const topics = tier3.map(m => m.text.split('.')[0].slice(0, 40)).join('. ');
      contextBlock += `Earlier context: We discussed ${topics}.\n\n`;
    }
    
    // 46+: 1 sentence, cut at 100 messages max
    const tier4 = older.slice(30, 85); // Cap at 100 total (15+85)
    if (tier4.length > 0) {
      contextBlock += `Prior context includes ${tier4.length} additional messages about lead generation, pricing, and system setup.\n`;
    }
  }
  
  return [
    ...(contextBlock ? [{ role: 'system', content: `Conversation history:\n${contextBlock.trim()}` }] : []),
    ...recentFull.map(m => ({ role: m.role, content: m.text }))
  ];
}

// Poll for async response from Supabase (EXECUTE mode)
async function pollForAsyncResponse(
  pollUrl: string,
  userMsgId: string,
  assistantMsgId: string
): Promise<string> {
  const maxAttempts = 60; // 60 * 2s = 120s max
  const pollInterval = 2000; // 2 seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(pollUrl);
      if (!res.ok) {
        await new Promise(r => setTimeout(r, pollInterval));
        continue;
      }
      
      const data = await res.json();
      
      if (data.status === 'complete' && data.response) {
        return data.response;
      }
      else if (data.status === 'error') {
        return `Error: ${data.error || 'Unknown error'}`;
      }
      // else pending, continue polling
      
    } catch (e) {
      console.error('[Poll] Error:', e);
    }
    
    await new Promise(r => setTimeout(r, pollInterval));
  }
  
  return 'Error: Timed out waiting for response (120s)';
}

// Enhanced Kanban Column Component with auto-expansion and scrollable functionality for ALL columns
function KanbanColumn({ 
  column, 
  isMobile = false 
}: { 
  column: { id: string; title: string; color: string; tasks: string[] }; 
  isMobile?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);
  const MAX_VISIBLE_ITEMS = 8;

  // Track mounted state for hydration-safe date formatting
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Show only last 8 items by default for all columns
  const visibleTasks = !showAll && column.tasks.length > MAX_VISIBLE_ITEMS
    ? column.tasks.slice(-MAX_VISIBLE_ITEMS) // Show last 8 items
    : column.tasks;
  const hiddenCount = Math.max(0, column.tasks.length - MAX_VISIBLE_ITEMS);

  const getColumnActionText = () => {
    switch (column.id) {
      case 'done': return 'completed item';
      case 'progress': return 'in-progress item';
      case 'todo': return 'pending item';
      default: return 'item';
    }
  };

  return (
    <div
      style={{
        ...styles.kanbanColumnGrid,
        borderTop: `3px solid ${column.color}`,
        // Auto-expansion: adjust min-height based on content
        minHeight: column.tasks.length > 5 ? '400px' : '300px',
        maxHeight: showAll ? '500px' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={styles.kanbanHeader}>
        <h3 style={{
          ...styles.kanbanColumnTitle,
          color: column.color,
        }}>
          {column.title}
        </h3>
        <span style={{
          ...styles.kanbanCount,
          background: `${column.color}20`,
          color: column.color,
        }}>
          {column.tasks.length}
        </span>
      </div>
      
      {/* Show hidden items indicator for all columns */}
      {hiddenCount > 0 && !showAll && (
        <div style={styles.hiddenItemsIndicator}>
          <button
            onClick={() => setShowAll(true)}
            style={styles.showMoreButton}
            className="show-more-hover"
          >
            <span style={styles.showMoreIcon}>⋯</span>
            <span style={styles.showMoreText}>
              {hiddenCount} more {getColumnActionText()}{hiddenCount !== 1 ? 's' : ''}
            </span>
            <span style={styles.showMoreArrow}>▼</span>
          </button>
        </div>
      )}
      
      <div 
        style={{
          ...styles.kanbanTasks,
          // Make all columns scrollable when expanded
          ...(showAll ? {
            maxHeight: '350px',
            overflowY: 'auto',
            paddingRight: '8px',
          } : {}),
          flex: 1,
        }}
        className={showAll ? 'kanban-scrollable' : ''}
      >
        {visibleTasks.map((task, index) => (
          <div
            key={`${column.id}-${index}`}
            style={{
              ...styles.kanbanTask,
              // Staggered animation delay for entrance
              animationDelay: `${index * 0.05}s`,
              // Fade effect for older items when showing limited view
              ...(!showAll && column.tasks.length > MAX_VISIBLE_ITEMS && index < 3 ? {
                opacity: 0.7,
              } : {}),
            }}
            className="kanban-task-hover"
            onMouseEnter={(e) => {
              const target = e.currentTarget;
              target.style.transform = 'translateX(4px) scale(1.01)';
              target.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(6,182,212,0.05) 100%)';
              target.style.borderColor = 'rgba(168,85,247,0.3)';
              target.style.boxShadow = '0 4px 20px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget;
              target.style.transform = 'translateX(0) scale(1)';
              target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(168,85,247,0.02) 100%)';
              target.style.borderColor = 'rgba(168,85,247,0.1)';
              target.style.boxShadow = 'none';
            }}
          >
            <span style={styles.kanbanTaskText}>{task}</span>
            {/* Add timestamps for all items based on column type */}
            <span style={styles.taskTimestamp}>
              {mounted ? (
                column.id === 'done'
                  ? `Completed ${new Date(Date.now() - (visibleTasks.length - index) * 86400000 * 2).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : column.id === 'progress'
                    ? `Started ${new Date(Date.now() - (visibleTasks.length - index) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : `Added ${new Date(Date.now() - (visibleTasks.length - index) * 86400000 * 0.5).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              ) : '...'}
            </span>
          </div>
        ))}
      </div>
      
      {/* Collapse button for all expanded columns */}
      {showAll && hiddenCount > 0 && (
        <div style={styles.collapseSection}>
          <button
            onClick={() => setShowAll(false)}
            style={styles.collapseButton}
            className="collapse-hover"
          >
            <span style={styles.collapseIcon}>▲</span>
            <span>Show less</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function OpieKanban(): React.ReactElement {
  // Note: messages are now managed by useConversations hook
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('plan');
  const [selectedModel, setSelectedModel] = useState<AIModel>('kimi');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  
  // Pending execution plan state
  const [pendingPlan, setPendingPlan] = useState<PendingExecutionPlan | null>(null);

  // Handle model switching
  const handleModelChange = async (model: AIModel) => {
    setSelectedModel(model);
    setShowModelDropdown(false);
    
    try {
      const res = await fetch('/api/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      
      if (res.ok) {
        console.log('Model switched to:', model);
      } else {
        console.error('Failed to switch model:', await res.text());
      }
    } catch (error) {
      console.error('Model switch error:', error);
    }
  };
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSheetContent, setMobileSheetContent] = useState<'agents' | 'task' | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Pinned conversations from useConversations hook (persisted)

  // Responsive state
  const responsive = useResponsive();
  const isMobile = responsive.isMobile;
  const isTablet = responsive.isTablet;
  const { triggerHaptic } = useHaptic();
  // Use real-time agent data from gateway (poll every 5 seconds, only when on agents/dashboard view)
  const shouldPollAgents = activeView === 'agents' || activeView === 'dashboard';
  const { activeAgents: realActiveAgents, activeCount: realActiveCount, refresh: refreshAgents } = useActiveAgents(5000, shouldPollAgents);
  const { nodes: agentNodes } = useAgentSessions(5000, shouldPollAgents);
  // Local state for agents deployed from this UI (merged with real data)
  const [localActiveAgents, setLocalActiveAgents] = useState<string[]>([]);
  // Merge real and local active agents (deduplicated)
  const activeAgents = Array.from(new Set([...realActiveAgents, ...localActiveAgents]));
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      agentId: 'research',
      agentName: 'Research Agent',
      agentEmoji: '🔍',
      label: 'Competitor analysis for lighting industry',
      startTime: new Date(Date.now() - 1000 * 60 * 5),
      status: 'running',
      output: 'Found 12 competitors in the local market...',
    },
    {
      id: '2',
      agentId: 'content',
      agentName: 'Content Agent',
      agentEmoji: '✍️',
      label: 'Write blog post about LED benefits',
      startTime: new Date(Date.now() - 1000 * 60 * 15),
      status: 'complete',
      output: 'Draft completed: 1,200 words covering 5 key benefits...',
    },
  ]);
  const [cronCount, setCronCount] = useState<number>(4); // Will be updated from API
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  
  const chatInputRef = useRef<HTMLInputElement>(null);
  const lastExtractionCountRef = useRef(0); // Track when we last extracted memory
  
  // Theme, sounds, and mobile hooks
  const { theme, themeName, toggleTheme } = useTheme();
  const { soundsEnabled, toggleSounds, playNotification, playSuccess } = useSounds();
  const bottomNavVisible = useBottomNav();
  const { currentParameters: personalityParams } = useAgentPersonality();
  const { memoryContext } = useMemoryRefresh(); // Auto-refreshes on tab focus/visibility

  // Conversation management
  const {
    conversations,
    activeConversation,
    pinnedConversationIds,
    createConversation,
    createConversationForSecondary,
    switchConversation,
    forkConversation,
    deleteConversation,
    updateMessages,
    updateMessagesForConversation,
    updateTitle,
    setSummary,
    pinConversation,
    unpinConversation,
  } = useConversations();

  // State for secondary chat windows (interactive pinned chats)
  const [pinnedInputs, setPinnedInputs] = useState<Record<string, string>>({});
  const [pinnedLoading, setPinnedLoading] = useState<Record<string, boolean>>({});

  // Dashboard chat: conversation sidebar, image upload, resizable panel
  const [showDashboardSidebar, setShowDashboardSidebar] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(isTablet ? 340 : 420);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const dashboardFileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUp = useRef(false);

  // Smart auto-scroll: scroll to bottom on new messages unless user scrolled up
  const handleChatScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    // Consider "at bottom" if within 80px of the bottom
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isUserScrolledUp.current = !atBottom;
  }, []);

  // Command center header: weather + daily quote
  const [weather, setWeather] = useState<{ temp: number; emoji: string; desc: string } | null>(null);
  const dailyQuote = useMemo(() => getDailyQuote(), []);

  useEffect(() => {
    // Fetch Scottsdale, AZ weather from Open-Meteo (free, no API key)
    fetch('https://api.open-meteo.com/v1/forecast?latitude=33.49&longitude=-111.93&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FPhoenix')
      .then(res => res.json())
      .then(data => {
        if (data.current) {
          const info = getWeatherInfo(data.current.weather_code);
          setWeather({ temp: Math.round(data.current.temperature_2m), ...info });
        }
      })
      .catch(() => {}); // Silently fail if offline
  }, []);

  // Use conversation messages instead of local state
  const messages = activeConversation?.messages || [];
  
  // Ref for synchronous access to latest messages (avoids stale closure)
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Wrapper to maintain setMessages API - updateMessages now supports functional updates  
  const setMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    updateMessages(updater);
  }, [updateMessages]);

  // Load saved state on mount
  useEffect(() => {
    setActiveView(getSavedView() as ViewId);
    setSidebarExpanded(getSidebarState());
  }, []);

  // Initialize conversation on first load
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation();
    }
  }, [conversations.length, createConversation]);

  // Auto-generate title from first user message
  useEffect(() => {
    if (!activeConversation) return;
    if (activeConversation.title !== 'New conversation') return;
    if (activeConversation.messages.length === 0) return;

    const firstUserMsg = activeConversation.messages.find(m => m.role === 'user');
    if (!firstUserMsg || !firstUserMsg.text) return;

    // Generate title from first user message (first ~30 chars, trimmed at word boundary)
    let title = firstUserMsg.text.trim();
    if (title.length > 35) {
      title = title.slice(0, 35);
      const lastSpace = title.lastIndexOf(' ');
      if (lastSpace > 20) {
        title = title.slice(0, lastSpace);
      }
      title += '...';
    }

    updateTitle(activeConversation.id, title);
  }, [activeConversation?.messages.length, activeConversation?.id, activeConversation?.title, updateTitle]);

  const handleViewChange = useCallback((view: ViewId) => {
    setActiveView(view);
    saveView(view);
    if (isMobile) {
      setMobileMenuOpen(false);
      triggerHaptic('selection');
    }
  }, [isMobile, triggerHaptic]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNavigate: handleViewChange,
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
    onNewMessage: () => {
      // Focus the floating chat or open it
      setActiveView('voice');
    },
    onCloseModal: () => {
      if (commandPaletteOpen) setCommandPaletteOpen(false);
      else if (shortcutsHelpOpen) setShortcutsHelpOpen(false);
      else if (mobileMenuOpen) setMobileMenuOpen(false);
    },
    onShowHelp: () => setShortcutsHelpOpen(true),
  });

  const toggleSidebar = () => {
    const newState = !sidebarExpanded;
    setSidebarExpanded(newState);
    saveSidebarState(newState);
  };

  const abortControllerRef = useRef<AbortController | null>(null);  // Cancel pending API requests

  useEffect(() => { setSessionId(getSessionId()); }, []);

  // ─── Voice Grammar Cleanup ─────────────────────────────────────
  // Cleans up raw speech-to-text: capitalizes sentences, adds punctuation,
  // fixes common STT artifacts — all client-side, zero latency.
  const cleanVoiceGrammar = useCallback((raw: string): string => {
    let text = raw.trim();
    if (!text) return text;

    // Collapse multiple spaces
    text = text.replace(/\s{2,}/g, ' ');

    // Capitalize first letter
    text = text.charAt(0).toUpperCase() + text.slice(1);

    // Capitalize after sentence-ending punctuation
    text = text.replace(/([.!?])\s+([a-z])/g, (_, p, c) => p + ' ' + c.toUpperCase());

    // Capitalize "I" when standalone
    text = text.replace(/\bi\b/g, 'I');

    // Fix "i'm" → "I'm", "i'll" → "I'll", "i've" → "I've", "i'd" → "I'd"
    text = text.replace(/\bI('m|'ll|'ve|'d)\b/gi, (_, s) => 'I' + s.toLowerCase());

    // Add period at end if no punctuation
    if (!/[.!?]$/.test(text)) {
      text += '.';
    }

    return text;
  }, []);

  // ─── Voice Engine (new unified system) ─────────────────────────
  // The voice engine handles: mic input → STT → silence detection → send → TTS → playback
  // with proper state machine, barge-in, cleanup, and browser compat.
  const handleVoiceSend = useCallback(async (text: string): Promise<string | void> => {
    // This is called by the voice engine when silence is detected.
    // Clean up grammar before sending to chat.
    const cleaned = cleanVoiceGrammar(text);
    // handleSend is defined below, so we use the ref pattern.
    return handleSendRef.current(cleaned);
  }, [cleanVoiceGrammar]);

  const voiceEngine = useVoiceEngine({
    onSend: handleVoiceSend,
    autoSpeak: true,
  });

  // ─── Plan Approval Handlers ────────────────────────────────────
  const handleExecutePlan = useCallback(async (planId: string) => {
    if (!pendingPlan || pendingPlan.id !== planId) {
      console.error('[Plan] Cannot execute: plan not found or mismatch');
      return;
    }

    try {
      setIsLoading(true);
      setPendingPlan(null); // Clear the pending plan immediately

      // Call the approval API
      const res = await fetch('/api/chat/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, action: 'approve' }),
      });

      if (!res.ok) {
        throw new Error(`Failed to approve plan: ${res.status}`);
      }

      // Check if response is streaming execution
      const contentType = res.headers.get('content-type') || '';
      const isStreaming = contentType.includes('text/event-stream');

      const assistantMsgId = generateMessageId();

      if (isStreaming && res.body) {
        // Handle streaming execution response
        const assistantMessage: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          text: '',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Read the execution stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  fullText += parsed.choices[0].delta.content;
                  setMessages(prev => prev.map(m => 
                    m.id === assistantMsgId ? { ...m, text: fullText } : m
                  ));
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } else {
        // Handle JSON response
        const data = await res.json();
        
        const assistantMessage: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          text: data.message || 'Plan executed successfully.',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      }

    } catch (error) {
      console.error('[Plan] Execution error:', error);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        text: `Sorry, failed to execute the plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [pendingPlan, setMessages]);

  const handleRejectPlan = useCallback(async (planId: string) => {
    if (!pendingPlan || pendingPlan.id !== planId) {
      console.error('[Plan] Cannot reject: plan not found or mismatch');
      return;
    }

    try {
      // Call the approval API to reject
      const res = await fetch('/api/chat/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, action: 'reject' }),
      });

      if (!res.ok) {
        console.error('[Plan] Failed to reject plan:', res.status);
      }

      // Clear the pending plan
      setPendingPlan(null);

      // Add a message to the chat indicating the plan was cancelled
      const cancelMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        text: 'Plan cancelled. Let me know if you\'d like to try a different approach.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, cancelMessage]);

    } catch (error) {
      console.error('[Plan] Rejection error:', error);
      setPendingPlan(null); // Clear anyway
    }
  }, [pendingPlan, setMessages]);

  const {
    micOn,
    transcript,
    isSpeaking,
    voiceState,
    toggleMic,
    stopSpeaking,
    cancelProcessing: cancelVoiceProcessing,
    speak,
    notifyResponse,
    audioRef,
    browserSupport: voiceBrowserSupport,
  } = voiceEngine;

  // Computed voice status for dashboard chat header
  const dashboardStatusText = useMemo(() => {
    switch (voiceState) {
      case 'listening': return '🎤 Listening...';
      case 'processing': return '✨ Thinking...';
      case 'speaking': return '🔊 Speaking...';
      default: return '● Online';
    }
  }, [voiceState]);

  // Smart auto-scroll: scroll to bottom on new messages unless user scrolled up
  useEffect(() => {
    if (isUserScrolledUp.current) return;
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading, transcript]);

  // Image upload helpers for dashboard chat
  const fileToBase64 = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) { resolve(null); return; }
      if (file.size > 5 * 1024 * 1024) { alert('Image must be less than 5MB'); resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleDashboardImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    if (base64) setPendingImage(base64);
    if (dashboardFileInputRef.current) dashboardFileInputRef.current.value = '';
  };

  const handleDashboardPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const base64 = await fileToBase64(file);
        if (base64) setPendingImage(base64);
        return;
      }
    }
  };

  // Resizable panel divider handlers
  const handlePanelResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingPanel) return;
    setRightPanelWidth(prev => Math.max(280, Math.min(600, prev - e.movementX)));
  }, [isResizingPanel]);

  useEffect(() => {
    if (isResizingPanel) {
      const handleMouseUp = () => setIsResizingPanel(false);
      window.addEventListener('mousemove', handlePanelResizeMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      return () => {
        window.removeEventListener('mousemove', handlePanelResizeMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizingPanel, handlePanelResizeMove]);

  // Ref for handleSend to avoid circular dependency with voice engine
  const handleSendRef = useRef<(text: string) => Promise<string | void>>(async () => {});

  const handleSummarizeAndContinue = async () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;

    try {
      const response = await fetch('/api/chat/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: activeConversation.messages }),
      });
      const data = await response.json();

      if (data.summary) {
        const newConv = createConversation();
        setSummary(newConv.id, data.summary);
      }
    } catch (error) {
      console.error('Failed to summarize:', error);
    }
  };

  const handleSend = async (text?: string, image?: string): Promise<string | void> => {
    const messageText = text || input;
    if ((!messageText.trim() && !image) || isLoading) return;
    
    // Ensure we have an active conversation before sending
    if (!activeConversation) {
      console.log('[Chat] No active conversation, creating one...');
      createConversation();
      // Wait a tick for state to update
      await new Promise(r => setTimeout(r, 50));
    }
    
    const userMsg = messageText.trim();
    
    // Create user message with proper structure
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      text: userMsg || (image ? '[Image]' : ''),
      timestamp: new Date(),
      status: 'sending',
      image: image,
    };
    
    // Use ref for synchronous access to latest messages (prevents stale closure)
    const currentMessages = messagesRef.current;
    const updatedMessages = [...currentMessages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    
    // Update user message status to sent
    setTimeout(() => {
      setMessages(prev => prev.map(m =>
        m.id === userMessage.id ? { ...m, status: 'sent' as const } : m
      ));
    }, 300);

    // Create abort controller for this request with 120s timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 120_000); // 120 second timeout

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg || 'What do you see in this image?',
          messages: prepareMessagesWithContext(updatedMessages),
          _debug: `Sending ${updatedMessages.length} messages`,
          sessionId,
          personality: personalityParams,
          image: image, // Include image in API call
          interactionMode, // Pass current interaction mode
          memoryContext: interactionMode === 'execute' ? memoryContext : undefined, // Include memory in EXECUTE mode
          pendingPlanId: pendingPlan?.id, // Pass pending plan ID for approval responses
        }),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-ok responses with clear error message
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Chat] HTTP error:', res.status, errorText.slice(0, 200));
        throw new Error(`Server error (${res.status}): ${errorText.slice(0, 100)}`);
      }

      // Check if response is SSE streaming
      const contentType = res.headers.get('content-type') || '';
      const isStreaming = contentType.includes('text/event-stream');

      let reply: string | null = null;
      const assistantMsgId = generateMessageId(); // Define outside for both branches

      if (isStreaming && res.body) {
        // SSE streaming response - create assistant message and update as chunks arrive
        const assistantMessage: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          text: '',
          timestamp: new Date(),
        };

        // Update user message to delivered and add empty assistant message
        setMessages(prev => [
          ...prev.map(m => m.id === userMessage.id ? { ...m, status: 'delivered' as const } : m),
          assistantMessage,
        ]);

        // Read SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (lines ending with \n\n)
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);

                // Check for error response first
                if (parsed.error) {
                  fullText = `Error: ${parsed.error}`;
                  setMessages(prev => prev.map(m =>
                    m.id === assistantMsgId ? { ...m, text: fullText } : m
                  ));
                  console.error('[Chat] SSE error:', parsed.error);
                }
                // Anthropic SSE format: content_block_delta with text
                else if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  fullText += parsed.delta.text;
                  setMessages(prev => prev.map(m =>
                    m.id === assistantMsgId ? { ...m, text: fullText } : m
                  ));
                }
                // OpenAI-compatible format (Ollama)
                else if (parsed.choices?.[0]?.delta?.content) {
                  fullText += parsed.choices[0].delta.content;
                  setMessages(prev => prev.map(m =>
                    m.id === assistantMsgId ? { ...m, text: fullText } : m
                  ));
                }
              } catch {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }

        reply = fullText || 'No response received';
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId ? { ...m, text: reply! } : m
        ));
        setIsLoading(false);

        // Mark user message as read
        setMessages(prev => prev.map(m =>
          m.id === userMessage.id ? { ...m, status: 'read' as const } : m
        ));

        // Voice engine handles TTS — notify it of the response
        if (reply && reply !== 'No response received') {
          notifyResponse(reply);
        }

        // Auto-extract memory every 10 messages
        const currentMsgCount = messagesRef.current.length;
        if (shouldExtractMemory(currentMsgCount, lastExtractionCountRef.current, 10)) {
          console.log('[Memory] Triggering auto-extraction at', currentMsgCount, 'messages');
          lastExtractionCountRef.current = currentMsgCount;
          extractMemory(messagesRef.current, activeConversation?.id || 'default', 'default')
            .then(result => console.log('[Memory] Extraction result:', result))
            .catch(err => console.error('[Memory] Extraction error:', err));
        }
      } else {
        // Regular JSON response
        const data = await res.json();

        // Check for pending execution plan
        if (data.pendingPlan && data.pendingPlan.requiresApproval) {
          console.log('[Chat] Received pending plan:', data.pendingPlan);
          setPendingPlan({
            id: data.pendingPlan.id,
            message: data.pendingPlan.message,
            plannedActions: data.pendingPlan.plannedActions,
            status: data.pendingPlan.status as 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'error',
            createdAt: new Date(data.pendingPlan.createdAt),
            requiresApproval: data.pendingPlan.requiresApproval,
            toolCallCount: data.pendingPlan.toolCallCount,
          });
          
          // Don't continue with normal response handling - the plan UI will take over
          setIsLoading(false);
          return;
        }

        // Check for async mode (EXECUTE)
        if (data.mode === 'async' && data.poll_url) {
          // Start polling for async response
          reply = await pollForAsyncResponse(
            data.poll_url, 
            userMessage.id,
            assistantMsgId || generateMessageId()
          );
        }
        // Extract reply - check for valid string
        else if (data.reply && typeof data.reply === 'string' && data.reply.trim().length > 0) {
          reply = data.reply;
        } else if (data.error) {
          reply = `Sorry, something went wrong: ${data.error === true ? 'Unknown error' : data.error}`;
        }

        // If still no reply, show helpful message
        if (!reply) {
          reply = 'Hmm, I didn\'t get a response. The server may be busy - please try again.';
        }

        // Update interaction mode if AI signaled a change
        if (data.mode && data.mode !== interactionMode) {
          setInteractionMode(data.mode);
        }

        // Update user message to delivered
        setMessages(prev => prev.map(m =>
          m.id === userMessage.id ? { ...m, status: 'delivered' as const } : m
        ));

        // Add assistant response
        const assistantMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          text: reply,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);

        // Mark user message as read once assistant responds
        setMessages(prev => prev.map(m =>
          m.id === userMessage.id ? { ...m, status: 'read' as const } : m
        ));

        // Voice engine handles TTS — notify it of the response
        if (reply && !data.error) {
          notifyResponse(reply);
        }
      }

      return reply || undefined;
    } catch (err: any) {
      clearTimeout(timeoutId);

      // If user interrupted while thinking, don't show error - just mark as cancelled
      if (err?.name === 'AbortError') {
        // Check if it was a timeout vs user cancel
        const isTimeout = err?.message?.includes('timeout') || err?.name === 'AbortError';
        setMessages(prev => prev.map(m =>
          m.id === userMessage.id ? {
            ...m,
            status: 'error' as const,
            text: userMsg + (isTimeout ? ' (request timed out after 120s)' : ' (cancelled)')
          } : m
        ));
        setIsLoading(false);

        // If timeout, show error message to user
        if (isTimeout) {
          const timeoutMessage: ChatMessage = {
            id: generateMessageId(),
            role: 'assistant',
            text: 'Sorry, the request timed out. The server might be busy - please try again.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, timeoutMessage]);
        }
        return;
      }

      // Add error response with actual error message
      const errorText = err?.message || 'Unknown error';
      console.error('[Chat] Error:', errorText);

      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        text: `Sorry, something went wrong: ${errorText.slice(0, 150)}`,
        timestamp: new Date(),
      };

      // Mark user message as error
      setMessages(prev => prev.map(m =>
        m.id === userMessage.id ? { ...m, status: 'error' as const } : m
      ));

      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  // Connect handleSend to the voice engine via ref (avoids circular dependency)
  handleSendRef.current = async (text: string): Promise<string | void> => {
    return handleSend(text);
  };

  // Handle send for secondary/pinned chat windows
  const handleSendToPinned = useCallback(async (conversationId: string, text: string, mode?: InteractionMode) => {
    if (!text.trim() || pinnedLoading[conversationId]) return;

    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    // Set loading state for this conversation
    setPinnedLoading(prev => ({ ...prev, [conversationId]: true }));
    setPinnedInputs(prev => ({ ...prev, [conversationId]: '' }));

    // Create user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
      status: 'sending',
    };

    // Add user message to conversation
    updateMessagesForConversation(conversationId, [...conv.messages, userMessage]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          messages: conv.messages.slice(-10),
          sessionId: getSessionId(),
          personality: personalityParams,
          interactionMode: mode || interactionMode,
          memoryContext: (mode || interactionMode) === 'execute' ? memoryContext : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }

      const contentType = res.headers.get('content-type') || '';
      const isStreaming = contentType.includes('text/event-stream');

      let reply = '';
      const assistantMsgId = generateMessageId();

      if (isStreaming && res.body) {
        // SSE streaming
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Add empty assistant message
        const assistantMessage: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          text: '',
          timestamp: new Date(),
        };
        updateMessagesForConversation(conversationId, [...conv.messages, userMessage, assistantMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  reply += parsed.delta.text;
                } else if (parsed.choices?.[0]?.delta?.content) {
                  reply += parsed.choices[0].delta.content;
                }
                // Update message in real-time
                const currentConv = conversations.find(c => c.id === conversationId);
                if (currentConv) {
                  const updatedMsgs = currentConv.messages.map(m =>
                    m.id === assistantMsgId ? { ...m, text: reply } : m
                  );
                  updateMessagesForConversation(conversationId, updatedMsgs);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        reply = reply || 'No response received';
      } else {
        // JSON response
        const data = await res.json();
        reply = data.reply || data.error || 'No response received';

        const assistantMessage: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          text: reply,
          timestamp: new Date(),
        };
        const currentConv = conversations.find(c => c.id === conversationId);
        if (currentConv) {
          updateMessagesForConversation(conversationId, [...currentConv.messages, assistantMessage]);
        }
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        text: `Sorry, something went wrong: ${err?.message || 'Unknown error'}`,
        timestamp: new Date(),
      };
      const currentConv = conversations.find(c => c.id === conversationId);
      if (currentConv) {
        updateMessagesForConversation(conversationId, [...currentConv.messages, errorMessage]);
      }
    } finally {
      setPinnedLoading(prev => ({ ...prev, [conversationId]: false }));
    }
  }, [conversations, pinnedLoading, updateMessagesForConversation, personalityParams, interactionMode, memoryContext]);

  const handleDeployAgent = async (agentId: string, taskLabel: string) => {
    const agentInfo: { [key: string]: { name: string; emoji: string } } = {
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

    // Create task entry immediately for UI feedback
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

    setTasks(prev => [newTask, ...prev]);
    setLocalActiveAgents(prev => prev.includes(agentId) ? prev : [...prev, agentId]);
    handleViewChange('tasks');

    // Actually spawn the agent via API
    try {
      const response = await apiFetch('/api/agents/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: agentId,
          task: taskLabel,
          label: `${agentId}-${taskId}`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update task with session ID
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, output: `Agent spawned: ${data.sessionId}`, sessionId: data.sessionId }
            : t
        ));
        // Refresh agent sessions
        refreshAgents();
      } else {
        // Mark task as failed
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: 'failed', output: data.error || 'Spawn failed' }
            : t
        ));
        setLocalActiveAgents(prev => prev.filter(id => id !== agentId));
      }
    } catch (error) {
      // Mark task as failed
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: 'failed', output: error instanceof Error ? error.message : 'Network error' }
          : t
      ));
      setLocalActiveAgents(prev => prev.filter(id => id !== agentId));
    }
  };

  // Enhanced Kanban columns with more realistic data and auto-expansion support
  const columns = [
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
        'Security Audit & Compliance'
      ]
    },
    { 
      id: 'progress', 
      title: 'In Progress', 
      color: '#667eea', 
      tasks: [
        'Voice Chat Enhancement',
        'Agent Dashboard Redesign',
        'Real-time Orchestration View',
        'Kanban Board Implementation'
      ]
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
        'Error Handling Framework'
      ]
    }
  ];

  const runningTasksCount = tasks.filter(t => t.status === 'running').length;

  // Get live status from the hook (poll every 3 seconds for real-time updates)
  const { status: liveStatus, loading: statusLoading } = useSystemStatus(3000);
  
  // Mobile Header - enhanced with live status
  const MobileHeaderComponent = () => {
    const getLiveStatus = () => {
      if (micOn) return 'listening';
      if (isSpeaking) return 'speaking'; 
      if (isLoading) return 'thinking';
      
      // Use real gateway status
      if (liveStatus?.opie?.status === 'thinking' || (liveStatus?.agents?.active && liveStatus.agents.active > 0)) {
        return 'thinking';
      }
      if (liveStatus?.opie?.status === 'offline') {
        return 'online'; // Don't show offline in mobile header
      }
      return 'online';
    };
    
    const statusText = (liveStatus?.agents?.active && liveStatus.agents.active > 0)
      ? `${liveStatus.agents.active} agents active`
      : NAV_ITEMS.find(n => n.id === activeView)?.label;
    
    return (
      <MobileHeader
        title="Opie"
        subtitle={statusText}
        status={getLiveStatus()}
        onMenuClick={() => setMobileMenuOpen(true)}
      />
    );
  };

  // Mobile Overlay
  const MobileOverlay = () => (
    mobileMenuOpen ? (
      <div style={styles.mobileOverlay} onClick={() => setMobileMenuOpen(false)} />
    ) : null
  );

  // Notification hooks for sidebar
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotification, 
    clearAll 
  } = useNotifications();

  // Memoized Sidebar to prevent re-renders during voice activity
  // The key insight is that the Sidebar itself doesn't need voice state
  const sidebarElement = useMemo(() => {
    const getCount = (itemId: ViewId): number | null => {
      if (itemId === 'agents') return activeAgents.length;
      if (itemId === 'tasks') return runningTasksCount;
      if (itemId === 'crons') return cronCount;
      return null;
    };

    return (
      <aside style={{
        ...styles.sidebar,
        width: sidebarExpanded ? '240px' : '72px',
        ...(isMobile ? {
          position: 'fixed',
          left: mobileMenuOpen ? 0 : '-100%',
          width: '280px',
          zIndex: 1000,
        } : {}),
      }}>
        {/* Opie Status Widget - Top of Sidebar */}
        <div style={{ 
          padding: sidebarExpanded ? '16px' : '12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Suspense fallback={null}>
            <OpieStatusWidget 
              size={sidebarExpanded ? "medium" : "small"}
              showDetails={sidebarExpanded}
              onClick={() => handleViewChange('settings')}
            />
          </Suspense>
        </div>
        
        {/* Sidebar Widgets - Calendar, Email, System Health */}
        {!isMobile && <Suspense fallback={null}><SidebarWidgets isExpanded={sidebarExpanded} /></Suspense>}
        
        {/* Collapse/Expand Toggle */}
        {!isMobile && (
          <div style={{
            padding: '8px 14px',
            display: 'flex',
            justifyContent: sidebarExpanded ? 'flex-end' : 'center',
          }}>
            <button onClick={toggleSidebar} style={styles.collapseBtn}>
              {sidebarExpanded ? '◀' : '▶'}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav style={styles.nav}>
          {NAV_ITEMS.map(item => {
            const count = getCount(item.id);
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                  justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                }}
                title={!sidebarExpanded ? item.label : undefined}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {sidebarExpanded && (
                  <>
                    <span style={styles.navLabel}>{item.label}</span>
                    {count !== null && count > 0 && (
                      <span style={{
                        ...styles.navBadge,
                        background: item.id === 'tasks' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)',
                        color: item.id === 'tasks' ? '#f59e0b' : '#22c55e',
                      }}>
                        {count}
                      </span>
                    )}
                  </>
                )}
                {!sidebarExpanded && count !== null && count > 0 && (
                  <span style={styles.navBadgeCollapsed}>{count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Stats */}
        {sidebarExpanded && (
          <div style={styles.quickStats}>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Active Agents</span>
              <span style={{ ...styles.statValue, color: '#22c55e' }}>{activeAgents.length}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Total Agents</span>
              <span style={{ ...styles.statValue, color: '#06b6d4' }}>42</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Running Tasks</span>
              <span style={{ ...styles.statValue, color: '#f59e0b' }}>{runningTasksCount}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Cron Jobs</span>
              <span style={{ ...styles.statValue, color: '#8b5cf6' }}>{cronCount}</span>
            </div>
          </div>
        )}

        {/* Notification Bell */}
        {sidebarExpanded && (
          <div style={{ padding: '12px 16px' }}>
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClear={clearNotification}
              onClearAll={clearAll}
            />
          </div>
        )}

        {/* Footer */}
        <div style={styles.sidebarFooter}>
          {sidebarExpanded ? (
            <span style={styles.footerText}>Omnia Intelligence</span>
          ) : (
            <span style={styles.footerIcon}>🌟</span>
          )}
        </div>
      </aside>
    );
  }, [
    // Only re-create sidebar when these change (NOT voice state!)
    sidebarExpanded,
    isMobile,
    mobileMenuOpen,
    activeView,
    activeAgents.length,
    runningTasksCount,
    cronCount,
    notifications,
    unreadCount,
    handleViewChange,
    toggleSidebar,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  ]);

  return (
    <NotificationProvider>
      <div style={styles.container}>
        {/* Premium particle background */}
        <Suspense fallback={null}>
          <ParticleBackground
            particleCount={50}
            intensity="low"
            mouseAttraction={!isMobile}
          />
        </Suspense>

        {/* Immersive voice mode overlay */}
        <ImmersiveVoiceMode
          isActive={activeView === 'voice' && micOn && !isMobile}
          isSpeaking={isSpeaking}
          isListening={micOn && !isLoading && !isSpeaking}
          isLoading={isLoading}
          transcript={transcript}
          lastResponse={messages[messages.length - 1]?.role === 'assistant' ? messages[messages.length - 1].text : ''}
          onClose={() => { if (micOn) toggleMic(); }}
          onMicToggle={toggleMic}
          micOn={micOn}
        />

        {isMobile && activeView !== 'voice' && <MobileHeaderComponent />}
        {isMobile && <MobileOverlay />}
        {sidebarElement}
      
      {/* Main Content */}
      <main style={{
        ...styles.main,
        marginLeft: isMobile ? 0 : (sidebarExpanded ? '240px' : '72px'),
        paddingTop: isMobile && activeView !== 'voice' ? '0' : 0,
        minHeight: isMobile ? '100dvh' : '100vh',
      }}>
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Loading…</div>}>
        {/* Dashboard View - Chat-First Layout */}
        {activeView === 'dashboard' && (
          <div style={{
            ...styles.viewContainer,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 0,
            padding: 0,
            height: isMobile ? 'auto' : '100vh',
            minHeight: isMobile ? '100dvh' : undefined,
            paddingTop: isMobile ? '72px' : undefined,
            paddingBottom: isMobile ? '100px' : undefined,
          }}>
            {/* Left/Center: Full-Featured Chat */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: isMobile ? 'auto' : '100vh',
              minHeight: isMobile ? '60vh' : undefined,
              background: 'linear-gradient(180deg, #0a0a14 0%, #0d0d18 100%)',
            }}>
              {/* Command Center header */}
              <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Top row: nav + title + weather + avatar + controls */}
                <div style={{
                  padding: isMobile ? '10px 16px' : '10px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Hamburger menu for conversation history */}
                    <button
                      onClick={() => setShowDashboardSidebar(true)}
                      style={{
                        width: 36, height: 36, borderRadius: 8,
                        border: 'none', background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.6)', fontSize: '18px',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                      title="Conversation history"
                    >
                      ☰
                    </button>
                    <OpieAvatar size={36} state={
                      voiceState === 'listening' ? 'listening' :
                      voiceState === 'processing' ? 'thinking' :
                      voiceState === 'speaking' ? 'speaking' : 'idle'
                    } />
                    <div style={{ display: 'flex', flexDirection: 'column' as const }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em' }}>
                        Command Center
                      </span>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 500,
                        color: voiceState !== 'idle' ? (
                          voiceState === 'listening' ? '#22c55e' :
                          voiceState === 'processing' ? '#667eea' : '#f59e0b'
                        ) : 'rgba(255,255,255,0.4)',
                      }}>
                        {dashboardStatusText}
                      </span>
                    </div>
                    {/* Scottsdale weather */}
                    {weather && !isMobile && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '4px 10px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        marginLeft: '6px',
                      }}>
                        <span style={{ fontSize: '16px' }}>{weather.emoji}</span>
                        <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>{weather.temp}°F</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Scottsdale</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* New conversation button */}
                    <button
                      onClick={() => createConversation()}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: '1px solid rgba(168,85,247,0.3)',
                        background: 'rgba(168,85,247,0.1)',
                        color: '#a855f7', fontSize: '18px', fontWeight: 300,
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                      title="New conversation"
                    >
                      +
                    </button>
                    {/* Model selector */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>🤖</span>
                        <span>{AI_MODELS.find(m => m.id === selectedModel)?.name || 'Claude Opus'}</span>
                        <span style={{ fontSize: '0.6rem' }}>{showModelDropdown ? '▲' : '▼'}</span>
                      </button>
                      {showModelDropdown && (
                        <div style={{
                          ...styles.modelDropdownMenu,
                          top: '100%',
                          right: 0,
                          left: 'auto',
                          marginTop: '4px',
                        }}>
                          {AI_MODELS.map(model => (
                            <button
                              key={model.id}
                              onClick={() => handleModelChange(model.id)}
                              style={{
                                ...styles.modelDropdownItem,
                                ...(selectedModel === model.id ? styles.modelDropdownItemActive : {}),
                              }}
                            >
                              <span style={styles.modelDropdownName}>{model.name}</span>
                              <span style={styles.modelDropdownDesc}>{model.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Quote of the day bar */}
                <div style={{
                  padding: '6px 24px',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(139,92,246,0.04)',
                }}>
                  <span style={{ fontSize: '12px', flexShrink: 0 }}>💡</span>
                  <span style={{
                    color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontStyle: 'italic',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    &ldquo;{dailyQuote.text}&rdquo;
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', flexShrink: 0 }}>
                    — {dailyQuote.author}
                  </span>
                  {/* Mobile weather (shown here since header is tight) */}
                  {weather && isMobile && (
                    <span style={{
                      marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem',
                      display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                    }}>
                      {weather.emoji} {weather.temp}°F
                    </span>
                  )}
                </div>
              </div>

              {/* Execution plan approval gate */}
              {pendingPlan && pendingPlan.requiresApproval && (
                <div style={{
                  margin: isMobile ? '12px 16px' : '12px 24px', padding: 16, borderRadius: 12,
                  border: '1px solid rgba(249,115,22,0.4)',
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.08) 100%)',
                  boxShadow: '0 4px 15px rgba(249,115,22,0.2)',
                  flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, justifyContent: 'center' }}>
                    <span style={{ fontSize: '24px', filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.6))' }}>✋</span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                      {pendingPlan.plannedActions?.[0] || pendingPlan.message}
                    </h3>
                  </div>
                  <div style={{
                    padding: 14, marginBottom: 12, fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.95)', background: 'rgba(0,0,0,0.3)',
                    borderRadius: 12, textAlign: 'center' as const, border: '1px solid rgba(249,115,22,0.3)',
                  }}>
                    <span style={{ display: 'block', lineHeight: 1.5 }}>
                      ✋ Waiting for approval — say <strong>&apos;yes&apos;</strong> to execute or <strong>&apos;no&apos;</strong> to cancel
                    </span>
                  </div>
                  {pendingPlan.toolCallCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                      <span style={{ fontWeight: 500 }}>
                        {pendingPlan.toolCallCount} tool{pendingPlan.toolCallCount !== 1 ? 's' : ''} ready to execute
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button onClick={() => handleRejectPlan(pendingPlan.id)}
                      style={{ padding: '8px 20px', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 20,
                        background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.85rem',
                        fontWeight: 500, cursor: 'pointer' }}>
                      No
                    </button>
                    <button onClick={() => handleExecutePlan(pendingPlan.id)}
                      style={{ padding: '8px 20px', border: '1px solid rgba(249,115,22,0.6)', borderRadius: 20,
                        background: 'rgba(249,115,22,0.3)', color: '#fb923c', fontSize: '0.85rem',
                        fontWeight: 500, cursor: 'pointer' }}>
                      Yes, Execute
                    </button>
                  </div>
                </div>
              )}

              {/* Chat messages area */}
              <div
                ref={chatContainerRef}
                onScroll={handleChatScroll}
                style={{
                ...styles.chatMessages,
                padding: isMobile ? '16px' : '24px 32px',
              }}>
                {messages.length === 0 && (
                  <div style={styles.emptyChat}>
                    <div style={{ ...styles.emptyChatIcon, fontSize: '64px' }}>💬</div>
                    <h3 style={styles.emptyChatTitle}>Chat with Opie</h3>
                    <p style={styles.emptyChatText}>Turn on the mic or type below to start a conversation</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={m.id || i}
                    style={{
                      ...styles.chatBubble,
                      ...(m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant)
                    }}
                  >
                    {m.image && (
                      <img src={m.image} alt="Attached" style={{
                        maxWidth: '100%', maxHeight: 200, borderRadius: 8,
                        marginBottom: m.text ? 8 : 0, display: 'block',
                      }} />
                    )}
                    {m.text}
                  </div>
                ))}
                {isLoading && (
                  <div style={{
                    ...styles.chatBubble,
                    ...styles.chatBubbleAssistant,
                    color: 'rgba(255,255,255,0.4)',
                  }}>
                    Thinking...
                  </div>
                )}
              </div>

              {/* Transcript bar */}
              {transcript && (
                <div style={styles.transcript}>🎙️ Hearing: {transcript}</div>
              )}

              {/* Pending image preview */}
              {pendingImage && (
                <div style={{
                  padding: '8px 24px', borderTop: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8,
                  flexShrink: 0,
                }}>
                  <img src={pendingImage} alt="Preview" style={{
                    maxWidth: 120, maxHeight: 80, borderRadius: 8, objectFit: 'cover' as const,
                  }} />
                  <button onClick={() => setPendingImage(null)} style={{
                    width: 24, height: 24, borderRadius: '50%', border: 'none',
                    background: 'rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                  }}>
                    ✕
                  </button>
                </div>
              )}

              {/* Mode toggle removed - unified mode */}

              {/* Input row with mic, camera, text, send */}
              <div style={{
                ...styles.voiceInput,
                padding: isMobile ? '12px 16px' : '12px 24px',
                gap: '10px',
              }}>
                {/* Mic button */}
                <button onClick={toggleMic} style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: micOn ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(255,255,255,0.15)',
                  background: micOn ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    : voiceState === 'processing' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(255,255,255,0.08)',
                  color: '#fff', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }} title={micOn ? 'Stop listening' : 'Start voice input'}>
                  <Mic size={20} strokeWidth={2} />
                </button>

                {/* Cancel processing */}
                {voiceState === 'processing' && cancelVoiceProcessing && (
                  <button onClick={cancelVoiceProcessing} style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                    background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '14px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }} title="Cancel">✕</button>
                )}
                {/* Stop speaking */}
                {voiceState === 'speaking' && stopSpeaking && (
                  <button onClick={stopSpeaking} style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff', fontSize: '14px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }} title="Stop speaking">⏹</button>
                )}

                {/* Camera / image upload */}
                <input ref={dashboardFileInputRef} type="file" accept="image/*"
                  onChange={handleDashboardImageSelect} style={{ display: 'none' }} />
                <button onClick={() => dashboardFileInputRef.current?.click()} style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: '1px solid rgba(139,92,246,0.3)',
                  background: 'rgba(139,92,246,0.1)', color: '#a78bfa',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }} title="Attach image">
                  <Camera size={18} strokeWidth={2} />
                </button>

                {/* Text input */}
                <input
                  ref={chatInputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onPaste={async (e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (let i = 0; i < items.length; i++) {
                      const item = items[i];
                      if (item.type.startsWith('image/')) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (!file) continue;
                        const reader = new FileReader();
                        reader.onload = () => setPendingImage(reader.result as string);
                        reader.readAsDataURL(file);
                        return;
                      }
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() || pendingImage) {
                        handleSend(input, pendingImage || undefined);
                        setPendingImage(null);
                      }
                    }
                  }}
                  placeholder="Type a message to Opie..."
                  style={styles.textInput}
                />

                {/* Send button */}
                <button
                  onClick={() => {
                    if (input.trim() || pendingImage) {
                      handleSend(input, pendingImage || undefined);
                      setPendingImage(null);
                    }
                  }}
                  style={{
                    ...styles.sendButton,
                    opacity: (input.trim() || pendingImage) && !isLoading ? 1 : 0.5,
                  }}
                  disabled={isLoading || (!input.trim() && !pendingImage)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Resizable divider handle (desktop only) */}
            {!isMobile && (
              <div
                onMouseDown={(e) => { e.preventDefault(); setIsResizingPanel(true); }}
                style={{
                  width: '6px',
                  cursor: 'col-resize',
                  background: isResizingPanel ? 'rgba(102,126,234,0.4)' : 'rgba(255,255,255,0.06)',
                  transition: isResizingPanel ? 'none' : 'background 0.2s ease',
                  flexShrink: 0,
                  position: 'relative' as const,
                  zIndex: 10,
                }}
                onMouseEnter={(e) => { if (!isResizingPanel) (e.currentTarget as HTMLElement).style.background = 'rgba(102,126,234,0.25)'; }}
                onMouseLeave={(e) => { if (!isResizingPanel) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                title="Drag to resize"
              >
                <div style={{
                  position: 'absolute' as const, top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex', flexDirection: 'column' as const, gap: 3,
                }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 3, height: 3, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.25)',
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Right: War Room + Agent Stats (desktop/tablet only) */}
            {!isMobile && (
              <div style={{
                width: `${rightPanelWidth}px`,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden',
              }}>
                <div style={{ flexShrink: 0 }}>
                  <AgentCommandCenter compact={isTablet} isThinking={isLoading} />
                </div>

                {/* Real-Time Agent Stats — terminal style */}
                <div style={{
                  flex: 1,
                  borderTop: '1px solid rgba(0,255,200,0.15)',
                  background: 'linear-gradient(180deg, rgba(0,10,20,0.95) 0%, rgba(0,5,15,0.98) 100%)',
                  padding: '14px 16px',
                  overflowY: 'auto',
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(0,255,200,0.1)',
                  }}>
                    <span style={{
                      color: '#00ffc8',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase' as const,
                    }}>
                      Real-Time Agent Stats
                    </span>
                    <span style={{
                      color: 'rgba(0,255,200,0.4)',
                      fontSize: '0.6rem',
                    }}>
                      {agentNodes.filter(n => n.status === 'working').length}/{agentNodes.length} active
                    </span>
                  </div>

                  {/* Agent rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {agentNodes.map((node) => {
                      const statusColor = node.status === 'working' ? '#f59e0b'
                        : node.status === 'connected' ? '#22c55e' : 'rgba(255,255,255,0.25)';
                      const statusLabel = node.status === 'working' ? 'BUSY'
                        : node.status === 'connected' ? 'ONLINE' : 'IDLE';
                      const isBusy = node.status === 'working';

                      return (
                        <div
                          key={node.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            background: isBusy ? 'rgba(245,158,11,0.06)' : 'transparent',
                            fontSize: '0.72rem',
                            lineHeight: 1.4,
                          }}
                        >
                          <span style={{
                            color: node.color,
                            fontWeight: 600,
                            width: '80px',
                            flexShrink: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {node.emoji} {node.name.toUpperCase()}
                          </span>
                          <span style={{
                            color: statusColor,
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            border: `1px solid ${statusColor}`,
                            background: `${statusColor}15`,
                            width: '52px',
                            textAlign: 'center' as const,
                            flexShrink: 0,
                          }}>
                            {statusLabel}
                          </span>
                          <span style={{
                            color: isBusy ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
                            fontSize: '0.65rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}>
                            {node.currentTask
                              ? `[TASK: ${node.currentTask.toUpperCase().slice(0, 20)}]`
                              : node.status === 'connected'
                                ? `[LOAD: ${Math.floor(Math.random() * 40 + 10)}%]`
                                : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer scan line */}
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(0,255,200,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.6rem',
                    color: 'rgba(0,255,200,0.3)',
                  }}>
                    <span>SYS: NOMINAL</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile: War Room as collapsible below chat */}
            {isMobile && (
              <div style={{ padding: '16px' }}>
                <CollapsibleSection title="Agent Command Center" icon="⚡" badge={realActiveCount}>
                  <AgentCommandCenter compact={true} isThinking={isLoading} />
                </CollapsibleSection>
              </div>
            )}

            {/* Conversation History Sidebar */}
            <style>{sidebarAnimationStyles}</style>
            <ConversationSidebar
              isOpen={showDashboardSidebar}
              onClose={() => setShowDashboardSidebar(false)}
              conversations={conversations}
              activeConversationId={activeConversation?.id || null}
              onSelectConversation={(id) => { switchConversation(id); setShowDashboardSidebar(false); }}
              onNewConversation={() => { createConversation(); setShowDashboardSidebar(false); }}
              onDeleteConversation={deleteConversation}
              pinnedConversationIds={pinnedConversationIds}
              onPinConversation={pinConversation}
            />
          </div>
        )}

        {/* Project Board View - Kanban + Activity Feed */}
        {activeView === 'board' && (
          <div style={{
            ...styles.viewContainer,
            padding: isMobile ? '16px' : isTablet ? '24px' : '32px',
            paddingTop: isMobile ? '72px' : undefined,
            paddingBottom: isMobile ? '100px' : undefined,
          }}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                📋 Project Board
              </h1>
              <p style={styles.viewSubtitle}>
                {isMobile ? 'Track project progress' : 'Track tasks across your project pipeline'}
              </p>
            </div>

            {/* Kanban Board */}
            <div style={styles.kanbanSection}>
              <div style={styles.kanbanBoard}>
                {columns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div style={{ marginTop: '24px' }}>
              {isMobile ? (
                <CollapsibleSection title="Activity Feed" icon="⚡" defaultOpen>
                  <ActivityFeed
                    maxItems={20}
                    pollInterval={15000}
                    isThinking={isLoading}
                    enabled={activeView === 'board'}
                  />
                </CollapsibleSection>
              ) : (
                <ActivityFeed
                  maxItems={50}
                  pollInterval={15000}
                  isThinking={isLoading}
                  enabled={activeView === 'board'}
                />
              )}
            </div>
          </div>
        )}

        {/* Agents View */}
        {activeView === 'agents' && (
          <div style={{
            ...styles.viewContainer,
            padding: isMobile ? '16px' : isTablet ? '24px' : '32px',
            paddingTop: isMobile ? '72px' : undefined,
            paddingBottom: isMobile ? '100px' : undefined,
          }}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                🤖 Agent Command Center
              </h1>
              <p style={styles.viewSubtitle}>
                {isMobile ? 'Deploy & monitor AI agents' : 'Deploy and manage your specialist AI agents in real-time'}
              </p>
            </div>
            <AgentsPanel onDeploy={handleDeployAgent} activeAgents={activeAgents} />
          </div>
        )}

        {/* Organization View */}
        {activeView === 'organization' && (
          <div style={{
            ...styles.viewContainer,
            padding: isMobile ? '16px' : isTablet ? '24px' : '32px',
            paddingTop: isMobile ? '72px' : undefined,
            paddingBottom: isMobile ? '100px' : undefined,
          }}>
            <OrganizationChart
              isMobile={isMobile}
              isTablet={isTablet}
            />
          </div>
        )}

        {/* Skills View */}
        {activeView === 'skills' && (
          <div style={{
            ...styles.viewContainer,
            padding: isMobile ? '16px' : isTablet ? '24px' : '32px',
            paddingTop: isMobile ? '72px' : undefined,
            paddingBottom: isMobile ? '100px' : undefined,
          }}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                Skill Catalog
              </h1>
              <p style={styles.viewSubtitle}>Browse available capabilities</p>
            </div>
            <SkillsPanel />
          </div>
        )}

        {/* Tasks View */}
        {activeView === 'tasks' && (
          <div style={{
            ...styles.viewContainer,
            padding: isMobile ? '16px' : isTablet ? '24px' : '32px',
            paddingTop: isMobile ? '72px' : undefined,
            paddingBottom: isMobile ? '100px' : undefined,
          }}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                📋 Active Tasks
              </h1>
              <p style={styles.viewSubtitle}>
                {isMobile ? 'Task monitoring' : 'Monitor and manage active task execution'}
              </p>
            </div>
            {/* Tasks now take full width since orchestration moved to dashboard */}
            <ActiveTasksPanel 
              tasks={tasks} 
              onTaskClick={isMobile ? (taskId) => {
                const task = tasks.find(t => t.id === taskId);
                if (task) setSelectedTask(task);
                setMobileSheetContent('task');
                triggerHaptic('selection');
              } : undefined}
            />
          </div>
        )}

        {/* Crons View */}
        {activeView === 'crons' && (
          <div style={{
            ...styles.viewContainer,
            padding: isMobile ? '16px' : isTablet ? '24px' : '32px',
            paddingTop: isMobile ? '72px' : undefined,
            paddingBottom: isMobile ? '100px' : undefined,
          }}>
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
              onCronCountChange={setCronCount}
            />
          </div>
        )}

        {/* Voice View */}
        {activeView === 'voice' && (
          isMobile ? (
            <MobileChat
              messages={messages}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              onSend={() => handleSend(input)}
              micOn={micOn}
              onMicToggle={toggleMic}
              isSpeaking={isSpeaking}
              transcript={transcript}
              onBack={() => handleViewChange('dashboard')}
            />
          ) : (
            <div style={styles.voiceContainer}>
              <div style={styles.chatMessages}>
                {messages.length === 0 && (
                  <div style={styles.emptyChat}>
                    <div style={styles.emptyChatIcon}>🎤</div>
                    <h3 style={styles.emptyChatTitle}>Voice Chat with Opie</h3>
                    <p style={styles.emptyChatText}>Turn on the mic or type below to start</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div 
                    key={i} 
                    style={{
                      ...styles.chatBubble,
                      ...(m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant)
                    }}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              
              {transcript && (
                <div style={styles.transcript}>🎙️ Hearing: {transcript}</div>
              )}
              
              <div style={styles.voiceInput}>
                <button 
                  onClick={toggleMic} 
                  style={{
                    ...styles.micButton,
                    background: micOn ? '#22c55e' : '#ef4444',
                  }}
                >
                  {micOn ? '🎤 Listening...' : '🎤 Start Mic'}
                </button>
                <input 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter') handleSend(input); }} 
                  placeholder="Type a message..." 
                  style={styles.textInput} 
                />
                <button 
                  onClick={() => handleSend(input)} 
                  style={styles.sendButton}
                  disabled={isLoading}
                >
                  {isLoading ? '...' : 'Send'}
                </button>
              </div>
            </div>
          )
        )}

        {/* Memory View */}
        {activeView === 'memory' && (
          <div style={{
            ...styles.viewContainer,
            padding: isMobile ? '16px' : isTablet ? '24px' : '32px',
            paddingTop: isMobile ? '72px' : undefined,
            paddingBottom: isMobile ? '100px' : undefined,
          }}>
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
        )}

        {/* Email View */}
        {/* Removed: Email and Calendar full views */}

        {/* Leaderboard View */}
        {activeView === 'leaderboard' && (
          <div style={{
            ...styles.viewContainer,
            padding: isMobile ? '16px' : isTablet ? '24px' : '32px',
            paddingTop: isMobile ? '72px' : undefined,
            paddingBottom: isMobile ? '100px' : undefined,
          }}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                Agent Leaderboard
              </h1>
              <p style={styles.viewSubtitle}>
                {isMobile ? 'Agent rankings' : 'Track agent performance and find the best agent for each task'}
              </p>
            </div>
            <div style={{ maxWidth: 800 }}>
              <AgentLeaderboard />
            </div>
          </div>
        )}

        {/* Model Counsel View */}
        {activeView === 'model-counsel' && (
          <div style={{
            ...styles.viewContainer,
            paddingTop: isMobile ? '72px' : undefined,
            paddingBottom: isMobile ? '100px' : undefined,
          }}>
            <Suspense fallback={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '400px',
                color: '#666'
              }}>
                Loading Model Counsel...
              </div>
            }>
              <ModelCounsel />
            </Suspense>
          </div>
        )}

        {/* Context Window View */}
        {activeView === 'context' && (
          <div style={{
            ...styles.viewContainer,
            padding: isMobile ? '16px' : isTablet ? '24px' : '32px',
            paddingTop: isMobile ? '72px' : undefined,
            paddingBottom: isMobile ? '100px' : undefined,
          }}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                Context Window
              </h1>
              <p style={styles.viewSubtitle}>
                {isMobile ? 'Working memory' : 'See what\'s in the agent\'s working memory'}
              </p>
            </div>
            <div style={{ maxWidth: 600 }}>
              <ContextWindowVisualizer enabled={activeView === 'context'} />
            </div>
          </div>
        )}

        {/* Settings View */}
        {activeView === 'settings' && (
          <div style={{
            ...styles.viewContainer,
            padding: isMobile ? '16px' : isTablet ? '24px' : '32px',
            paddingTop: isMobile ? '72px' : undefined,
            paddingBottom: isMobile ? '100px' : undefined,
          }}>
            <div style={styles.viewHeader}>
              <h1 style={{ ...styles.viewTitle, fontSize: isMobile ? '1.5rem' : '1.75rem' }}>
                Settings
              </h1>
              <p style={styles.viewSubtitle}>Configure your Opie instance</p>
            </div>
            <div style={{
              ...styles.settingsGrid,
              gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
              gap: isMobile ? '16px' : '20px',
            }}>
              <div style={styles.settingsCard}>
                <h4 style={styles.settingsCardTitle}>🎨 Appearance</h4>
                <div style={styles.settingItem}>
                  <span>Theme</span>
                  <button 
                    onClick={toggleTheme}
                    style={{
                      ...styles.settingToggle,
                      background: themeName === 'dark' 
                        ? 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)'
                        : 'linear-gradient(135deg, #f8f9fc 0%, #e8eaed 100%)',
                      color: themeName === 'dark' ? '#fff' : '#1a1a2e',
                    }}
                  >
                    {themeName === 'dark' ? '🌙 Dark' : '☀️ Light'}
                  </button>
                </div>
                <div style={styles.settingItem}>
                  <span>Sidebar</span>
                  <button 
                    onClick={toggleSidebar}
                    style={styles.settingToggle}
                  >
                    {sidebarExpanded ? '◀ Collapse' : '▶ Expand'}
                  </button>
                </div>
              </div>
              <div style={styles.settingsCard}>
                <h4 style={styles.settingsCardTitle}>🔊 Sound & Voice</h4>
                <div style={styles.settingItem}>
                  <span>Notification Sounds</span>
                  <button 
                    onClick={toggleSounds}
                    style={{
                      ...styles.settingToggle,
                      background: soundsEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                      color: soundsEnabled ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {soundsEnabled ? '🔔 On' : '🔕 Muted'}
                  </button>
                </div>
                <div style={styles.settingItem}>
                  <span>TTS Voice</span>
                  <span style={styles.settingValue}>Default</span>
                </div>
                <div style={styles.settingItem}>
                  <span>Speech Speed</span>
                  <span style={styles.settingValue}>1.0x</span>
                </div>
              </div>
              <div style={styles.settingsCard}>
                <h4 style={styles.settingsCardTitle}>⌨️ Keyboard Shortcuts</h4>
                <div style={styles.settingItem}>
                  <span>Command Palette</span>
                  <kbd style={styles.kbdKey}>⌘K</kbd>
                </div>
                <div style={styles.settingItem}>
                  <span>New Message</span>
                  <kbd style={styles.kbdKey}>⌘N</kbd>
                </div>
                <div style={styles.settingItem}>
                  <span>Show All Shortcuts</span>
                  <button 
                    onClick={() => setShortcutsHelpOpen(true)}
                    style={styles.settingToggle}
                  >
                    View All ➔
                  </button>
                </div>
              </div>
              <div style={styles.settingsCard}>
                <h4 style={styles.settingsCardTitle}>🤖 Agent Settings</h4>
                <div style={styles.settingItem}>
                  <span>Auto-deploy</span>
                  <span style={styles.settingValue}>Off</span>
                </div>
                <div style={styles.settingItem}>
                  <span>Max concurrent</span>
                  <span style={styles.settingValue}>5</span>
                </div>
              </div>
              <div style={styles.settingsCard}>
                <h4 style={styles.settingsCardTitle}>🔑 API Keys</h4>
                <div style={styles.settingItem}>
                  <span>OpenAI</span>
                  <span style={{ ...styles.settingValue, color: '#22c55e' }}>Connected</span>
                </div>
                <div style={styles.settingItem}>
                  <span>ElevenLabs</span>
                  <span style={{ ...styles.settingValue, color: '#22c55e' }}>Connected</span>
                </div>
              </div>
              <div style={styles.settingsCard}>
                <h4 style={styles.settingsCardTitle}>📱 PWA</h4>
                <div style={styles.settingItem}>
                  <span>Install Status</span>
                  <span style={styles.settingValue}>Available</span>
                </div>
                <div style={styles.settingItem}>
                  <span>Offline Support</span>
                  <span style={{ ...styles.settingValue, color: '#22c55e' }}>Enabled</span>
                </div>
              </div>
            </div>
            {/* Agent Personality Section */}
            <div style={{ marginTop: isMobile ? '24px' : '32px', maxWidth: 600 }}>
              <AgentPersonalityPanel />
            </div>
          </div>
        )}
        </Suspense>
      </main>

      {/* Command Palette */}
      <CommandPalette 
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleViewChange}
        onNewMessage={() => {
          setActiveView('voice');
          setCommandPaletteOpen(false);
        }}
      />

      {/* Shortcuts Help Modal */}
      <ShortcutsHelp 
        isOpen={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      {isMobile && activeView !== 'voice' && (
        <MobileNavigation
          activeView={activeView}
          onNavigate={handleViewChange}
          agentCount={activeAgents.length}
          taskCount={runningTasksCount}
          isVisible={bottomNavVisible}
        />
      )}

      {/* Mobile FAB for quick actions on Project Board */}
      {isMobile && activeView === 'board' && (
        <FloatingActionButton
          icon="💬"
          onClick={() => handleViewChange('dashboard')}
          color="primary"
          label="Chat with Opie"
        />
      )}

      {/* Mobile Bottom Sheets */}
      <BottomSheet
        isOpen={mobileSheetContent === 'task' && selectedTask !== null}
        onClose={() => { setMobileSheetContent(null); setSelectedTask(null); }}
        title={selectedTask?.label || 'Task Details'}
        subtitle={selectedTask?.agentName}
        height="half"
      >
        {selectedTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>{selectedTask.agentEmoji}</span>
              <div>
                <div style={{ color: '#fff', fontWeight: 600 }}>{selectedTask.agentName}</div>
                <div style={{ 
                  color: selectedTask.status === 'running' ? '#f59e0b' : '#22c55e',
                  fontSize: '0.85rem' 
                }}>
                  {selectedTask.status === 'running' ? '⏳ Running' : '✓ Complete'}
                </div>
              </div>
            </div>
            {selectedTask.output && (
              <div style={{ 
                padding: '16px', 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '12px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
              }}>
                {selectedTask.output}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      <style>{`
        /* Premium Animation Keyframes */
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(102, 126, 234, 0.5);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseRing {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        
        /* Premium Hover Effects */
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }
        
        /* Skeleton Loading */
        .skeleton {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.03) 0%,
            rgba(255, 255, 255, 0.08) 50%,
            rgba(255, 255, 255, 0.03) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s ease infinite;
          border-radius: 8px;
        }
        
        /* Status Dot with Glow */
        .status-dot-online {
          background: #22c55e;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.6);
          position: relative;
        }
        .status-dot-online::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: inherit;
          background: #22c55e;
          animation: pulseRing 2s ease-out infinite;
        }
        
        /* Premium Card Hover */
        .premium-card-hover {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
          border-color: rgba(255,255,255,0.1);
        }
        
        /* Kanban Task Hover Effects */
        .kanban-task-hover:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(99,102,241,0.3) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }
        
        /* Enhanced Kanban Scrollbar */
        .kanban-scrollable::-webkit-scrollbar {
          width: 4px;
        }
        .kanban-scrollable::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          borderRadius: 2px;
        }
        .kanban-scrollable::-webkit-scrollbar-thumb {
          background: rgba(34,197,94,0.3);
          borderRadius: 2px;
        }
        .kanban-scrollable::-webkit-scrollbar-thumb:hover {
          background: rgba(34,197,94,0.5);
        }
        
        /* Show More Button Hover */
        .show-more-hover:hover {
          color: rgba(255,255,255,0.8) !important;
          background: rgba(255,255,255,0.04) !important;
        }
        
        /* Collapse Button Hover */
        .collapse-hover:hover {
          background: rgba(255,255,255,0.06) !important;
          color: rgba(255,255,255,0.7) !important;
          border-color: rgba(255,255,255,0.12) !important;
        }
        
        /* Animated Gradient Border */
        .gradient-border {
          position: relative;
        }
        .gradient-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(
            135deg,
            rgba(102, 126, 234, 0.4),
            rgba(168, 85, 247, 0.4),
            rgba(6, 182, 212, 0.4),
            rgba(102, 126, 234, 0.4)
          );
          background-size: 300% 300%;
          animation: gradientFlow 8s ease infinite;
          -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .gradient-border:hover::before {
          opacity: 1;
        }
        
        /* Custom scrollbar for premium feel */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        
        /* Text gradient utility */
        .text-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        /* Focus ring */
        *:focus-visible {
          outline: 2px solid rgba(102, 126, 234, 0.8);
          outline-offset: 2px;
        }
      `}</style>
      </div>
    </NotificationProvider>
  );
}

/* ==========================================================================
   PREMIUM STYLES - Enterprise-Grade Visual Design
   ========================================================================== */

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0a0a14',
    position: 'relative',
  },

  // ==========================================================================
  // SIDEBAR - Premium Glass Morphism
  // ==========================================================================
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    background: '#020514',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 100,
    boxShadow: '4px 0 30px rgba(0,0,0,0.3)',
  },
  sidebarHeader: {
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    position: 'relative',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  logo: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease',
  },
  brandName: {
    color: '#fff',
    fontSize: '1.35rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
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
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 24px',
    background: 'linear-gradient(90deg, rgba(102,126,234,0.05) 0%, transparent 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    position: 'relative',
    boxShadow: '0 0 10px currentColor',
  },
  statusText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
    fontWeight: 500,
    letterSpacing: '0.02em',
  },
  nav: {
    flex: 1,
    padding: '20px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    borderRadius: '12px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '0.925rem',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    textAlign: 'left',
    width: '100%',
    fontWeight: 500,
    letterSpacing: '-0.01em',
  },
  navItemActive: {
    background: 'linear-gradient(135deg, rgba(102,126,234,0.18) 0%, rgba(118,75,162,0.12) 100%)',
    color: '#fff',
    boxShadow: 'inset 0 0 0 1px rgba(102,126,234,0.2), 0 2px 12px rgba(102,126,234,0.1)',
  },
  navIcon: {
    fontSize: '1.25rem',
    width: '26px',
    textAlign: 'center',
    transition: 'transform 0.2s ease',
  },
  navLabel: {
    flex: 1,
    fontWeight: 500,
  },
  navBadge: {
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  navBadgeCollapsed: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: '#000',
    fontSize: '0.6rem',
    fontWeight: 700,
    padding: '3px 6px',
    borderRadius: '10px',
    minWidth: '18px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
  },
  quickStats: {
    padding: '18px',
    margin: '0 14px 14px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    position: 'relative',
    overflow: 'hidden',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.8rem',
    fontWeight: 500,
    letterSpacing: '0.01em',
  },
  statValue: {
    fontWeight: 700,
    fontSize: '0.95rem',
    fontVariantNumeric: 'tabular-nums',
  },
  sidebarFooter: {
    padding: '18px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center',
    background: 'linear-gradient(180deg, transparent 0%, rgba(102,126,234,0.03) 100%)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  },
  footerIcon: {
    fontSize: '18px',
    opacity: 0.5,
  },

  // ==========================================================================
  // MOBILE - Premium Responsive
  // ==========================================================================
  mobileHeader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '64px',
    background: 'rgba(13, 13, 21, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    zIndex: 50,
  },
  hamburger: {
    width: '44px',
    height: '44px',
    background: 'rgba(255,255,255,0.04)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '22px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  mobileTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1.1rem',
    letterSpacing: '-0.02em',
  },
  mobileLogo: {
    fontSize: '22px',
    filter: 'drop-shadow(0 0 10px rgba(102,126,234,0.5))',
  },
  mobileStatus: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    boxShadow: '0 0 12px currentColor',
  },
  mobileOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 99,
  },

  // ==========================================================================
  // MAIN CONTENT - Premium Layout
  // ==========================================================================
  main: {
    flex: 1,
    minHeight: '100vh',
    transition: 'margin-left 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    background: 'linear-gradient(180deg, #0a0a14 0%, #0d0d18 100%)',
    position: 'relative',
  },
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

  // ==========================================================================
  // MODEL SELECTOR STYLES
  // ==========================================================================
  modelSelectorSection: {
    marginBottom: '24px',
  },
  modelSelectorInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  modelSelectorLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  modelSelectorDropdown: {
    position: 'relative' as const,
    flex: 1,
    maxWidth: '300px',
  },
  modelSelectorButton: {
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
  },
  modelSelectorName: {
    // inherits from button
  },
  modelSelectorArrow: {
    fontSize: '0.7rem',
    opacity: 0.6,
  },
  modelDropdownMenu: {
    position: 'absolute' as const,
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
  },
  modelDropdownItem: {
    width: '100%',
    padding: '14px 16px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.95rem',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '4px',
    textAlign: 'left' as const,
    transition: 'background 0.15s ease',
  },
  modelDropdownItemActive: {
    background: 'rgba(99, 102, 241, 0.25)',
  },
  modelDropdownName: {
    fontWeight: 600,
  },
  modelDropdownDesc: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.5)',
  },

  // ==========================================================================
  // KANBAN BOARD STYLES
  // ==========================================================================
  kanbanSection: {
    marginBottom: '32px',
    padding: '24px',
    background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.03) 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  kanbanTitle: {
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: '0 0 20px 0',
    letterSpacing: '-0.02em',
  },
  kanbanBoard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  kanbanColumn: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
  },
  kanbanHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  kanbanColumnTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
  },
  kanbanCount: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  kanbanTasks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  kanbanTask: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(168,85,247,0.02) 100%)',
    borderRadius: '12px',
    padding: '14px',
    border: '1px solid rgba(168,85,247,0.1)',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    // Stagger animation will be applied inline with index
    animation: 'fadeInUp 0.4s ease-out backwards',
  },
  kanbanTaskHover: {
    transform: 'translateX(4px) scale(1.01)',
    background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(6,182,212,0.05) 100%)',
    borderColor: 'rgba(168,85,247,0.3)',
    boxShadow: '0 4px 20px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  kanbanTaskText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: '0.85rem',
    fontWeight: 500,
    lineHeight: 1.4,
    flex: 1,
  },
  taskTimestamp: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
    fontWeight: 400,
    marginTop: '4px',
    fontStyle: 'italic',
  },
  hiddenItemsIndicator: {
    padding: '8px 12px',
    marginBottom: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  showMoreButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: '0',
    transition: 'all 0.2s ease',
  },
  showMoreIcon: {
    fontSize: '1.2rem',
    color: '#22c55e',
  },
  showMoreText: {
    flex: 1,
    textAlign: 'left',
    marginLeft: '8px',
  },
  showMoreArrow: {
    fontSize: '0.7rem',
    color: '#22c55e',
  },
  collapseSection: {
    paddingTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    marginTop: '8px',
  },
  collapseButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
    padding: '6px 12px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  collapseIcon: {
    fontSize: '0.7rem',
    color: '#22c55e',
  },

  // ==========================================================================
  // DASHBOARD - Premium Cards & Grid
  // ==========================================================================
  dashboardTopRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '28px',
    marginBottom: '28px',
  },
  quickActionsWrapper: {
    minWidth: 0,
  },
  orchestrationWrapper: {
    minWidth: 0,
  },
  analyticsSection: {
    marginBottom: '28px',
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '28px',
    marginBottom: '28px',
  },
  // Removed duplicate kanbanSection property
  sectionTitle: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
    margin: '0 0 20px 0',
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  kanbanGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '18px',
  },
  kanbanColumnGrid: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(168,85,247,0.02) 100%)',
    borderRadius: '16px',
    borderTop: '3px solid',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    border: '1px solid rgba(168,85,247,0.1)',
    borderTopWidth: '3px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  columnHeader: {
    padding: '16px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    letterSpacing: '-0.01em',
  },
  columnCount: {
    background: 'rgba(255,255,255,0.08)',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  columnTasks: {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  taskCard: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '12px',
    padding: '14px 16px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '0.85rem',
    border: '1px solid rgba(255,255,255,0.04)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  orchestrationSection: {},
  widgetsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '28px',
    marginBottom: '28px',
  },
  activityFeedWrapper: {
    marginTop: '28px',
  },
  recentActivity: {
    background: 'rgba(20, 20, 35, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '14px',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
  },
  activityEmoji: {
    fontSize: '22px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '10px',
  },
  activityText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  activityStatus: {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },

  // ==========================================================================
  // TASKS GRID
  // ==========================================================================
  tasksGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '28px',
  },

  // ==========================================================================
  // VOICE CHAT - Premium Chat UI
  // ==========================================================================
  voiceContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'linear-gradient(180deg, #0a0a14 0%, #0d0d18 100%)',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  emptyChat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
  },
  emptyChatIcon: {
    fontSize: '80px',
    marginBottom: '24px',
    filter: 'drop-shadow(0 0 30px rgba(102,126,234,0.4))',
    animation: 'float 3s ease-in-out infinite',
  },
  emptyChatTitle: {
    color: '#fff',
    fontSize: '1.75rem',
    fontWeight: 700,
    margin: '0 0 10px 0',
    letterSpacing: '-0.03em',
  },
  emptyChatText: {
    fontSize: '1rem',
    margin: 0,
    color: 'rgba(255,255,255,0.45)',
  },
  chatBubble: {
    padding: '16px 20px',
    borderRadius: '20px',
    maxWidth: '70%',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    fontWeight: 450,
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    borderBottomRightRadius: '6px',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.35)',
  },
  chatBubbleAssistant: {
    alignSelf: 'flex-start',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    borderBottomLeftRadius: '6px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  transcript: {
    padding: '16px 40px',
    background: 'linear-gradient(90deg, rgba(102,126,234,0.12) 0%, rgba(102,126,234,0.06) 100%)',
    color: '#667eea',
    fontSize: '0.9rem',
    fontWeight: 500,
    fontStyle: 'italic',
    borderTop: '1px solid rgba(102,126,234,0.15)',
  },
  voiceInput: {
    padding: '24px 40px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    gap: '14px',
    background: 'rgba(13, 13, 21, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    alignItems: 'center',
  },
  micButton: {
    padding: '18px 30px',
    borderRadius: '16px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    color: '#fff',
    fontSize: '0.95rem',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
  },
  textInput: {
    flex: 1,
    padding: '18px 22px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontWeight: 450,
  },
  sendButton: {
    padding: '18px 36px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '16px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
  },

  // ==========================================================================
  // MEMORY BROWSER
  // ==========================================================================
  memoryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '28px',
  },

  // ==========================================================================
  // SETTINGS - Premium Cards
  // ==========================================================================
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
  },
  settingsCard: {
    background: 'rgba(20, 20, 35, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '28px',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  settingsCardTitle: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
    margin: '0 0 24px 0',
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  settingValue: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: 500,
  },
  settingToggle: {
    padding: '10px 18px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '40px',
  },
  kbdKey: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '8px',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.55)',
    fontFamily: '"JetBrains Mono", "SF Mono", monospace',
    fontWeight: 500,
    border: '1px solid rgba(255,255,255,0.08)',
  },
};
// Build timestamp: 20260131044344
