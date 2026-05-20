'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import LiveOpsFeed from '@/components/ops/LiveOpsFeed';
import OpenLoopsPanel from '@/components/ops/OpenLoopsPanel';
import MemoryActivityWidget from '@/components/ops/MemoryActivityWidget';
import OrganizationChart from '@/components/ops/OrganizationChart';
import KanbanBoard from '@/components/ops/KanbanBoard';
import PlannerView from '@/components/ops/PlannerView';
import TheHive from '@/components/ops/TheHive';
import VoiceAgent from '@/components/VoiceAgent';
import { useVoiceSettings, TTS_PROVIDERS, getVoicesForProvider, getPushToTalkKeyLabel, type PushToTalkKey } from '@/hooks/useVoiceSettings';

const RELAY_BASE = process.env.NEXT_PUBLIC_OPIE_RELAY_URL || '';
const IS_DEMO = !RELAY_BASE;
const FONT_MONO = "'JetBrains Mono', 'Fira Code', monospace";

type Tab = 'dashboard' | 'orchestration' | 'leads' | 'crons' | 'costs' | 'kanban' | 'planner' | 'voice' | 'settings';
type Temp = 'all' | 'hot' | 'warm' | 'cold';

type Lead = {
  id: string; name: string; company: string; callDuration: string;
  lastContact: string; temperature: 'hot' | 'warm' | 'cold'; summary?: string;
};

type CronJob = {
  id: string; name: string; schedule?: string; enabled?: boolean;
  lastRun?: string; nextRun?: string; lastStatus?: 'success' | 'failed' | 'running' | 'pending';
  description?: string; lastOutput?: string;
};

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'DASHBOARD', icon: '📊' },
  { id: 'planner', label: 'TASKS', icon: '✅' },
  { id: 'kanban', label: 'KANBAN', icon: '📌' },
  { id: 'orchestration', label: 'ORG CHART', icon: '🏗️' },
  { id: 'leads', label: 'LEADS', icon: '📋' },
  { id: 'crons', label: 'CRONS', icon: '⏰' },
  { id: 'costs', label: 'COSTS', icon: '💰' },
  { id: 'voice', label: 'VOICE', icon: '🎤' },
  { id: 'settings', label: 'SETTINGS', icon: '⚙️' },
];

/* ── Hook: responsive breakpoint ── */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

