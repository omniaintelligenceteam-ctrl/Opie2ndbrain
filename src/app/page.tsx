'use client';

import { useEffect, useMemo, useState } from 'react';
import SystemHealthWidget from '@/components/ops/SystemHealthWidget';
import LiveOpsFeed from '@/components/ops/LiveOpsFeed';
import OpenLoopsPanel from '@/components/ops/OpenLoopsPanel';
import MemoryActivityWidget from '@/components/ops/MemoryActivityWidget';
import OrganizationChart from '@/components/ops/OrganizationChart';
import KanbanBoard from '@/components/ops/KanbanBoard';
import CalendarView from '@/components/ops/CalendarView';
import TheHive from '@/components/ops/TheHive';

const RELAY_BASE = process.env.NEXT_PUBLIC_OPIE_RELAY_URL || '';
const IS_DEMO = !RELAY_BASE;

type Tab = 'dashboard' | 'orchestration' | 'leads' | 'crons' | 'costs' | 'kanban' | 'calendar';
type Temp = 'all' | 'hot' | 'warm' | 'cold';

type Lead = {
  id: string;
  name: string;
  company: string;
  callDuration: string;
  lastContact: string;
  temperature: 'hot' | 'warm' | 'cold';
  summary?: string;
};

type CronJob = {
  id: string;
  name: string;
  schedule?: string;
  enabled?: boolean;
  lastRun?: string;
  nextRun?: string;
  lastStatus?: 'success' | 'failed' | 'running' | 'pending';
  description?: string;
  lastOutput?: string;
};

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'DASHBOARD', icon: '📊' },
  { id: 'orchestration', label: 'ORCHESTRATION', icon: '🏗️' },
  { id: 'leads', label: 'LEADS / CRM', icon: '📋' },
  { id: 'crons', label: 'CRONS', icon: '⏰' },
  { id: 'costs', label: 'COSTS', icon: '💰' },
  { id: 'kanban', label: 'KANBAN', icon: '📌' },
  { id: 'calendar', label: 'CALENDAR', icon: '📅' },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const now = new Date().toLocaleTimeString('en-US', { hour12: false });

  return (
    <div style={styles.root}>
      {/* ── LEFT SIDEBAR ── */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandEmoji}>🧠</span>
          <div>
            <div style={styles.brandName}>OPS CENTER</div>
            <div style={styles.brandSub}>Live Command</div>
          </div>
        </div>

        <nav style={styles.sideNav}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ ...styles.navBtn, ...(activeTab === tab.id ? styles.navBtnActive : {}) }}
            >
              <span style={styles.navIcon}>{tab.icon}</span>
              <span style={styles.navLabel}>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          {IS_DEMO && <span style={styles.demoBadge}>DEMO</span>}
          <span style={styles.version}>v2.0</span>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={styles.main}>
        {activeTab === 'dashboard' && <DashboardView relayBase={RELAY_BASE} />}
        {activeTab === 'orchestration' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <OrganizationChart />
          </div>
        )}
        {activeTab === 'leads' && <LeadsCrmView />}
        {activeTab === 'crons' && <CronsView />}
        {activeTab === 'costs' && <CostsView />}
        {activeTab === 'kanban' && <KanbanBoard />}
        {activeTab === 'calendar' && <CalendarView />}
      </main>
    </div>
  );
}

/* ── Weather + Quote Widget ── */
type DayForecast = { day: string; high: number; low: number; desc: string; icon: string };

