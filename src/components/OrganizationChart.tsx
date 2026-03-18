'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ORG_DATA, OrgNode, OrgNodeWithChildren, buildOrgTree } from '../types/org';
import OrgNodeComponent from './OrgNode';
import { useAgentSessions } from '../hooks/useAgentSessions';

interface OrganizationChartProps {
  isMobile?: boolean;
  isTablet?: boolean;
  onNodeClick?: (node: OrgNode) => void;
}

const CARD_W = 280;
const CARD_H = 180;
const H_GAP = 40;
const V_GAP = 80;

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
      const sw = calcSubtreeWidth(child);
      const pc = positionTree(child, childX, y + CARD_H + V_GAP);
      childX += sw + H_GAP;
      return pc;
    });
  }
  return positioned;
}

function collectAll(node: PositionedNode): PositionedNode[] {
  return [node, ...node.children.flatMap(c => collectAll(c as PositionedNode))];
}

interface EdgeInfo { x1: number; y1: number; x2: number; y2: number; color: string; }
function collectEdges(node: PositionedNode): EdgeInfo[] {
  return node.children.flatMap(child => {
    const c = child as PositionedNode;
    return [
      { x1: node.x + CARD_W / 2, y1: node.y + CARD_H, x2: c.x + CARD_W / 2, y2: c.y, color: c.color },
      ...collectEdges(c),
    ];
  });
}