/* ═══════════════════════════════════════════════
   ROOT LAYOUT
   ═══════════════════════════════════════════════ */

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('planner');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

  // On mobile, sidebar defaults to closed
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    else setSidebarOpen(true);
  }, [isMobile]);

  const switchTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (isMobile) setSidebarOpen(false); // auto-close on mobile after selection
  }, [isMobile]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'row', height: '100dvh',
      background: '#0a0a0f', fontFamily: "'Inter', sans-serif", color: '#f0f0f0', overflow: 'hidden',
      position: 'relative',
    }}>
      {/* ── MOBILE OVERLAY ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 40, backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: sidebarOpen ? '200px' : '0px',
        minWidth: sidebarOpen ? '200px' : '0px',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(8,8,14,0.98)',
        borderRight: sidebarOpen ? '1px solid rgba(255,255,255,0.06)' : 'none',
        padding: sidebarOpen ? '16px 0' : '0',
        transition: 'width 0.25s ease, min-width 0.25s ease, padding 0.25s ease',
        ...(isMobile ? {
          position: 'fixed', left: 0, top: 0, bottom: 0,
          zIndex: 50,
          width: sidebarOpen ? '240px' : '0px',
          minWidth: sidebarOpen ? '240px' : '0px',
          boxShadow: sidebarOpen ? '4px 0 30px rgba(0,0,0,0.5)' : 'none',
        } : {}),
      }}>
        {/* Brand */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
          marginBottom: 24, opacity: sidebarOpen ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}>
          <span style={{ fontSize: 24 }}>🧠</span>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#fff' }}>OPS CENTER</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Live Command</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{
          display: 'flex', flexDirection: 'column', gap: 2, flex: 1, padding: '0 8px',
          opacity: sidebarOpen ? 1 : 0, transition: 'opacity 0.2s ease',
        }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', background: 'transparent', border: 'none',
                borderRadius: 10, color: activeTab === tab.id ? '#a855f7' : 'rgba(255,255,255,0.45)',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', fontFamily: FONT_MONO,
                cursor: 'pointer', textAlign: 'left' as const, width: '100%',
                transition: 'all 0.15s ease',
                ...(activeTab === tab.id ? {
                  background: 'rgba(168,85,247,0.15)',
                  boxShadow: 'inset 3px 0 0 #a855f7',
                } : {}),
              }}
            >
              <span style={{ fontSize: 16, width: 22, textAlign: 'center' as const }}>{tab.icon}</span>
              <span style={{ whiteSpace: 'nowrap' as const }}>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto',
          opacity: sidebarOpen ? 1 : 0, transition: 'opacity 0.2s ease',
        }}>
          {IS_DEMO && (
            <span style={{
              fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
              color: '#f59e0b', background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)', padding: '3px 8px', borderRadius: 5,
            }}>DEMO</span>
          )}
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>v2.0</span>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{
        flex: 1, overflow: 'hidden',
        padding: isMobile ? '8px' : '12px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Top bar with hamburger */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              color: '#a855f7', fontSize: 18, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <div style={{
            fontFamily: FONT_MONO, fontSize: isMobile ? 11 : 12, fontWeight: 700,
            color: '#a855f7', letterSpacing: '0.1em',
          }}>
            {TABS.find((t) => t.id === activeTab)?.icon} {TABS.find((t) => t.id === activeTab)?.label}
          </div>
          <div style={{ flex: 1 }} />
          {IS_DEMO && !isMobile && (
            <span style={{
              fontFamily: FONT_MONO, fontSize: 9, color: '#f59e0b',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 4, padding: '2px 8px',
            }}>DEMO MODE</span>
          )}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'dashboard' && <DashboardView relayBase={RELAY_BASE} isMobile={isMobile} />}
          {activeTab === 'orchestration' && (
            <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'auto' }}>
              <OrganizationChart />
            </div>
          )}
          {activeTab === 'leads' && <LeadsCrmView isMobile={isMobile} />}
          {activeTab === 'crons' && <CronsView isMobile={isMobile} />}
          {activeTab === 'costs' && <CostsView isMobile={isMobile} />}
          {activeTab === 'kanban' && <KanbanBoard />}
          {activeTab === 'planner' && <PlannerView />}
          {activeTab === 'voice' && <VoiceAgent onBack={() => setActiveTab('dashboard')} />}
          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   WEATHER + QUOTE BAR
   ═══════════════════════════════════════════════ */

type DayForecast = { day: string; high: number; low: number; desc: string; icon: string };

