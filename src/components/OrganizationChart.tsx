'use client';

import React, { useState, useCallback } from 'react';
import { useMemo } from 'react';
import { ORG_DATA, OrgNode, OrgNodeWithChildren, buildOrgTree, getStatusIndicator } from '../types/org';
import OrgNodeComponent from './OrgNode';
import { useAgentSessions } from '../hooks/useAgentSessions';

interface OrganizationChartProps {
  isMobile?: boolean;
  isTablet?: boolean;
  onNodeClick?: (node: OrgNode) => void;
}

export default function OrganizationChart({ 
  isMobile = false, 
  isTablet = false,
  onNodeClick 
}: OrganizationChartProps): React.ReactElement {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  const {
    nodes: agentNodes,
    activeCount,
    loading,
    error,
  } = useAgentSessions(5000, true);

  // Merge with real-time data via agentIds mapping
  const orgData = useMemo(() => {
    return ORG_DATA.map(orgNode => {
      if (!orgNode.agentIds) return orgNode; // WES — no agent mapping

      // OPIE special case: coordinator status
      if (orgNode.agentIds.includes('*')) {
        const anyWorking = agentNodes.some(a => a.status === 'working');
        const anyConnected = agentNodes.some(a => a.status === 'connected');
        const totalSessions = agentNodes.reduce((sum, a) => sum + (a.activeSessions || 0), 0);

        let status: OrgNode['status'];
        if (anyWorking) status = 'talking';
        else if (anyConnected) status = 'thinking';
        else status = 'idle';

        return { ...orgNode, status, activeSessions: totalSessions };
      }

      // Normal mapping: find matching agents by agentIds
      const matchingAgents = agentNodes.filter(a => orgNode.agentIds!.includes(a.id));
      if (matchingAgents.length > 0) {
        const anyWorking = matchingAgents.some(a => a.status === 'working');
        const anyConnected = matchingAgents.some(a => a.status === 'connected');
        const totalSessions = matchingAgents.reduce((sum, a) => sum + (a.activeSessions || 0), 0);

        return {
          ...orgNode,
          status: (anyWorking ? 'busy' : anyConnected ? 'active' : 'idle') as OrgNode['status'],
          activeSessions: totalSessions,
        };
      }

      return orgNode;
    });
  }, [agentNodes]);

  const orgTree = useMemo(() => buildOrgTree(orgData), [orgData]);

  const handleNodeClick = useCallback((node: OrgNode) => {
    setSelectedNode(node.id === selectedNode ? null : node.id);
    onNodeClick?.(node);
  }, [onNodeClick, selectedNode]);

  const workingCount = orgData.filter(n => n.status === 'busy' || n.status === 'talking' || n.status === 'working').length;

  const renderOrgNode = (nodeWithChildren: OrgNodeWithChildren, level: number = 0): React.ReactElement => {
    const hasChildren = nodeWithChildren.children.length > 0;
    
    return (
      <div
        key={nodeWithChildren.id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <div style={{ marginBottom: hasChildren ? '24px' : 0 }}>
          <OrgNodeComponent 
            node={nodeWithChildren} 
            onNodeClick={handleNodeClick}
            compact={isMobile || isTablet}
          />
        </div>

        {/* Connection line down */}
        {hasChildren && (
          <div
            style={{
              width: '2px',
              height: '20px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
              marginBottom: '8px',
            }}
          />
        )}

        {/* Children */}
        {hasChildren && (
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '16px' : '20px',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}
          >
            {!isMobile && nodeWithChildren.children.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  height: '2px',
                  width: `${(nodeWithChildren.children.length - 1) * 240}px`,
                  background: 'rgba(255,255,255,0.2)',
                }}
              />
            )}

            {nodeWithChildren.children.map(child => renderOrgNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading && agentNodes.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '300px',
        color: 'rgba(255,255,255,0.6)'
      }}>
        Loading organization structure...
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 8px 0' }}>
          🏢 Organization Structure
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: 0 }}>
          Team hierarchy and real-time agent status
        </p>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '12px', 
        marginBottom: '32px',
        flexWrap: 'wrap'
      }}>
        {[
          { label: 'Total', value: orgData.length, color: '#3B82F6' },
          { label: 'Active', value: orgData.filter(n => n.status === 'active' || n.status === 'thinking').length, color: '#10B981' },
          { label: 'Working', value: workingCount, color: '#F59E0B' },
          { label: 'Idle', value: orgData.filter(n => n.status === 'idle').length, color: '#6B7280' },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              background: `${stat.color}15`,
              border: `1px solid ${stat.color}30`,
              borderRadius: '8px',
              padding: '8px 16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 700, color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Organization Tree */}
      <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
        <div style={{ minWidth: isMobile ? 'auto' : '900px' }}>
          {orgTree.map(root => renderOrgNode(root))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '32px',
        padding: '12px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)'
      }}>
        {loading ? 'Syncing...' : `Last updated: ${new Date().toLocaleTimeString()}`}
        {error && <span style={{ color: '#ef4444', marginLeft: '8px' }}>⚠️ {error}</span>}
      </div>
    </div>
  );
}
