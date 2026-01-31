'use client';

import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAgentPerformance } from '../contexts/AgentPerformanceContext';
import { AgentPerformanceStats, TASK_TYPES, TaskType } from '../lib/performanceTypes';

type TabId = 'leaderboard' | 'byTask' | 'history';

interface AgentCardProps {
  agent: AgentPerformanceStats;
  showRank?: boolean;
}

function AgentCard({ agent, showRank = true }: AgentCardProps) {
  const { theme } = useTheme();

  const trendIcon = agent.recentTrend === 'improving' ? '📈' :
    agent.recentTrend === 'declining' ? '📉' : '➡️';
  const trendColor = agent.recentTrend === 'improving' ? theme.colors.success :
    agent.recentTrend === 'declining' ? theme.colors.error : theme.colors.textMuted;

  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze

  return (
    <div style={{
      padding: 16,
      background: theme.colors.bgElevated,
      borderRadius: 12,
      border: agent.rank <= 3 ? `2px solid ${rankColors[agent.rank - 1] || theme.colors.border}` : 'none',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
      }}>
        {showRank && (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: agent.rank <= 3
              ? `${rankColors[agent.rank - 1]}20`
              : theme.colors.bgPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: agent.rank <= 3 ? 16 : 14,
            fontWeight: 600,
            color: agent.rank <= 3 ? rankColors[agent.rank - 1] : theme.colors.textSecondary,
          }}>
            {agent.rank <= 3 ? ['🥇', '🥈', '🥉'][agent.rank - 1] : agent.rank}
          </div>
        )}

        <div style={{
          fontSize: 28,
        }}>
          {agent.agentEmoji}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: theme.colors.textPrimary,
          }}>
            {agent.agentName}
          </div>
          <div style={{
            fontSize: 12,
            color: theme.colors.textMuted,
          }}>
            {agent.totalTasks} tasks completed
          </div>
        </div>

        <div style={{
          textAlign: 'right',
        }}>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            color: theme.colors.accent,
          }}>
            {agent.score}
          </div>
          <div style={{
            fontSize: 10,
            color: theme.colors.textMuted,
          }}>
            score
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
      }}>
        <div style={{
          padding: 8,
          background: theme.colors.bgPrimary,
          borderRadius: 8,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: agent.successRate >= 80 ? theme.colors.success :
              agent.successRate >= 50 ? theme.colors.warning : theme.colors.error,
          }}>
            {agent.successRate.toFixed(0)}%
          </div>
          <div style={{
            fontSize: 10,
            color: theme.colors.textMuted,
          }}>
            Success
          </div>
        </div>

        <div style={{
          padding: 8,
          background: theme.colors.bgPrimary,
          borderRadius: 8,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: theme.colors.textPrimary,
          }}>
            {(agent.avgCompletionTime / 1000).toFixed(0)}s
          </div>
          <div style={{
            fontSize: 10,
            color: theme.colors.textMuted,
          }}>
            Avg Time
          </div>
        </div>

        <div style={{
          padding: 8,
          background: theme.colors.bgPrimary,
          borderRadius: 8,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: theme.colors.textPrimary,
          }}>
            {agent.avgTokensPerTask >= 1000
              ? `${(agent.avgTokensPerTask / 1000).toFixed(1)}k`
              : agent.avgTokensPerTask.toFixed(0)}
          </div>
          <div style={{
            fontSize: 10,
            color: theme.colors.textMuted,
          }}>
            Tokens
          </div>
        </div>

        <div style={{
          padding: 8,
          background: theme.colors.bgPrimary,
          borderRadius: 8,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: trendColor,
          }}>
            {trendIcon}
          </div>
          <div style={{
            fontSize: 10,
            color: theme.colors.textMuted,
          }}>
            Trend
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentLeaderboard() {
  const { theme } = useTheme();
  const { leaderboard, taskResults, clearHistory } = useAgentPerformance();
  const [activeTab, setActiveTab] = useState<TabId>('leaderboard');
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType | null>(null);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'leaderboard', label: 'Rankings', icon: '🏆' },
    { id: 'byTask', label: 'By Task', icon: '📊' },
    { id: 'history', label: 'History', icon: '📜' },
  ];

  // Get best agents per task type
  const taskTypeLeaders = TASK_TYPES.filter(t => t !== 'other').map(taskType => {
    const bestAgentId = leaderboard.bestByTaskType[taskType];
    const agent = leaderboard.agents.find(a => a.agentId === bestAgentId);
    return { taskType, agent };
  });

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
              <span>🏆</span>
              Agent Leaderboard
            </h2>
            <p style={{
              margin: '8px 0 0',
              fontSize: 13,
              color: theme.colors.textSecondary,
            }}>
              {leaderboard.totalTasks} tasks tracked across {leaderboard.agents.length} agents
            </p>
          </div>

          {taskResults.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all performance history?')) {
                  clearHistory();
                }
              }}
              style={{
                padding: '8px 12px',
                background: theme.colors.bgElevated,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 8,
                color: theme.colors.textMuted,
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              Clear History
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${theme.colors.border}`,
        padding: '0 24px',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? theme.colors.accent : 'transparent'}`,
              color: activeTab === tab.id ? theme.colors.accent : theme.colors.textSecondary,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        {activeTab === 'leaderboard' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {leaderboard.agents.length > 0 ? (
              leaderboard.agents.map(agent => (
                <AgentCard key={agent.agentId} agent={agent} />
              ))
            ) : (
              <div style={{
                padding: 40,
                textAlign: 'center',
                color: theme.colors.textMuted,
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>No performance data yet</div>
                <div style={{ fontSize: 12 }}>
                  Complete some tasks to see agent rankings
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'byTask' && (
          <div>
            {/* Task type selector */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 20,
            }}>
              {TASK_TYPES.filter(t => t !== 'other').map(taskType => (
                <button
                  key={taskType}
                  onClick={() => setSelectedTaskType(
                    selectedTaskType === taskType ? null : taskType
                  )}
                  style={{
                    padding: '8px 14px',
                    background: selectedTaskType === taskType
                      ? theme.colors.accent
                      : theme.colors.bgElevated,
                    border: 'none',
                    borderRadius: 20,
                    color: selectedTaskType === taskType
                      ? '#fff'
                      : theme.colors.textSecondary,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                >
                  {taskType}
                </button>
              ))}
            </div>

            {/* Best agents per task type */}
            <div style={{
              display: 'grid',
              gap: 12,
            }}>
              {(selectedTaskType
                ? taskTypeLeaders.filter(l => l.taskType === selectedTaskType)
                : taskTypeLeaders
              ).map(({ taskType, agent }) => (
                <div
                  key={taskType}
                  style={{
                    padding: 16,
                    background: theme.colors.bgElevated,
                    borderRadius: 12,
                  }}
                >
                  <div style={{
                    fontSize: 12,
                    color: theme.colors.textMuted,
                    textTransform: 'capitalize',
                    marginBottom: 8,
                  }}>
                    Best at {taskType}
                  </div>

                  {agent ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}>
                      <span style={{ fontSize: 24 }}>{agent.agentEmoji}</span>
                      <div>
                        <div style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: theme.colors.textPrimary,
                        }}>
                          {agent.agentName}
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: theme.colors.textSecondary,
                        }}>
                          {agent.taskTypeStats[taskType]?.successRate.toFixed(0)}% success
                          ({agent.taskTypeStats[taskType]?.count} tasks)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      fontSize: 13,
                      color: theme.colors.textMuted,
                    }}>
                      No data yet
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {taskResults.length > 0 ? (
              [...taskResults].reverse().slice(0, 20).map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: 12,
                    background: theme.colors.bgElevated,
                    borderRadius: 10,
                    borderLeft: `3px solid ${task.success ? theme.colors.success : theme.colors.error}`,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}>
                    <div>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: theme.colors.textPrimary,
                        marginBottom: 4,
                      }}>
                        {task.taskDescription.slice(0, 60)}
                        {task.taskDescription.length > 60 ? '...' : ''}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: theme.colors.textMuted,
                      }}>
                        {task.agentName} • {task.taskType} • {(task.duration / 1000).toFixed(1)}s
                      </div>
                    </div>
                    <span style={{
                      fontSize: 16,
                    }}>
                      {task.success ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                padding: 40,
                textAlign: 'center',
                color: theme.colors.textMuted,
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📜</div>
                <div style={{ fontSize: 14 }}>No task history yet</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
