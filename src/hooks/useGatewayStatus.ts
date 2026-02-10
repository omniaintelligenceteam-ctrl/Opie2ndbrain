// src/hooks/useGatewayStatus.ts
// Consolidated gateway status hook — replaces competing polls in OpieKanban
'use client';
import { useCallback } from 'react';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { useActiveAgents } from './useAgentSessions';

export interface GatewayStatusResult {
  // System status (from useSystemStatus)
  liveStatus: ReturnType<typeof useSystemStatus>['status'];
  statusLoading: boolean;
  // Agent data (from useActiveAgents)
  realActiveAgents: string[];
  realActiveCount: number;
  refreshAgents: () => void;
}

/**
 * Single gateway status hook that combines system status + agent polling.
 * Only polls agents when the relevant views are active.
 */
export function useGatewayStatus(
  shouldPollAgents: boolean,
  statusIntervalMs = 3000,
  agentIntervalMs = 5000
): GatewayStatusResult {
  const { status: liveStatus, loading: statusLoading } = useSystemStatus();
  const {
    activeAgents: realActiveAgents,
    activeCount: realActiveCount,
    refresh: refreshAgents,
  } = useActiveAgents(agentIntervalMs, shouldPollAgents);

  return {
    liveStatus,
    statusLoading,
    realActiveAgents,
    realActiveCount,
    refreshAgents,
  };
}
