'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAgentPerformance } from '../contexts/AgentPerformanceContext';
import { AgentSuggestion } from '../lib/performanceTypes';

interface AgentSuggestionWidgetProps {
  taskDescription: string;
  onSelectAgent?: (agentId: string) => void;
  compact?: boolean;
}

export default function AgentSuggestionWidget({
  taskDescription,
  onSelectAgent,
  compact = false,
}: AgentSuggestionWidgetProps) {
  const { theme } = useTheme();
  const { suggestBestAgent, leaderboard } = useAgentPerformance();
  const [suggestion, setSuggestion] = useState<AgentSuggestion | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Debounce the suggestion calculation
  useEffect(() => {
    if (!taskDescription || taskDescription.length < 5) {
      setSuggestion(null);
      return;
    }

    setDismissed(false);
    const timer = setTimeout(() => {
      const newSuggestion = suggestBestAgent(taskDescription);
      setSuggestion(newSuggestion);
    }, 300);

    return () => clearTimeout(timer);
  }, [taskDescription, suggestBestAgent]);

  const handleSelect = useCallback(() => {
    if (suggestion && onSelectAgent) {
      onSelectAgent(suggestion.agentId);
    }
  }, [suggestion, onSelectAgent]);

  // Don't show if dismissed or no suggestion
  if (dismissed || !suggestion || !taskDescription) {
    return null;
  }

  // Don't show low confidence suggestions
  if (suggestion.confidence < 20 && leaderboard.totalTasks < 3) {
    return null;
  }

  const confidenceColor = suggestion.confidence >= 70 ? theme.colors.success :
    suggestion.confidence >= 40 ? theme.colors.warning : theme.colors.textMuted;

  if (compact) {
    return (
      <div
        onClick={handleSelect}
        style={{
          padding: '8px 12px',
          background: `${theme.colors.accent}10`,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: onSelectAgent ? 'pointer' : 'default',
          border: `1px solid ${theme.colors.accent}30`,
        }}
      >
        <span style={{ fontSize: 18 }}>{suggestion.agentEmoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 500,
            color: theme.colors.textPrimary,
          }}>
            Suggested: {suggestion.agentName}
          </div>
          <div style={{
            fontSize: 10,
            color: theme.colors.textMuted,
          }}>
            {suggestion.confidence}% confidence
          </div>
        </div>
        {onSelectAgent && (
          <span style={{
            fontSize: 12,
            color: theme.colors.accent,
            fontWeight: 500,
          }}>
            Use
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      padding: 16,
      background: `linear-gradient(135deg, ${theme.colors.accent}08, ${theme.colors.accent}15)`,
      borderRadius: 12,
      border: `1px solid ${theme.colors.accent}25`,
      position: 'relative',
    }}>
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'transparent',
          border: 'none',
          color: theme.colors.textMuted,
          cursor: 'pointer',
          fontSize: 14,
          padding: 4,
        }}
      >
        ×
      </button>

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        {/* Agent avatar */}
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: theme.colors.bgElevated,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
        }}>
          {suggestion.agentEmoji}
        </div>

        <div style={{ flex: 1 }}>
          {/* Header */}
          <div style={{
            fontSize: 11,
            color: theme.colors.accent,
            fontWeight: 500,
            marginBottom: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            💡 AI Suggestion
          </div>

          {/* Agent name */}
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: theme.colors.textPrimary,
            marginBottom: 4,
          }}>
            {suggestion.agentName}
          </div>

          {/* Reason */}
          <p style={{
            margin: 0,
            fontSize: 12,
            color: theme.colors.textSecondary,
            lineHeight: 1.4,
          }}>
            {suggestion.reason}
          </p>

          {/* Confidence bar */}
          <div style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              flex: 1,
              height: 4,
              background: theme.colors.bgElevated,
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${suggestion.confidence}%`,
                background: confidenceColor,
                borderRadius: 2,
              }} />
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: confidenceColor,
            }}>
              {suggestion.confidence}%
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginTop: 16,
      }}>
        {onSelectAgent && (
          <button
            onClick={handleSelect}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: theme.colors.accent,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            Use {suggestion.agentName}
          </button>
        )}

        {suggestion.alternativeAgentIds.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 8px',
          }}>
            <span style={{
              fontSize: 11,
              color: theme.colors.textMuted,
            }}>
              or try:
            </span>
            {suggestion.alternativeAgentIds.slice(0, 2).map(altId => {
              const altAgent = leaderboard.agents.find(a => a.agentId === altId);
              return altAgent ? (
                <button
                  key={altId}
                  onClick={() => onSelectAgent?.(altId)}
                  style={{
                    background: theme.colors.bgElevated,
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                  title={altAgent.agentName}
                >
                  {altAgent.agentEmoji}
                </button>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
