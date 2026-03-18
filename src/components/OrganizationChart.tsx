'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ORG_DATA, OrgNode, OrgNodeWithChildren, buildOrgTree, getStatusColor } from '../types/org';
import { useAgentSessions } from '../hooks/useAgentSessions';

interface OrganizationChartProps {
  isMobile?: boolean;
  isTablet?: boolean;
  onNodeClick?: (node: OrgNode) => void;
}

// Card dimensions
const CARD_W = 160;
const CARD_H = 90;
const H_GAP = 32;   // horizontal gap between siblings
const V_GAP = 72;   // vertical gap between levels

interface PositionedNode extends OrgNodeWithChildren {
  x: number;
  y: number;
  subtreeWidth: number;
}

function calcSubtreeWidth(node: OrgNodeWithChildren): number {
  if (node.children.length === 0) return CARD_W;
  const childrenWidth = node.children.reduce((sum, c) => sum + calcSubtreeWidth(c), 0)
    + H_GAP * (node.children.length - 1);
  return Math.max(CARD_W, childrenWidth);
}

function positionTree(node: OrgNodeWithChildren, x: number, y: number): PositionedNode {
  const subtreeWidth = calcSubtreeWidth(node);
  const positioned: PositionedNode = { ...node, x, y, subtreeWidth, children: [] };

  if (node.children.length > 0) {
    const totalChildWidth = node.children.reduce((sum, c) => sum + calcSubtreeWidth(c), 0)
      + H_GAP * (node.children.length - 1);
    let childX = x + subtreeWidth / 2 - totalChildWidth / 2;

    positioned.children = node.children.map(child => {
      const childSubtree = calcSubtreeWidth(child);
      const positioned_child = positionTree(child, childX, y + CARD_H + V_GAP);
      childX += childSubtree + H_GAP;
      return positioned_child;
    });
  }
  return positioned;
}

function collectAll(node: PositionedNode): PositionedNode[] {
  return [node, ...node.children.flatMap(c => collectAll(c as PositionedNode))];
}

function collectEdges(node: PositionedNode): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  return node.children.flatMap(child => {
    const c = child as PositionedNode;
    return [
      { x1: node.x + CARD_W / 2, y1: node.y + CARD_H, x2: c.x + CARD_W / 2, y2: c.y },
      ...collectEdges(c),
    ];
  });
}

function NodeCard({ node, onClick, selected }: { node: PositionedNode; onClick: () => void; selected: boolean }) {
  const statusColor = getStatusColor(node.status);
  const isTopLevel = node.reportsTo === null;
  const isDeptHead = node.reportsTo === 'opie';

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Glow */}
      {selected && (
        <rect
          x={node.x - 4} y={node.y - 4}
          width={CARD_W + 8} height={CARD_H + 8}
          rx={14} fill="none"
          stroke={node.color} strokeWidth={2}
          opacity={0.5}
          filter="url(#glow)"
        />
      )}
      {/* Card background */}
      <rect
        x={node.x} y={node.y}
        width={CARD_W} height={CARD_H}
        rx={12}
        fill={selected ? `${node.color}25` : isTopLevel ? 'rgba(255,215,0,0.08)' : isDeptHead ? `${node.color}12` : 'rgba(255,255,255,0.04)'}
        stroke={selected ? node.color : node.color + '50'}
        strokeWidth={selected ? 2 : 1}
      />
      {/* Status bar at bottom */}
      <rect
        x={node.x + 12} y={node.y + CARD_H - 6}
        width={CARD_W - 24} height={3}
        rx={2}
        fill={statusColor + '60'}
      />
      {/* Status dot */}
      <circle cx={node.x + CARD_W - 16} cy={node.y + 14} r={5} fill={statusColor} />
      {/* Avatar */}
      <text x={node.x + 16} y={node.y + 30} fontSize={22} textAnchor="start" dominantBaseline="middle">{node.avatar}</text>
      {/* Name */}
      <text
        x={node.x + 44} y={node.y + 22}
        fontSize={isTopLevel ? 13 : isDeptHead ? 12 : 11}
        fontWeight={isDeptHead || isTopLevel ? 700 : 600}
        fill="#ffffff"
        textAnchor="start"
        dominantBaseline="middle"
      >
        {node.name}
      </text>
      {/* Role */}
      <text
        x={node.x + 44} y={node.y + 38}
        fontSize={9}
        fill={node.color}
        textAnchor="start"
        dominantBaseline="middle"
        opacity={0.9}
      >
        {node.role.length > 20 ? node.role.slice(0, 19) + '…' : node.role}
      </text>
      {/* Model */}
      <text
        x={node.x + 12} y={node.y + 62}
        fontSize={8.5}
        fill="rgba(255,255,255,0.35)"
        textAnchor="start"
        dominantBaseline="middle"
      >
        {node.model.length > 26 ? node.model.slice(0, 25) + '…' : node.model}
      </text>
    </g>
  );
}