function WeatherQuoteBar({ isMobile }: { isMobile: boolean }) {
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [quote, setQuote] = useState({ text: '', author: '' });

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=36.96&longitude=-88.27&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=America%2FChicago&forecast_days=5')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.daily) return;
        const days = data.daily.time as string[];
        const highs = data.daily.temperature_2m_max as number[];
        const lows = data.daily.temperature_2m_min as number[];
        const codes = data.daily.weathercode as number[];
        const wmoIcon = (c: number) => { if (c === 0) return '☀️'; if (c <= 3) return '⛅'; if (c <= 48) return '🌫️'; if (c <= 67) return '🌧️'; if (c <= 77) return '❄️'; if (c <= 86) return '❄️'; if (c <= 99) return '⛈️'; return '🌤️'; };
        const wmoDesc = (c: number) => { if (c === 0) return 'Clear'; if (c <= 3) return 'Partly Cloudy'; if (c <= 48) return 'Foggy'; if (c <= 57) return 'Drizzle'; if (c <= 67) return 'Rain'; if (c <= 77) return 'Snow'; if (c <= 82) return 'Showers'; if (c <= 86) return 'Snow Showers'; if (c <= 99) return 'Thunderstorm'; return 'Fair'; };
        const dayName = (d: string, i: number) => { if (i === 0) return 'Today'; if (i === 1) return 'Tomorrow'; return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }); };
        setForecast(days.map((d, i) => ({ day: dayName(d, i), high: Math.round(highs[i]), low: Math.round(lows[i]), desc: wmoDesc(codes[i]), icon: wmoIcon(codes[i]) })));
      })
      .catch(() => {
        setForecast([
          { day: 'Today', high: 68, low: 52, desc: 'Partly Cloudy', icon: '⛅' },
          { day: 'Tomorrow', high: 72, low: 55, desc: 'Clear', icon: '☀️' },
          { day: 'Sat', high: 65, low: 48, desc: 'Rain', icon: '🌧️' },
          { day: 'Sun', high: 70, low: 50, desc: 'Sunny', icon: '☀️' },
          { day: 'Mon', high: 63, low: 45, desc: 'Cloudy', icon: '⛅' },
        ]);
      });

    const quotes = [
      { text: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
      { text: 'Move fast and break things.', author: 'Mark Zuckerberg' },
      { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
      { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
      { text: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
      { text: "I'm not a businessman, I'm a business, man.", author: 'Jay-Z' },
      { text: "Your time is limited. Don't waste it living someone else's life.", author: 'Steve Jobs' },
      { text: 'The harder I work, the luckier I get.', author: 'Gary Player' },
      { text: "If you're going through hell, keep going.", author: 'Winston Churchill' },
      { text: 'Stay hungry. Stay foolish.', author: 'Steve Jobs' },
      { text: "It always seems impossible until it's done.", author: 'Nelson Mandela' },
      { text: "Be so good they can't ignore you.", author: 'Steve Martin' },
      { text: 'Comfort is the enemy of progress.', author: 'P.T. Barnum' },
      { text: "What got you here won't get you there.", author: 'Marshall Goldsmith' },
      { text: 'Execution eats strategy for breakfast.', author: 'Peter Drucker' },
      { text: 'What stands in the way becomes the way.', author: 'Marcus Aurelius' },
      { text: 'We are what we repeatedly do. Excellence is a habit.', author: 'Aristotle' },
      { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
      { text: 'Success is not final, failure is not fatal.', author: 'Winston Churchill' },
      { text: 'If you want to go far, go together.', author: 'African Proverb' },
      { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
      { text: 'Fortune favors the bold.', author: 'Virgil' },
      { text: 'The only limit to our realization of tomorrow is our doubts of today.', author: 'FDR' },
      { text: 'Winners never quit and quitters never win.', author: 'Vince Lombardi' },
      { text: "Don't count the days, make the days count.", author: 'Muhammad Ali' },
      { text: "You miss 100% of the shots you don't take.", author: 'Wayne Gretzky' },
      { text: "The question isn't who is going to let me; it's who is going to stop me.", author: 'Ayn Rand' },
      { text: 'Dream big. Start small. Act now.', author: 'Robin Sharma' },
      { text: 'Do or do not. There is no try.', author: 'Yoda' },
      { text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
      { text: "Hustle beats talent when talent doesn't hustle.", author: 'Ross Simmonds' },
    ];
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    setQuote(quotes[dayOfYear % quotes.length]);
  }, []);

  return (
    <div style={{
      display: 'flex', gap: isMobile ? 8 : 12,
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'stretch', marginBottom: isMobile ? 8 : 12,
      flexShrink: 0,
    }}>
      {/* Weather */}
      <div style={{
        display: 'flex', gap: isMobile ? 8 : 14,
        background: '#11111c', border: '1px solid rgba(6,182,212,0.25)',
        borderRadius: 12, padding: isMobile ? '8px 10px' : '10px 16px',
        alignItems: 'center', flexShrink: 0,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        <span style={{
          fontFamily: FONT_MONO, fontSize: isMobile ? 8 : 10, color: '#06b6d4',
          letterSpacing: '0.08em', fontWeight: 700, whiteSpace: 'nowrap' as const,
        }}>📍 GILBERTSVILLE</span>
        {forecast.map((d) => (
          <div key={d.day} style={{ textAlign: 'center' as const, minWidth: isMobile ? 54 : 70, flexShrink: 0 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: isMobile ? 9 : 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{d.day}</div>
            <div style={{ fontSize: isMobile ? 18 : 22, lineHeight: '28px' }}>{d.icon}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: isMobile ? 10 : 11, color: '#e5e7eb' }}>{d.high}°/{d.low}°</div>
            {!isMobile && <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{d.desc}</div>}
          </div>
        ))}
      </div>

      {/* Quote */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', background: '#11111c',
        border: '1px solid rgba(168,85,247,0.2)', borderRadius: 12,
        padding: isMobile ? '8px 12px' : '10px 16px',
        minWidth: 0,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontStyle: 'italic', fontSize: isMobile ? 12 : 13, color: '#d1d5db',
            lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          } as React.CSSProperties}>"{quote.text}"</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: isMobile ? 10 : 11, color: '#a855f7', marginTop: 4 }}>— {quote.author}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DASHBOARD VIEW
   ═══════════════════════════════════════════════ */

function DashboardView({ relayBase, isMobile }: { relayBase: string; isMobile: boolean }) {
  const SPLIT_KEY = 'dashboard-split-v1';
  const [splitPct, setSplitPct] = useState(() => {
    if (isMobile) return 50;
    try { const v = localStorage.getItem(SPLIT_KEY); if (v) return parseFloat(v); } catch {}
    return 45;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const onSplitterDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onSplitterMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (isMobile) {
      // Vertical split on mobile
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      setSplitPct(Math.min(80, Math.max(20, pct)));
    } else {
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(80, Math.max(20, pct)));
    }
  }, [isMobile]);

  const onSplitterUp = useCallback(() => {
    draggingRef.current = false;
    try { localStorage.setItem(SPLIT_KEY, String(splitPct)); } catch {}
  }, [splitPct]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: isMobile ? 8 : 10, overflow: 'hidden' }}>
      <WeatherQuoteBar isMobile={isMobile} />
      <div
        ref={containerRef}
        style={{
          display: 'flex', flex: 1, minHeight: 0,
          flexDirection: isMobile ? 'column' : 'row',
          position: 'relative',
        }}
      >
        {/* Hive */}
        <div style={{
          [isMobile ? 'height' : 'width']: `${splitPct}%`,
          flexShrink: 0, overflow: 'hidden', borderRadius: 14,
          border: '1px solid rgba(168,85,247,0.15)',
        }}>
          <TheHive />
        </div>

        {/* Splitter handle */}
        <div
          onPointerDown={onSplitterDown}
          onPointerMove={onSplitterMove}
          onPointerUp={onSplitterUp}
          style={{
            [isMobile ? 'width' : 'height']: '100%',
            [isMobile ? 'height' : 'width']: '12px',
            flexShrink: 0,
            cursor: isMobile ? 'row-resize' : 'col-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10, touchAction: 'none',
            background: 'transparent',
          }}
        >
          {/* Visual grip */}
          <div style={{
            [isMobile ? 'width' : 'height']: '40px',
            [isMobile ? 'height' : 'width']: '4px',
            background: 'rgba(168,85,247,0.4)',
            borderRadius: 4,
            transition: 'background 0.15s',
          }} />
        </div>

        {/* Monitors */}
        <div style={{
          flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column',
          gap: 8, overflow: 'auto',
        }}>
          <div style={{ flex: 1, minHeight: isMobile ? 180 : 0, overflow: 'hidden' }}><LiveOpsFeed relayBase={relayBase} /></div>
          <div style={{ flex: 1, minHeight: isMobile ? 180 : 0, overflow: 'hidden' }}><OpenLoopsPanel relayBase={relayBase} /></div>
          <div style={{ flex: 1, minHeight: isMobile ? 180 : 0, overflow: 'hidden' }}><MemoryActivityWidget relayBase={relayBase} /></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   LEADS / CRM
   ═══════════════════════════════════════════════ */

function LeadsCrmView({ isMobile }: { isMobile: boolean }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState({ hot: 0, warm: 0, cold: 0 });
  const [filter, setFilter] = useState<Temp>('all');

  useEffect(() => {
    fetch('/api/crm/leads').then((r) => r.json()).then((data) => {
      setLeads(data.leads || []);
      if (data.summary) setSummary(data.summary);
    }).catch(() => undefined);
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? leads : leads.filter((l) => l.temperature === filter)),
    [leads, filter],
  );

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'rgba(10,10,15,0.9)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 14, padding: isMobile ? 12 : 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 6 : 10, marginBottom: 12 }}>
        <SummaryCard title="HOT" value={summary.hot} color="#ef4444" />
        <SummaryCard title="WARM" value={summary.warm} color="#f59e0b" />
        <SummaryCard title="COLD" value={summary.cold} color="#6b7280" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['all', 'hot', 'warm', 'cold'] as Temp[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
            color: filter === f ? '#06b6d4' : '#d1d5db',
            border: `1px solid ${filter === f ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 999, padding: '6px 12px', fontFamily: FONT_MONO, cursor: 'pointer', fontSize: isMobile ? 10 : 11,
          }}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
        {filtered.map((lead) => (
          <div key={lead.id} style={{ background: 'rgba(12,12,20,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>{lead.company}</strong>
              <span style={{ ...badgeStyle, ...badgeByTemp[lead.temperature] }}>{lead.temperature.toUpperCase()}</span>
            </div>
            <div style={metaStyle}>Contact: {lead.name}</div>
            <div style={metaStyle}>Call: {lead.callDuration}</div>
            <div style={metaStyle}>Last contact: {fmtDate(lead.lastContact)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   CRONS
   ═══════════════════════════════════════════════ */

function CronsView({ isMobile }: { isMobile: boolean }) {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crons').then((r) => r.json()).then((data) => {
      const fallback: CronJob[] = [
        { id: 'morning-brief', name: 'Morning Brief', lastStatus: 'failed', lastRun: new Date().toISOString(), nextRun: new Date(Date.now() + 3600000).toISOString(), description: 'Discord ops digest', lastOutput: 'Timeout after 90s' },
        { id: 'call-monitor', name: 'Call Monitor', lastStatus: 'success', lastRun: new Date(Date.now() - 1800000).toISOString(), nextRun: new Date(Date.now() + 1800000).toISOString(), description: 'Twilio + CRM scan' },
        { id: 'email-hunter', name: 'Email Hunter', lastStatus: 'failed', lastRun: new Date(Date.now() - 7200000).toISOString(), nextRun: new Date(Date.now() + 7200000).toISOString(), description: 'Prospect inbox monitor', lastOutput: 'Delivery failure (401)' },
        { id: 'heartbeat', name: 'Heartbeat Check', lastStatus: 'running', lastRun: new Date(Date.now() - 20000).toISOString(), nextRun: new Date(Date.now() + 340000).toISOString(), description: 'Infra + gateway checks' },
        { id: 'sap-demo', name: 'SAP Demo Monitor', lastStatus: 'failed', lastRun: new Date(Date.now() - 3600000).toISOString(), nextRun: new Date(Date.now() + 3600000).toISOString(), description: 'Demo uptime monitor', lastOutput: '404 DEPLOYMENT_NOT_FOUND' },
        { id: 'cron-error', name: 'Cron Error Monitor', lastStatus: 'success', lastRun: new Date(Date.now() - 900000).toISOString(), nextRun: new Date(Date.now() + 900000).toISOString(), description: 'Error sweeper' },
        { id: 'weekly-kpi', name: 'Weekly KPI', lastStatus: 'pending', nextRun: new Date(Date.now() + 86400000).toISOString(), description: 'Weekly metrics compile' },
        { id: 'memory-check', name: 'Memory Daily Check', lastStatus: 'success', lastRun: new Date(Date.now() - 14400000).toISOString(), nextRun: new Date(Date.now() + 72000000).toISOString(), description: 'Recall validation' },
        { id: 'self-maint', name: 'G Self-Maintenance', lastStatus: 'failed', lastRun: new Date(Date.now() - 10800000).toISOString(), nextRun: new Date(Date.now() + 25200000).toISOString(), description: 'Resource and loop audit', lastOutput: 'Gateway timeout' },
        { id: 'intel-org', name: 'Key Intel Organizer', lastStatus: 'failed', lastRun: new Date(Date.now() - 5400000).toISOString(), nextRun: new Date(Date.now() + 12600000).toISOString(), description: 'Intel backlog cleanup', lastOutput: 'ws close 1000' },
      ];
      setJobs((data.crons || []).length ? data.crons : fallback);
    }).catch(() => undefined);
  }, []);

  if (isMobile) {
    // Card layout for mobile
    return (
      <div style={{ height: '100%', overflow: 'auto', background: 'rgba(10,10,15,0.9)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 14, padding: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {jobs.map((j) => {
            const status = normalizeStatus(j.lastStatus);
            return (
              <div key={j.id}
                onClick={() => setOpenId(openId === j.id ? null : j.id)}
                style={{
                  background: 'rgba(13,13,22,0.95)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: 12, cursor: 'pointer',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700 }}>{j.name}</span>
                  <span style={{ ...badgeStyle, ...statusStyleMap[status] }}>{status.toUpperCase()}</span>
                </div>
                <div style={metaStyle}>Last: {j.lastRun ? fmtDate(j.lastRun) : '—'}</div>
                <div style={metaStyle}>Next: {j.nextRun ? fmtDate(j.nextRun) : '—'}</div>
                {openId === j.id && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#9ca3af' }}>
                    <div>{j.description || 'No description'}</div>
                    {j.lastOutput && <div style={{ color: '#ef4444', marginTop: 4 }}>{j.lastOutput}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'rgba(10,10,15,0.9)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', color: '#9ca3af', fontFamily: FONT_MONO, fontSize: 11, marginBottom: 8, padding: '0 8px' }}>
        <span>Name</span><span>Last Run</span><span>Next Run</span><span>Status</span>
      </div>
      {jobs.map((j) => {
        const status = normalizeStatus(j.lastStatus);
        return (
          <div key={j.id} style={{ marginBottom: 8 }}>
            <button
              style={{
                width: '100%', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px',
                alignItems: 'center', background: 'rgba(13,13,22,0.95)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                padding: '10px 8px', color: '#fff', textAlign: 'left' as const, cursor: 'pointer',
                fontFamily: FONT_MONO, fontSize: 12,
              }}
              onClick={() => setOpenId(openId === j.id ? null : j.id)}
            >
              <span>{j.name}</span>
              <span style={{ color: '#9ca3af' }}>{j.lastRun ? fmtDate(j.lastRun) : '—'}</span>
              <span style={{ color: '#9ca3af' }}>{j.nextRun ? fmtDate(j.nextRun) : '—'}</span>
              <span style={{ ...badgeStyle, ...statusStyleMap[status] }}>{status.toUpperCase()}</span>
            </button>
            {openId === j.id && (
              <div style={{
                border: '1px solid rgba(255,255,255,0.08)', borderTop: 0,
                borderRadius: '0 0 10px 10px', padding: 10, marginTop: -6,
                background: 'rgba(8,8,14,0.8)', color: '#d1d5db', fontSize: 12,
              }}>
                <div>{j.description || 'No description'}</div>
                {j.lastOutput && <div style={{ color: '#ef4444', marginTop: 6 }}>{j.lastOutput}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COSTS
   ═══════════════════════════════════════════════ */

function CostsView({ isMobile }: { isMobile: boolean }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/costs/summary').then((r) => r.json()).then(setData).catch(() => undefined);
  }, []);

  const byModel = data?.byModel || [];
  const byAgent = data?.byAgent || [];
  const tokens = data?.tokenUsage || { input: 0, output: 0 };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'rgba(10,10,15,0.9)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 14, padding: isMobile ? 12 : 16 }}>
      <div style={{
        fontSize: isMobile ? 36 : 48, fontWeight: 700, fontFamily: FONT_MONO, marginBottom: 16,
        color: '#a855f7', textShadow: '0 0 24px rgba(168,85,247,.35)',
      }}>
        ${(data?.totalCost || 0).toFixed(2)} <span style={{ fontSize: isMobile ? 12 : 14, color: '#9ca3af', marginLeft: 8 }}>Today</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'rgba(13,13,22,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', color: '#06b6d4', fontFamily: FONT_MONO, fontSize: 12 }}>By Model</h3>
          {byModel.map((m: any) => (
            <div key={m.model} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: FONT_MONO, fontSize: 12 }}>
              <span>{m.model}</span><span>${m.cost.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(13,13,22,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', color: '#06b6d4', fontFamily: FONT_MONO, fontSize: 12 }}>By Agent</h3>
          {byAgent.map((a: any) => (
            <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: FONT_MONO, fontSize: 12 }}>
              <span>{a.agent}</span><span>${a.cost.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: isMobile ? 12 : 24, color: '#d1d5db', fontFamily: FONT_MONO, fontSize: 12, flexWrap: 'wrap' }}>
        <div>Input Tokens: <strong>{num(tokens.input)}</strong></div>
        <div>Output Tokens: <strong>{num(tokens.output)}</strong></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════ */

function SummaryCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'rgba(17,17,24,0.85)', border: `1px solid ${color}66`,
      borderRadius: 12, padding: 12, boxShadow: `0 0 24px ${color}22`,
    }}>
      <div style={{ color, fontSize: 12, fontFamily: FONT_MONO }}>{title}</div>
      <div style={{ fontSize: 30, fontFamily: FONT_MONO, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const normalizeStatus = (s?: string) => {
  if (s === 'failed') return 'error';
  if (s === 'success') return 'success';
  if (s === 'running') return 'running';
  return 'pending';
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const num = (n: number) => Intl.NumberFormat('en-US').format(n || 0);

const badgeStyle: React.CSSProperties = {
  borderRadius: 999, padding: '2px 8px', fontSize: 10, fontFamily: FONT_MONO, border: '1px solid',
};

const metaStyle: React.CSSProperties = {
  color: '#9ca3af', fontSize: 12, marginBottom: 4, fontFamily: FONT_MONO,
};

const badgeByTemp: Record<'hot' | 'warm' | 'cold', React.CSSProperties> = {
  hot: { color: '#ef4444', borderColor: 'rgba(239,68,68,0.45)', background: 'rgba(239,68,68,0.12)' },
  warm: { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.45)', background: 'rgba(245,158,11,0.12)' },
  cold: { color: '#9ca3af', borderColor: 'rgba(156,163,175,0.45)', background: 'rgba(156,163,175,0.12)' },
};

const statusStyleMap: Record<string, React.CSSProperties> = {
  success: { color: '#22c55e', borderColor: 'rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.1)' },
  error: { color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.1)' },
  running: { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.1)' },
  pending: { color: '#9ca3af', borderColor: 'rgba(156,163,175,0.5)', background: 'rgba(156,163,175,0.1)' },
};

/* ═══════════════════════════════════════════════
   SETTINGS PANEL
   ═══════════════════════════════════════════════ */
function SettingsPanel() {
  const vs = useVoiceSettings();
  const [isCapturing, setIsCapturing] = useState(false);
  const captureRef = useRef<HTMLButtonElement>(null);

  // Capture keyboard + mouse buttons for PTT hotkey
  useEffect(() => {
    if (!isCapturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      vs.setPushToTalkKey({ type: 'keyboard', code: e.code });
      setIsCapturing(false);
    };
    const onMouse = (e: MouseEvent) => {
      if (e.button === 0) return; // left click = cancel
      e.preventDefault(); e.stopPropagation();
      vs.setPushToTalkKey({ type: 'mouse', button: e.button });
      setIsCapturing(false);
    };
    const onCtx = (e: Event) => e.preventDefault();
    const onClickOutside = (e: MouseEvent) => {
      if (e.button === 0 && captureRef.current && !captureRef.current.contains(e.target as Node)) {
        setIsCapturing(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('mousedown', onMouse, true);
    window.addEventListener('contextmenu', onCtx, true);
    window.addEventListener('click', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onMouse, true);
      window.removeEventListener('contextmenu', onCtx, true);
      window.removeEventListener('click', onClickOutside);
    };
  }, [isCapturing, vs]);

  const voices = getVoicesForProvider(vs.ttsProvider);
  const cardStyle: React.CSSProperties = {
    background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(20px)',
    borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
  };
  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.7)', fontSize: 14,
  };
  const btnStyle: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };
  const selectStyle: React.CSSProperties = {
    ...btnStyle, minWidth: 160, appearance: 'none' as const,
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23999\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30,
  };

  return (
    <div style={{ padding: 32, overflow: 'auto', height: '100%' }}>
      <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 28, letterSpacing: '-0.03em' }}>
        ⚙️ Settings
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>

        {/* Voice & TTS */}
        <div style={cardStyle}>
          <h4 style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>🔊 Voice & TTS</h4>
          <div style={rowStyle}>
            <span>TTS Provider</span>
            <select value={vs.ttsProvider} onChange={e => vs.setTTSProvider(e.target.value as any)} style={selectStyle}>
              {TTS_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label} — {p.note}</option>)}
            </select>
          </div>
          {Object.keys(voices).length > 0 && (
            <div style={rowStyle}>
              <span>Voice</span>
              <select value={vs.ttsVoice} onChange={e => vs.setTTSVoice(e.target.value)} style={selectStyle}>
                {Object.entries(voices).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </div>
          )}
          <div style={rowStyle}>
            <span>Speech Speed</span>
            <select value={vs.ttsSpeed} onChange={e => vs.setTTSSpeed(parseFloat(e.target.value))} style={selectStyle}>
              {[0.75, 1.0, 1.25, 1.5].map(s => <option key={s} value={s}>{s}x</option>)}
            </select>
          </div>
        </div>

        {/* Push-to-Talk */}
        <div style={cardStyle}>
          <h4 style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>🎙️ Push-to-Talk</h4>
          <div style={rowStyle}>
            <span>Push-to-Talk Mode</span>
            <button onClick={vs.togglePushToTalk} style={{
              ...btnStyle,
              background: vs.pushToTalkEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)',
              color: vs.pushToTalkEnabled ? '#22c55e' : 'rgba(255,255,255,0.8)',
            }}>
              {vs.pushToTalkEnabled ? '🎙️ Enabled' : '⏺️ Disabled'}
            </button>
          </div>
          {vs.pushToTalkEnabled && (
            <div style={rowStyle}>
              <span>PTT Hotkey</span>
              <button
                ref={captureRef}
                onClick={() => setIsCapturing(true)}
                style={{
                  ...btnStyle,
                  background: isCapturing ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)',
                  color: isCapturing ? '#60a5fa' : 'rgba(255,255,255,0.8)',
                  border: isCapturing ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  minWidth: 160,
                }}
              >
                {isCapturing ? '⌨️ Press any key or mouse button...' : `🎯 ${getPushToTalkKeyLabel(vs.pushToTalkKey)}`}
              </button>
            </div>
          )}
          {vs.pushToTalkEnabled && (
            <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(59,130,246,0.08)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.15)' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: '#60a5fa' }}>Hold</strong> to talk, <strong style={{ color: '#60a5fa' }}>release</strong> to send.
                Press while G is speaking to <strong style={{ color: '#f59e0b' }}>interrupt</strong> and add context.
                Supports keyboard keys and mouse buttons (side, middle, right).
              </p>
            </div>
          )}
        </div>

        {/* Reset */}
        <div style={cardStyle}>
          <h4 style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>🔄 Reset</h4>
          <div style={rowStyle}>
            <span>Reset all voice settings</span>
            <button onClick={() => {
              vs.setPushToTalkEnabled(false);
              vs.setPushToTalkKey({ type: 'keyboard', code: 'Space' });
              vs.setTTSProvider('azure');
              vs.setTTSVoice('en-US-AvaMultilingualNeural');
              vs.setTTSSpeed(1.0);
            }} style={{ ...btnStyle, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
