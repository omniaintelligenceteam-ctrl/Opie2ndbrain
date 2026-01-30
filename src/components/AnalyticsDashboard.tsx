'use client';
import { useState, useEffect } from 'react';
import UsageChart from './UsageChart';

interface DailyStats {
  messages: number;
  tokens: number;
  tasks: number;
  cost?: number;
}

interface Analytics {
  actions: Record<string, number>;
  messages: { timestamp: number; tokens: number }[];
  dailyStats: Record<string, DailyStats>;
  agentUsage?: Record<string, number>;
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  color: string;
}

function StatCard({ icon, label, value, change, changeType = 'neutral', color }: StatCardProps) {
  const changeColors = {
    positive: '#22c55e',
    negative: '#ef4444',
    neutral: 'rgba(255,255,255,0.5)',
  };

  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: `${color}20`, color }}>
        {icon}
      </div>
      <div style={styles.statContent}>
        <span style={styles.statValue}>{value}</span>
        <span style={styles.statLabel}>{label}</span>
        {change && (
          <span style={{ ...styles.statChange, color: changeColors[changeType] }}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

const STORAGE_KEY = 'opie-analytics';
const COST_PER_1K_TOKENS = 0.003; // Estimate for Claude

function getAnalytics(): Analytics {
  if (typeof window === 'undefined') return { actions: {}, messages: [], dailyStats: {}, agentUsage: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { actions: {}, messages: [], dailyStats: {}, agentUsage: {} };
  } catch {
    return { actions: {}, messages: [], dailyStats: {}, agentUsage: {} };
  }
}

function generateLast7DaysData(dailyStats: Record<string, DailyStats>) {
  const days: { name: string; messages: number; tokens: number; tasks: number; cost: number }[] = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    const stats = dailyStats[dateStr] || { messages: 0, tokens: 0, tasks: 0 };
    days.push({
      name: dayName,
      messages: stats.messages,
      tokens: stats.tokens,
      tasks: stats.tasks,
      cost: (stats.tokens / 1000) * COST_PER_1K_TOKENS,
    });
  }
  
  return days;
}

function getTopActions(actions: Record<string, number>, limit = 5) {
  return Object.entries(actions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ id, count }));
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<Analytics>({ actions: {}, messages: [], dailyStats: {}, agentUsage: {} });
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeChart, setActiveChart] = useState<'messages' | 'tokens' | 'tasks' | 'cost'>('messages');

  useEffect(() => {
    const data = getAnalytics();
    setAnalytics(data);
    setChartData(generateLast7DaysData(data.dailyStats));

    // Add sample data if empty (for demo)
    if (Object.keys(data.dailyStats).length === 0) {
      const sampleData: Record<string, DailyStats> = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        sampleData[dateStr] = {
          messages: Math.floor(Math.random() * 20) + 5,
          tokens: Math.floor(Math.random() * 10000) + 2000,
          tasks: Math.floor(Math.random() * 8) + 1,
        };
      }
      const updatedAnalytics = { ...data, dailyStats: sampleData };
      setAnalytics(updatedAnalytics);
      setChartData(generateLast7DaysData(sampleData));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAnalytics));
    }
  }, []);

  // Calculate totals
  const totals = Object.values(analytics.dailyStats).reduce(
    (acc, day) => ({
      messages: acc.messages + day.messages,
      tokens: acc.tokens + day.tokens,
      tasks: acc.tasks + day.tasks,
    }),
    { messages: 0, tokens: 0, tasks: 0 }
  );

  const estimatedCost = ((totals.tokens / 1000) * COST_PER_1K_TOKENS).toFixed(2);
  const topActions = getTopActions(analytics.actions);

  // Calculate day-over-day change
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const todayStats = analytics.dailyStats[today] || { messages: 0, tokens: 0, tasks: 0 };
  const yesterdayStats = analytics.dailyStats[yesterday] || { messages: 0, tokens: 0, tasks: 0 };
  
  const messageChange = yesterdayStats.messages > 0 
    ? Math.round(((todayStats.messages - yesterdayStats.messages) / yesterdayStats.messages) * 100)
    : 0;

  const chartColors: Record<string, string> = {
    messages: '#667eea',
    tokens: '#f59e0b',
    tasks: '#22c55e',
    cost: '#ec4899',
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>📈</span>
          <div>
            <h2 style={styles.title}>Analytics</h2>
            <span style={styles.subtitle}>Last 7 days usage</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          icon="💬"
          label="Total Messages"
          value={totals.messages.toLocaleString()}
          change={messageChange !== 0 ? `${messageChange > 0 ? '+' : ''}${messageChange}% vs yesterday` : undefined}
          changeType={messageChange > 0 ? 'positive' : messageChange < 0 ? 'negative' : 'neutral'}
          color="#667eea"
        />
        <StatCard
          icon="🎯"
          label="Tokens Used"
          value={totals.tokens.toLocaleString()}
          color="#f59e0b"
        />
        <StatCard
          icon="✅"
          label="Tasks Completed"
          value={totals.tasks}
          color="#22c55e"
        />
        <StatCard
          icon="💰"
          label="Est. Cost"
          value={`$${estimatedCost}`}
          color="#ec4899"
        />
      </div>

      {/* Chart Section */}
      <div style={styles.chartSection}>
        <div style={styles.chartHeader}>
          <h3 style={styles.chartTitle}>Usage Trends</h3>
          <div style={styles.chartTabs}>
            {(['messages', 'tokens', 'tasks', 'cost'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveChart(tab)}
                style={{
                  ...styles.chartTab,
                  ...(activeChart === tab ? { ...styles.chartTabActive, borderColor: chartColors[tab] } : {}),
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={styles.chartContainer}>
          <UsageChart
            data={chartData}
            type="area"
            color={chartColors[activeChart]}
            dataKey={activeChart}
            height={220}
          />
        </div>
      </div>

      {/* Agent Usage & Top Actions */}
      <div style={styles.bottomGrid}>
        {/* Top Actions */}
        <div style={styles.bottomCard}>
          <h4 style={styles.bottomCardTitle}>🔥 Most Used Actions</h4>
          {topActions.length === 0 ? (
            <p style={styles.emptyText}>No actions tracked yet</p>
          ) : (
            <div style={styles.actionsList}>
              {topActions.map((action, index) => (
                <div key={action.id} style={styles.actionItem}>
                  <span style={styles.actionRank}>#{index + 1}</span>
                  <span style={styles.actionName}>
                    {action.id.replace('custom-', '').replace(/-/g, ' ')}
                  </span>
                  <span style={styles.actionCount}>{action.count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Performance */}
        <div style={styles.bottomCard}>
          <h4 style={styles.bottomCardTitle}>🤖 Agent Performance</h4>
          {Object.keys(analytics.agentUsage || {}).length === 0 ? (
            <p style={styles.emptyText}>No agent data yet</p>
          ) : (
            <div style={styles.agentsList}>
              {Object.entries(analytics.agentUsage || {}).map(([agent, count]) => (
                <div key={agent} style={styles.agentItem}>
                  <span style={styles.agentEmoji}>🤖</span>
                  <span style={styles.agentName}>{agent}</span>
                  <div style={styles.agentBar}>
                    <div 
                      style={{
                        ...styles.agentBarFill,
                        width: `${Math.min(100, (count / Math.max(...Object.values(analytics.agentUsage || {}))) * 100)}%`,
                      }}
                    />
                  </div>
                  <span style={styles.agentCount}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversations Chart */}
        <div style={styles.bottomCard}>
          <h4 style={styles.bottomCardTitle}>📊 Daily Conversations</h4>
          <UsageChart
            data={chartData}
            type="bar"
            color="#667eea"
            dataKey="messages"
            height={160}
            showGrid={false}
          />
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#1a1a2e',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  headerIcon: {
    fontSize: '28px',
  },
  title: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
    margin: 0,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    padding: '20px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    flexShrink: 0,
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  statValue: {
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
  },
  statChange: {
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  chartSection: {
    margin: '0 20px 20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  chartTitle: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
  },
  chartTabs: {
    display: 'flex',
    gap: '6px',
  },
  chartTab: {
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  chartTabActive: {
    background: 'rgba(102,126,234,0.15)',
    color: '#fff',
    borderColor: '#667eea',
  },
  chartContainer: {
    padding: '20px',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    padding: '0 20px 20px',
  },
  bottomCard: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    padding: '16px',
  },
  bottomCardTitle: {
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    margin: '0 0 16px',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.85rem',
    textAlign: 'center',
    padding: '20px 0',
  },
  actionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  actionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
  },
  actionRank: {
    color: '#667eea',
    fontSize: '0.8rem',
    fontWeight: 700,
    width: '28px',
  },
  actionName: {
    color: '#fff',
    fontSize: '0.85rem',
    flex: 1,
    textTransform: 'capitalize',
  },
  actionCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  agentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  agentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  agentEmoji: {
    fontSize: '18px',
  },
  agentName: {
    color: '#fff',
    fontSize: '0.85rem',
    width: '80px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  agentBar: {
    flex: 1,
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  agentBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  agentCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
    width: '30px',
    textAlign: 'right',
  },
};