export default function OrganizationChart({ isMobile = false, isTablet = false, onNodeClick }: OrganizationChartProps) {
  const [zoom, setZoom] = useState(isMobile ? 0.55 : 0.82);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { nodes: agentNodes } = useAgentSessions(5000, true);

  const orgData = useMemo(() => {
    return ORG_DATA.map(orgNode => {
      if (!orgNode.agentIds) return orgNode;
      if (orgNode.agentIds.includes('*')) {
        const anyWorking = agentNodes.some(a => a.status === 'working');
        return { ...orgNode, status: (anyWorking ? 'busy' : 'active') as OrgNode['status'] };
      }
      const matching = agentNodes.filter(a => orgNode.agentIds!.includes(a.id));
      if (matching.length > 0) {
        const anyWorking = matching.some(a => a.status === 'working');
        const anyConnected = matching.some(a => a.status === 'connected');
        return { ...orgNode, status: (anyWorking ? 'busy' : anyConnected ? 'active' : 'idle') as OrgNode['status'] };
      }
      return orgNode;
    });
  }, [agentNodes]);

  const orgTree = useMemo(() => buildOrgTree(orgData), [orgData]);

  const positionedTrees = useMemo(() => {
    let offsetX = 0;
    return orgTree.map(root => {
      const sw = calcSubtreeWidth(root);
      const tree = positionTree(root, offsetX, 0);
      offsetX += sw + H_GAP * 2;
      return tree;
    });
  }, [orgTree]);

  const allNodes = useMemo(() => positionedTrees.flatMap(collectAll), [positionedTrees]);
  const allEdges = useMemo(() => positionedTrees.flatMap(collectEdges), [positionedTrees]);

  const bounds = useMemo(() => {
    if (!allNodes.length) return { minX: 0, minY: 0, maxX: 800, maxY: 400 };
    const xs = allNodes.map(n => n.x);
    const ys = allNodes.map(n => n.y);
    return {
      minX: Math.min(...xs) - 32,
      minY: Math.min(...ys) - 32,
      maxX: Math.max(...xs) + CARD_W + 32,
      maxY: Math.max(...ys) + CARD_H + 32,
    };
  }, [allNodes]);

  const svgW = bounds.maxX - bounds.minX;
  const svgH = bounds.maxY - bounds.minY;

  // Center on mount
  useEffect(() => {
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      setPan({
        x: (cw - svgW * zoom) / 2,
        y: Math.max(24, (ch - svgH * zoom) / 2),
      });
    }
  }, [svgW, svgH, zoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(2.5, Math.max(0.3, z * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).tagName === 'rect' || (e.target as SVGElement).tagName === 'text' || (e.target as SVGElement).tagName === 'circle') return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const resetView = useCallback(() => {
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const newZoom = isMobile ? 0.55 : 0.82;
      setZoom(newZoom);
      setPan({ x: (cw - svgW * newZoom) / 2, y: Math.max(24, (ch - svgH * newZoom) / 2) });
    }
  }, [isMobile, svgW, svgH]);

  const selectedData = selectedNode ? allNodes.find(n => n.id === selectedNode) : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: isMobile ? '12px' : '24px', paddingTop: isMobile ? '72px' : '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: isMobile ? 18 : 22, fontWeight: 700, margin: 0 }}>🏢 Organization</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0' }}>{allNodes.length} agents · drag to pan · scroll to zoom</p>
        </div>
        {/* Zoom Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[
            { label: '−', action: () => setZoom(z => Math.max(0.3, z - 0.15)) },
            { label: '⊙', action: resetView },
            { label: '+', action: () => setZoom(z => Math.min(2.5, z + 0.15)) },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: btn.label === '⊙' ? 18 : 20,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{btn.label}</button>
          ))}
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, minWidth: 40 }}>
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1, overflow: 'hidden', borderRadius: 16,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          cursor: isPanning ? 'grabbing' : 'grab',
          position: 'relative', minHeight: isMobile ? 400 : 500,
        }}
      >
        <svg
          width={svgW}
          height={svgH}
          style={{ position: 'absolute', left: pan.x, top: pan.y, transform: `scale(${zoom})`, transformOrigin: '0 0', overflow: 'visible' }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {allEdges.map((e, i) => {
            const midY = (e.y1 + e.y2) / 2;
            return (
              <path
                key={i}
                d={`M ${e.x1 - bounds.minX} ${e.y1 - bounds.minY} C ${e.x1 - bounds.minX} ${midY - bounds.minY}, ${e.x2 - bounds.minX} ${midY - bounds.minY}, ${e.x2 - bounds.minX} ${e.y2 - bounds.minY}`}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1.5}
                fill="none"
              />
            );
          })}

          {/* Nodes */}
          {allNodes.map(node => (
            <NodeCard
              key={node.id}
              node={{ ...node, x: node.x - bounds.minX, y: node.y - bounds.minY }}
              selected={selectedNode === node.id}
              onClick={() => setSelectedNode(prev => prev === node.id ? null : node.id)}
            />
          ))}
        </svg>
      </div>

      {/* Selected node detail */}
      {selectedData && (
        <div style={{
          marginTop: 16, padding: '16px 20px', borderRadius: 12, flexShrink: 0,
          background: `${selectedData.color}10`,
          border: `1px solid ${selectedData.color}40`,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <span style={{ fontSize: 32 }}>{selectedData.avatar}</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{selectedData.name} — {selectedData.title}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
              {selectedData.skills.join(' · ')}
            </div>
          </div>
          <div style={{
            background: getStatusColor(selectedData.status) + '20',
            color: getStatusColor(selectedData.status),
            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          }}>{selectedData.status}</div>
          <button
            onClick={() => setSelectedNode(null)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}
          >×</button>
        </div>
      )}
    </div>
  );
}
