'use client';

import React from 'react';
import { OrgNode, getStatusIndicator, getStatusColor } from '../types/org';

interface OrgNodeProps {
  node: OrgNode;
  onNodeClick?: (node: OrgNode) => void;
  compact?: boolean;
}

export default function OrgNodeComponent({ node, onNodeClick, compact = false }: OrgNodeProps): React.ReactElement {
  const handleClick = () => {
    onNodeClick?.(node);
  };

  const cardStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${node.color}15 0%, ${node.color}08 100%)`,
    border: `1px solid ${node.color}30`,
    borderRadius: '12px',
    padding: compact ? '12px' : '16px',
    position: 'relative',
    cursor: onNodeClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
    minWidth: compact ? '220px' : '260px',
    maxWidth: compact ? '240px' : '300px',
  };

  const hoverStyle: React.CSSProperties = {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 25px ${node.color}25`,
    borderColor: `${node.color}50`,
  };

  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (onNodeClick) Object.assign(e.currentTarget.style, hoverStyle);
      }}
      onMouseLeave={(e) => {
        if (onNodeClick) Object.assign(e.currentTarget.style, cardStyle);
      }}
    >
      {/* Status Indicator */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ fontSize: '8px' }}>{getStatusIndicator(node.status)}</span>
        <span 
          style={{ 
            fontSize: '10px', 
            color: getStatusColor(node.status),
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {node.status}
        </span>
      </div>

      {/* Avatar and Basic Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            fontSize: compact ? '24px' : '32px',
            background: `${node.color}20`,
            borderRadius: '8px',
            width: compact ? '40px' : '48px',
            height: compact ? '40px' : '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${node.color}30`,
          }}
        >
          {node.avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: compact ? '14px' : '16px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.02em',
            }}
          >
            {node.name}
          </h3>
          <p
            style={{
              margin: '2px 0 0 0',
              fontSize: compact ? '11px' : '13px',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 500,
            }}
          >
            {node.title}
          </p>
          {!compact && (
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {node.role}
            </p>
          )}
        </div>
      </div>

      {/* Model Badge */}
      <div
        style={{
          background: `${node.color}25`,
          border: `1px solid ${node.color}40`,
          borderRadius: '6px',
          padding: '4px 8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            color: node.color,
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          {node.model}
        </span>
        {node.model !== 'Human' && (
          <span
            style={{
              fontSize: '9px',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            ${node.costPer1M}/1M
          </span>
        )}
      </div>

      {/* Skills */}
      {!compact && node.skills.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {node.skills.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                style={{
                  fontSize: '9px',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.8)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Current Task */}
      {node.currentTask && !compact && (
        <div style={{ 
          marginTop: '8px',
          padding: '8px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '6px',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.7)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>Current Task:</div>
          {node.currentTask}
        </div>
      )}
    </div>
  );
}
