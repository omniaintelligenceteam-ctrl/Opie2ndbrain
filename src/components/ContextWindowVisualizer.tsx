'use client';

import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import {
  ContextSegment,
  ContextWindowState,
  CONTEXT_COLORS,
  CONTEXT_LABELS,
  CONTEXT_ICONS,
  CONTEXT_THRESHOLDS,
  getWarningLevel,
  formatTokenCount,
  EMPTY_CONTEXT_STATE,
  DEMO_SEGMENTS,
} from '../lib/contextTypes';

interface SegmentCardProps {
  segment: ContextSegment;
  onForget: () => void;
}

function SegmentCard({ segment, onForget }: SegmentCardProps) {
  const { theme } = useTheme();
  const color = CONTEXT_COLORS[segment.type];
  const icon = CONTEXT_ICONS[segment.type];

  return (
    <div style={{
      padding: 12,
      background: theme.colors.bgElevated,
      borderRadius: 10,
      borderLeft: `3px solid ${color}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: theme.colors.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {segment.label}
          </span>
        </div>
        {segment.content && (
          <p style={{
            margin: 0,
            fontSize: 11,
            color: theme.colors.textMuted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {segment.content}
          </p>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          textAlign: 'right',
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color,
          }}>
            {formatTokenCount(segment.tokenCount)}
          </div>
          <div style={{
            fontSize: 10,
            color: theme.colors.textMuted,
          }}>
            tokens
          </div>
        </div>

        {segment.canForget && (
          <button
            onClick={onForget}
            style={{
              padding: '6px 10px',
              background: `${theme.colors.error}15`,
              border: 'none',
              borderRadius: 6,
              color: theme.colors.error,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            Forget
          </button>
        )}
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { type: string; percentage: number };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const { theme } = useTheme();

  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div style={{
        padding: '8px 12px',
        background: theme.colors.bgElevated,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: theme.colors.textPrimary,
        }}>
          {data.name}
        </div>
        <div style={{
          fontSize: 12,
          color: theme.colors.textSecondary,
        }}>
          {formatTokenCount(data.value)} tokens ({data.payload.percentage.toFixed(1)}%)
        </div>
      </div>
    );
  }
  return null;
}

export default function ContextWindowVisualizer() {
  const { theme } = useTheme();
  const [contextState, setContextState] = useState<ContextWindowState>(EMPTY_CONTEXT_STATE);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);

  // Fetch context data
  const fetchContext = useCallback(async () => {
    try {
      const res = await fetch('/api/context');
      if (res.ok) {
        const data = await res.json();
        if (data.segments && data.segments.length > 0) {
          setContextState(data);
          setUseDemo(false);
        } else {
          // Use demo data if no real data
          setUseDemo(true);
        }
      } else {
        setUseDemo(true);
      }
    } catch {
      setUseDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchContext();
    const interval = setInterval(fetchContext, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchContext]);

  // Generate display data
  const displayState = useDemo ? {
    ...EMPTY_CONTEXT_STATE,
    used: DEMO_SEGMENTS.reduce((sum, s) => sum + s.tokenCount, 0),
    total: 128000,
    segments: DEMO_SEGMENTS.map(s => ({
      ...s,
      percentage: 0, // Will be calculated below
    })),
    lastUpdated: new Date().toISOString(),
    warningLevel: 'normal' as const,
  } : contextState;

  // Calculate percentages
  const totalUsed = displayState.segments.reduce((sum, s) => sum + s.tokenCount, 0);
  const segmentsWithPercentage = displayState.segments.map(s => ({
    ...s,
    percentage: totalUsed > 0 ? (s.tokenCount / totalUsed) * 100 : 0,
  }));

  const usagePercentage = displayState.total > 0
    ? (totalUsed / displayState.total) * 100
    : 0;
  const warningLevel = getWarningLevel(usagePercentage);

  // Prepare chart data
  const chartData = segmentsWithPercentage.map(s => ({
    name: CONTEXT_LABELS[s.type],
    value: s.tokenCount,
    type: s.type,
    percentage: s.percentage,
    color: CONTEXT_COLORS[s.type],
  }));

  // Handle forget
  const handleForget = useCallback(async (segmentId: string) => {
    try {
      await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forget', segmentId }),
      });
      fetchContext();
    } catch (e) {
      console.error('Failed to forget segment:', e);
    }
  }, [fetchContext]);

  // Warning color
  const warningColor = warningLevel === 'critical'
    ? theme.colors.error
    : warningLevel === 'warning'
      ? theme.colors.warning
      : theme.colors.success;

  return (
    <div style={{
      background: theme.colors.bgPrimary,
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: theme.colors.textPrimary,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span>🧠</span>
              Context Window
            </h2>
            <p style={{
              margin: '8px 0 0',
              fontSize: 13,
              color: theme.colors.textSecondary,
            }}>
              {useDemo ? 'Demo data - ' : ''}What&apos;s in the agent&apos;s working memory
            </p>
          </div>
          <button
            onClick={fetchContext}
            disabled={loading}
            style={{
              padding: '8px 12px',
              background: theme.colors.bgElevated,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 8,
              color: theme.colors.textSecondary,
              cursor: 'pointer',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {loading ? '...' : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Usage Bar */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <span style={{
            fontSize: 13,
            color: theme.colors.textSecondary,
          }}>
            Context Usage
          </span>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: warningColor,
          }}>
            {formatTokenCount(totalUsed)} / {formatTokenCount(displayState.total)}
            <span style={{ fontWeight: 400, marginLeft: 6 }}>
              ({usagePercentage.toFixed(1)}%)
            </span>
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 8,
          background: theme.colors.bgElevated,
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${Math.min(usagePercentage, 100)}%`,
            background: warningLevel === 'normal'
              ? `linear-gradient(90deg, ${theme.colors.accent}, #a855f7)`
              : warningColor,
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }} />

          {/* Threshold markers */}
          <div style={{
            position: 'absolute',
            left: `${CONTEXT_THRESHOLDS.warning}%`,
            top: 0,
            height: '100%',
            width: 2,
            background: theme.colors.warning,
            opacity: 0.5,
          }} />
          <div style={{
            position: 'absolute',
            left: `${CONTEXT_THRESHOLDS.critical}%`,
            top: 0,
            height: '100%',
            width: 2,
            background: theme.colors.error,
            opacity: 0.5,
          }} />
        </div>

        {/* Warning message */}
        {warningLevel !== 'normal' && (
          <div style={{
            marginTop: 12,
            padding: '10px 12px',
            background: `${warningColor}15`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>
              {warningLevel === 'critical' ? '🚨' : '⚠️'}
            </span>
            <span style={{
              fontSize: 12,
              color: warningColor,
            }}>
              {warningLevel === 'critical'
                ? 'Context window nearly full! Consider clearing some items.'
                : 'Context window getting full. Monitor usage.'}
            </span>
          </div>
        )}
      </div>

      {/* Pie Chart */}
      {chartData.length > 0 && (
        <div style={{
          padding: '0 24px 20px',
        }}>
          <div style={{
            height: 200,
            background: theme.colors.bgElevated,
            borderRadius: 12,
            padding: 16,
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  formatter={(value) => (
                    <span style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Segment List */}
      <div style={{
        padding: '0 24px 24px',
      }}>
        <h3 style={{
          margin: '0 0 12px',
          fontSize: 14,
          fontWeight: 500,
          color: theme.colors.textSecondary,
        }}>
          Memory Segments
        </h3>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {segmentsWithPercentage.map(segment => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              onForget={() => handleForget(segment.id)}
            />
          ))}
        </div>

        {segmentsWithPercentage.length === 0 && (
          <div style={{
            padding: 24,
            textAlign: 'center',
            color: theme.colors.textMuted,
            fontSize: 13,
          }}>
            No context data available
          </div>
        )}
      </div>
    </div>
  );
}