export default function OrganizationChart({ isMobile = false, isTablet = false, onNodeClick }: OrganizationChartProps) {
  const [zoom, setZoom] = useState(isMobile ? 0.45 : 0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  // Per-node drag overrides: nodeId -> {x, y}
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNode, setDraggingNode] = useState<{ id: string; startMouse: { x: number; y: number }; startPos: { x: number; y: number } } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { nodes: agentNodes } = useAgentSessions(5000, true);

  const orgData = useMemo(() => ORG_DATA.map(orgNode => {
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
  }), [agentNodes]);

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

  const baseNodes = useMemo(() => positionedTrees.flatMap(collectAll), [positionedTrees]);

  // Apply per-node position overrides
  const allNodes = useMemo(() => baseNodes.map(n => ({
    ...n,
    x: nodeOverrides[n.id]?.x ?? n.x,
    y: nodeOverrides[n.id]?.y ?? n.y,
  })), [baseNodes, nodeOverrides]);

  // Edges always use current (possibly overridden) positions
  const allEdges = useMemo(() => {
    const posMap = Object.fromEntries(allNodes.map(n => [n.id, { x: n.x, y: n.y }]));
    const edges: EdgeInfo[] = [];
    function walk(node: PositionedNode) {
      node.children.forEach(child => {
        const c = child as PositionedNode;
        const pPos = posMap[node.id] ?? { x: node.x, y: node.y };
        const cPos = posMap[c.id] ?? { x: c.x, y: c.y };
        edges.push({ x1: pPos.x + CARD_W / 2, y1: pPos.y + CARD_H, x2: cPos.x + CARD_W / 2, y2: cPos.y, color: c.color });
        walk(c as PositionedNode);
      });
    }
    positionedTrees.forEach(walk);
    return edges;
  }, [allNodes, positionedTrees]);

  const bounds = useMemo(() => {
    if (!allNodes.length) return { minX: 0, minY: 0, maxX: 1200, maxY: 600 };
    return {
      minX: Math.min(...allNodes.map(n => n.x)) - 60,
      minY: Math.min(...allNodes.map(n => n.y)) - 60,
      maxX: Math.max(...allNodes.map(n => n.x)) + CARD_W + 60,
      maxY: Math.max(...allNodes.map(n => n.y)) + CARD_H + 60,
    };
  }, [allNodes]);

  const svgW = bounds.maxX - bounds.minX;
  const svgH = bounds.maxY - bounds.minY;

  const centerView = useCallback((z?: number) => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const newZoom = z ?? zoom;
    setPan({ x: (cw - svgW * newZoom) / 2, y: Math.max(24, (ch - svgH * newZoom) / 2) });
  }, [zoom, svgW, svgH]);

  useEffect(() => { centerView(zoom); }, [svgW, svgH]);

  // Zoom with scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom(z => Math.min(2, Math.max(0.2, z * delta)));
  }, []);

  // Canvas pan (only when not dragging a node)
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (draggingNode) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [draggingNode, pan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode) {
      const dx = (e.clientX - draggingNode.startMouse.x) / zoom;
      const dy = (e.clientY - draggingNode.startMouse.y) / zoom;
      setNodeOverrides(prev => ({
        ...prev,
        [draggingNode.id]: { x: draggingNode.startPos.x + dx, y: draggingNode.startPos.y + dy },
      }));
      return;
    }
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [draggingNode, isPanning, panStart, zoom]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNode(null);
  }, []);

  // Node drag start
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: PositionedNode) => {
    e.stopPropagation();
    setDraggingNode({
      id: node.id,
      startMouse: { x: e.clientX, y: e.clientY },
      startPos: { x: node.x, y: node.y },
    });
  }, []);

  const resetLayout = useCallback(() => {
    setNodeOverrides({});
    const newZoom = isMobile ? 0.45 : 0.7;
    setZoom(newZoom);
    setTimeout(() => centerView(newZoom), 50);
  }, [isMobile, centerView]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: isMobile ? '12px' : '24px', paddingTop: isMobile ? '72px' : '24px', minHeight: isMobile ? 500 : 600 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: isMobile ? 18 : 22, fontWeight: 700, margin: 0 }}>🏢 Organization</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '3px 0 0' }}>
            {allNodes.length} agents · scroll to zoom · drag canvas to pan · drag cards to reposition
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[
            { label: '−', action: () => { const z = Math.max(0.2, zoom - 0.1); setZoom(z); } },
            { label: '⊙', action: resetLayout, title: 'Reset layout' },
            { label: '+', action: () => { const z = Math.min(2, zoom + 0.1); setZoom(z); } },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} title={btn.title}
              style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: btn.label === '⊙' ? 16 : 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {btn.label}
            </button>
          ))}
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, minWidth: 38, textAlign: 'right' }}>{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        style={{
          flex: 1, overflow: 'hidden', borderRadius: 16, position: 'relative',
          background: 'rgba(255,255,255,0.015)',
          border: '1px solid rgba(255,255,255,0.06)',
          cursor: draggingNode ? 'grabbing' : isPanning ? 'grabbing' : 'grab',
          minHeight: isMobile ? 400 : 500,
        }}
      >
        {/* SVG edges layer */}
        <svg style={{ position: 'absolute', left: pan.x, top: pan.y, width: svgW * zoom, height: svgH * zoom, overflow: 'visible', pointerEvents: 'none' }}>
          {allEdges.map((e, i) => {
            const x1 = (e.x1 - bounds.minX) * zoom;
            const y1 = (e.y1 - bounds.minY) * zoom;
            const x2 = (e.x2 - bounds.minX) * zoom;
            const y2 = (e.y2 - bounds.minY) * zoom;
            const midY = (y1 + y2) / 2;
            return (
              <path key={i}
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                stroke={e.color + '60'} strokeWidth={1.5} fill="none"
              />
            );
          })}
        </svg>

        {/* HTML node cards */}
        {allNodes.map(node => {
          const x = pan.x + (node.x - bounds.minX) * zoom;
          const y = pan.y + (node.y - bounds.minY) * zoom;
          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              style={{
                position: 'absolute',
                left: x, top: y,
                transformOrigin: '0 0',
                transform: `scale(${zoom})`,
                width: CARD_W,
                cursor: draggingNode?.id === node.id ? 'grabbing' : 'grab',
                userSelect: 'none',
                transition: draggingNode?.id === node.id ? 'none' : 'box-shadow 0.15s',
                filter: draggingNode?.id === node.id ? `drop-shadow(0 8px 24px ${node.color}50)` : 'none',
                zIndex: draggingNode?.id === node.id ? 100 : 1,
              }}
            >
              <OrgNodeComponent
                node={node}
                onNodeClick={onNodeClick}
                compact={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