function WeatherQuoteBar() {
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [quote, setQuote] = useState({ text: '', author: '' });

  useEffect(() => {
    // Gilbertsville, KY coords: 36.96, -88.27
    fetch('https://api.open-meteo.com/v1/forecast?latitude=36.96&longitude=-88.27&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=America%2FChicago&forecast_days=3')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.daily) return;
        const days = data.daily.time as string[];
        const highs = data.daily.temperature_2m_max as number[];
        const lows = data.daily.temperature_2m_min as number[];
        const codes = data.daily.weathercode as number[];
        const wmoIcon = (c: number) => {
          if (c === 0) return '☀️';
          if (c <= 3) return '⛅';
          if (c <= 48) return '🌫️';
          if (c <= 57) return '🌧️';
          if (c <= 67) return '🌧️';
          if (c <= 77) return '❄️';
          if (c <= 82) return '🌧️';
          if (c <= 86) return '❄️';
          if (c <= 99) return '⛈️';
          return '🌤️';
        };
        const wmoDesc = (c: number) => {
          if (c === 0) return 'Clear';
          if (c <= 3) return 'Partly Cloudy';
          if (c <= 48) return 'Foggy';
          if (c <= 57) return 'Drizzle';
          if (c <= 67) return 'Rain';
          if (c <= 77) return 'Snow';
          if (c <= 82) return 'Showers';
          if (c <= 86) return 'Snow Showers';
          if (c <= 99) return 'Thunderstorm';
          return 'Fair';
        };
        const dayName = (d: string, i: number) => {
          if (i === 0) return 'Today';
          if (i === 1) return 'Tomorrow';
          return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
        };
        setForecast(days.map((d, i) => ({
          day: dayName(d, i),
          high: Math.round(highs[i]),
          low: Math.round(lows[i]),
          desc: wmoDesc(codes[i]),
          icon: wmoIcon(codes[i]),
        })));
      })
      .catch(() => {
        setForecast([
          { day: 'Today', high: 68, low: 52, desc: 'Partly Cloudy', icon: '⛅' },
          { day: 'Tomorrow', high: 72, low: 55, desc: 'Clear', icon: '☀️' },
          { day: 'Sat', high: 65, low: 48, desc: 'Rain', icon: '🌧️' },
        ]);
      });

    // Daily quote — deterministic rotation based on day of year
    const quotes = [
      { text: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
      { text: 'Move fast and break things. Unless you are breaking stuff, you are not moving fast enough.', author: 'Mark Zuckerberg' },
      { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
      { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
      { text: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
      { text: "I'm not a businessman, I'm a business, man.", author: 'Jay-Z' },
      { text: 'Your time is limited. Don\'t waste it living someone else\'s life.', author: 'Steve Jobs' },
      { text: 'The harder I work, the luckier I get.', author: 'Gary Player' },
      { text: 'If you\'re going through hell, keep going.', author: 'Winston Churchill' },
      { text: 'Stay hungry. Stay foolish.', author: 'Steve Jobs' },
      { text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
      { text: 'Be so good they can\'t ignore you.', author: 'Steve Martin' },
      { text: 'Comfort is the enemy of progress.', author: 'P.T. Barnum' },
      { text: 'What got you here won\'t get you there.', author: 'Marshall Goldsmith' },
      { text: 'Execution eats strategy for breakfast.', author: 'Peter Drucker' },
      { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius' },
      { text: 'We are what we repeatedly do. Excellence is not an act, but a habit.', author: 'Aristotle' },
      { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
      { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
      { text: 'If you want to go fast, go alone. If you want to go far, go together.', author: 'African Proverb' },
      { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
      { text: 'Fortune favors the bold.', author: 'Virgil' },
      { text: 'The only limit to our realization of tomorrow is our doubts of today.', author: 'FDR' },
      { text: 'Winners never quit and quitters never win.', author: 'Vince Lombardi' },
      { text: 'Don\'t count the days, make the days count.', author: 'Muhammad Ali' },
      { text: 'You miss 100% of the shots you don\'t take.', author: 'Wayne Gretzky' },
      { text: 'The question isn\'t who is going to let me; it\'s who is going to stop me.', author: 'Ayn Rand' },
      { text: 'Dream big. Start small. Act now.', author: 'Robin Sharma' },
      { text: 'Do or do not. There is no try.', author: 'Yoda' },
      { text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
      { text: 'Hustle beats talent when talent doesn\'t hustle.', author: 'Ross Simmonds' },
    ];
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    setQuote(quotes[dayOfYear % quotes.length]);
  }, []);

  const M = "'JetBrains Mono', 'Fira Code', monospace";
  const ws: Record<string, React.CSSProperties> = {
    wrap: { display: 'flex', gap: 12, alignItems: 'stretch', marginBottom: 12 },
    weather: { display: 'flex', gap: 14, background: '#11111c', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 12, padding: '10px 16px', alignItems: 'center', flexShrink: 0 },
    loc: { fontFamily: M, fontSize: 10, color: '#06b6d4', letterSpacing: '0.08em', fontWeight: 700, marginRight: 4 },
    dayCard: { textAlign: 'center' as const, minWidth: 70 },
    dayLabel: { fontFamily: M, fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
    dayIcon: { fontSize: 22, lineHeight: '28px' },
    dayTemps: { fontFamily: M, fontSize: 11, color: '#e5e7eb' },
    dayDesc: { fontFamily: M, fontSize: 9, color: 'rgba(255,255,255,0.35)' },
    quoteWrap: { flex: 1, display: 'flex', alignItems: 'center', background: '#11111c', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 12, padding: '10px 16px' },
    quoteText: { fontStyle: 'italic', fontSize: 13, color: '#d1d5db', lineHeight: 1.45 },
    quoteAuthor: { fontFamily: M, fontSize: 11, color: '#a855f7', marginTop: 4 },
  };

  return (
    <div style={ws.wrap}>
      <div style={ws.weather}>
        <span style={ws.loc}>📍 GILBERTSVILLE, KY</span>
        {forecast.map((d) => (
          <div key={d.day} style={ws.dayCard}>
            <div style={ws.dayLabel}>{d.day}</div>
            <div style={ws.dayIcon}>{d.icon}</div>
            <div style={ws.dayTemps}>{d.high}° / {d.low}°</div>
            <div style={ws.dayDesc}>{d.desc}</div>
          </div>
        ))}
      </div>
      <div style={ws.quoteWrap}>
        <div>
          <div style={ws.quoteText}>"{quote.text}"</div>
          <div style={ws.quoteAuthor}>— {quote.author}</div>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ relayBase }: { relayBase: string }) {
  return (
    <div style={dashStyles.grid}>
      <WeatherQuoteBar />
      {/* The Hive — orbital agent view */}
      <div style={dashStyles.hiveRow}><TheHive /></div>
      {/* Ops + Loops (compact) + sidebar */}
      <div style={dashStyles.mainRow}>
        <div style={dashStyles.opsCol}>
          <div style={dashStyles.halfPanel}><LiveOpsFeed relayBase={relayBase} /></div>
          <div style={dashStyles.halfPanel}><OpenLoopsPanel relayBase={relayBase} /></div>
        </div>
        <div style={dashStyles.sidebarCol}>
          <SystemHealthWidget relayBase={relayBase} />
          <MemoryActivityWidget relayBase={relayBase} />
        </div>
      </div>
    </div>
  );
}

function LeadsCrmView() {
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
    <div style={tabStyles.wrap}>
      <div style={tabStyles.summaryRow}>
        <SummaryCard title="HOT" value={summary.hot} color="#ef4444" />
        <SummaryCard title="WARM" value={summary.warm} color="#f59e0b" />
        <SummaryCard title="COLD" value={summary.cold} color="#6b7280" />
      </div>

      <div style={tabStyles.filters}>
        {(['all', 'hot', 'warm', 'cold'] as Temp[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...tabStyles.filterBtn, ...(filter === f ? tabStyles.filterBtnActive : {}) }}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={tabStyles.grid}>
        {filtered.map((lead) => (
          <div key={lead.id} style={tabStyles.card}>
            <div style={tabStyles.cardHeader}>
              <strong>{lead.company}</strong>
              <span style={{ ...tabStyles.badge, ...(badgeByTemp[lead.temperature]) }}>{lead.temperature.toUpperCase()}</span>
            </div>
            <div style={tabStyles.meta}>Contact: {lead.name}</div>
            <div style={tabStyles.meta}>Call: {lead.callDuration}</div>
            <div style={tabStyles.meta}>Last contact: {fmtDate(lead.lastContact)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CronsView() {
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

  return (
    <div style={tabStyles.wrap}>
      <div style={tabStyles.tableHead}>
        <span>Name</span><span>Last Run</span><span>Next Run</span><span>Status</span>
      </div>
      {jobs.map((j) => {
        const status = normalizeStatus(j.lastStatus);
        return (
          <div key={j.id} style={tabStyles.rowWrap}>
            <button style={tabStyles.tableRow} onClick={() => setOpenId(openId === j.id ? null : j.id)}>
              <span>{j.name}</span>
              <span>{j.lastRun ? fmtDate(j.lastRun) : '—'}</span>
              <span>{j.nextRun ? fmtDate(j.nextRun) : '—'}</span>
              <span style={{ ...tabStyles.badge, ...statusStyle[status] }}>{status.toUpperCase()}</span>
            </button>
            {openId === j.id && (
              <div style={tabStyles.expanded}>
                <div>{j.description || 'No description'}</div>
                <div style={{ color: '#9ca3af', marginTop: 6 }}>{j.lastOutput || 'No recent error/output'}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CostsView() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/costs/summary').then((r) => r.json()).then(setData).catch(() => undefined);
  }, []);

  const byModel = data?.byModel || [];
  const byAgent = data?.byAgent || [];
  const tokens = data?.tokenUsage || { input: 0, output: 0 };

  return (
    <div style={tabStyles.wrap}>
      <div style={tabStyles.bigStat}>${(data?.totalCost || 0).toFixed(2)} <span style={tabStyles.bigStatLabel}>Today</span></div>

      <div style={tabStyles.columns}>
        <div style={tabStyles.colCard}>
          <h3 style={tabStyles.h3}>By Model</h3>
          {byModel.map((m: any) => (
            <div key={m.model} style={tabStyles.listRow}><span>{m.model}</span><span>${m.cost.toFixed(2)}</span></div>
          ))}
        </div>

        <div style={tabStyles.colCard}>
          <h3 style={tabStyles.h3}>By Agent</h3>
          {byAgent.map((a: any) => (
            <div key={a.agent} style={tabStyles.listRow}><span>{a.agent}</span><span>${a.cost.toFixed(2)}</span></div>
          ))}
        </div>
      </div>

      <div style={tabStyles.tokenRow}>
        <div>Input Tokens: <strong>{num(tokens.input)}</strong></div>
        <div>Output Tokens: <strong>{num(tokens.output)}</strong></div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div style={{ ...tabStyles.summaryCard, borderColor: `${color}66`, boxShadow: `0 0 24px ${color}22` }}>
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

const FONT_MONO = "'JetBrains Mono', 'Fira Code', monospace";

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'row', height: '100vh', background: '#0a0a0f', fontFamily: "'Inter', sans-serif", color: '#f0f0f0', overflow: 'hidden' },
  /* ── Sidebar ── */
  sidebar: { width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'rgba(8,8,14,0.98)', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '16px 0' },
  brand: { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', marginBottom: '24px' },
  brandEmoji: { fontSize: '24px' },
  brandName: { fontFamily: FONT_MONO, fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: '#fff' },
  brandSub: { fontFamily: FONT_MONO, fontSize: '9px', color: 'rgba(255,255,255,0.35)' },
  sideNav: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, padding: '0 8px' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', borderRadius: '10px', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', fontFamily: FONT_MONO, cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left' as const, width: '100%' },
  navBtnActive: { background: 'rgba(168,85,247,0.15)', color: '#a855f7', boxShadow: 'inset 3px 0 0 #a855f7' },
  navIcon: { fontSize: '16px', width: '22px', textAlign: 'center' as const },
  navLabel: { whiteSpace: 'nowrap' as const },
  sidebarFooter: { padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' },
  demoBadge: { fontFamily: FONT_MONO, fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', padding: '3px 8px', borderRadius: '5px' },
  version: { fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(255,255,255,0.2)' },
  /* ── Main ── */
  main: { flex: 1, overflow: 'hidden', padding: '12px', display: 'flex', flexDirection: 'column' },
};

const dashStyles: Record<string, React.CSSProperties> = {
  grid: { display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' },
  hiveRow: { flexShrink: 0, height: '420px', overflow: 'hidden', borderRadius: 14, border: '1px solid rgba(168,85,247,0.15)' },
  mainRow: { display: 'flex', gap: '10px', flex: 1, minHeight: 0 },
  opsCol: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' },
  halfPanel: { flex: 1, minHeight: 0, overflow: 'hidden' },
  sidebarCol: { width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' },
};

const tabStyles: Record<string, React.CSSProperties> = {
  wrap: { height: '100%', overflow: 'auto', background: 'rgba(10,10,15,0.9)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 14, padding: 16 },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 },
  summaryCard: { background: 'rgba(17,17,24,0.85)', border: '1px solid', borderRadius: 12, padding: 12 },
  filters: { display: 'flex', gap: 8, marginBottom: 12 },
  filterBtn: { background: 'rgba(255,255,255,0.03)', color: '#d1d5db', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '6px 12px', fontFamily: FONT_MONO, cursor: 'pointer' },
  filterBtnActive: { background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.4)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 },
  card: { background: 'rgba(12,12,20,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, transition: 'all .2s ease' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  meta: { color: '#9ca3af', fontSize: 12, marginBottom: 4, fontFamily: FONT_MONO },
  badge: { borderRadius: 999, padding: '2px 8px', fontSize: 10, fontFamily: FONT_MONO, border: '1px solid' },
  tableHead: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', color: '#9ca3af', fontFamily: FONT_MONO, fontSize: 11, marginBottom: 8, padding: '0 8px' },
  rowWrap: { marginBottom: 8 },
  tableRow: { width: '100%', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', alignItems: 'center', background: 'rgba(13,13,22,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 8px', color: '#fff', textAlign: 'left', cursor: 'pointer' },
  expanded: { border: '1px solid rgba(255,255,255,0.08)', borderTop: 0, borderRadius: '0 0 10px 10px', padding: 10, marginTop: -6, background: 'rgba(8,8,14,0.8)', color: '#d1d5db', fontSize: 12 },
  bigStat: { fontSize: 48, fontWeight: 700, fontFamily: FONT_MONO, marginBottom: 16, color: '#a855f7', textShadow: '0 0 24px rgba(168,85,247,.35)' },
  bigStatLabel: { fontSize: 14, color: '#9ca3af', marginLeft: 8 },
  columns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  colCard: { background: 'rgba(13,13,22,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 },
  h3: { margin: '0 0 8px', color: '#06b6d4', fontFamily: FONT_MONO, fontSize: 12 },
  listRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: FONT_MONO, fontSize: 12 },
  tokenRow: { marginTop: 12, display: 'flex', gap: 24, color: '#d1d5db', fontFamily: FONT_MONO, fontSize: 12 },
};

const badgeByTemp: Record<'hot' | 'warm' | 'cold', React.CSSProperties> = {
  hot: { color: '#ef4444', borderColor: 'rgba(239,68,68,0.45)', background: 'rgba(239,68,68,0.12)' },
  warm: { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.45)', background: 'rgba(245,158,11,0.12)' },
  cold: { color: '#9ca3af', borderColor: 'rgba(156,163,175,0.45)', background: 'rgba(156,163,175,0.12)' },
};

const statusStyle: Record<string, React.CSSProperties> = {
  success: { color: '#22c55e', borderColor: 'rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.1)' },
  error: { color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.1)' },
  running: { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.1)' },
  pending: { color: '#9ca3af', borderColor: 'rgba(156,163,175,0.5)', background: 'rgba(156,163,175,0.1)' },
};
