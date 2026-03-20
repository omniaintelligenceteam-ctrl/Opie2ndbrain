'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ORG_DATA, OrgNode, OrgNodeWithChildren, buildOrgTree } from '../../types/org';
import OrgNodeComponent from './OrgNode';
import { useAgentSessions } from '../../hooks/useAgentSessions';

interface OrganizationChartProps {
  isMobile?: boolean;
  isTablet?: boolean;
  onNodeClick?: (node: OrgNode) => void;
}

const CARD_W = 280;
const CARD_H = 180;
const H_GAP = 40;
const V_GAP = 80;

const RESIZE_STORAGE_KEY = 'organization-chart-size-v1';
const MIN_PANEL_WIDTH = 400;
const MIN_PANEL_HEIGHT = 300;

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
type ResizeDirection = 'right' | 'bottom' | 'corner';

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
  const [panelSize, setPanelSize] = useState<{ width: number; height: number } | null>(null);
  const [activeResize, setActiveResize] = useState<ResizeDirection | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ dir: ResizeDirection; startX: number; startY: number; startW: number; startH: number } | null>(null);
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
      setHasUnsaved(true);
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

  // Load saved size from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RESIZE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.width >= MIN_PANEL_WIDTH && parsed.height >= MIN_PANEL_HEIGHT) {
          setPanelSize(parsed);
        }
      }
    } catch {}
  }, []);

  // Resize handlers
  const startResize = useCallback((e: React.MouseEvent, dir: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    resizeRef.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
    };
    setActiveResize(dir);

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const { dir: d, startX, startY, startW, startH } = resizeRef.current;
      const maxW = window.innerWidth - 80;
      const maxH = window.innerHeight - 120;
      let newW = panelSize?.width ?? startW;
      let newH = panelSize?.height ?? startH;
      if (d === 'right' || d === 'corner') {
        newW = Math.max(MIN_PANEL_WIDTH, Math.min(maxW, startW + (ev.clientX - startX)));
      }
      if (d === 'bottom' || d === 'corner') {
        newH = Math.max(MIN_PANEL_HEIGHT, Math.min(maxH, startH + (ev.clientY - startY)));
      }
      setPanelSize({ width: newW, height: newH });
      setHasUnsaved(true);
    };

    const onUp = () => {
      resizeRef.current = null;
      setActiveResize(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelSize]);

  const saveLayout = useCallback(() => {
    try {
      if (panelSize) localStorage.setItem(RESIZE_STORAGE_KEY, JSON.stringify(panelSize));
      localStorage.setItem('org-chart-node-overrides', JSON.stringify(nodeOverrides));
      localStorage.setItem('org-chart-zoom', String(zoom));
      localStorage.setItem('org-chart-pan', JSON.stringify(pan));
    } catch {}
    setHasUnsaved(false);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }, [panelSize, nodeOverrides, zoom, pan]);

  // Load saved node overrides, zoom, pan on mount
  useEffect(() => {
    try {
      const savedOverrides = localStorage.getItem('org-chart-node-overrides');
      if (savedOverrides) setNodeOverrides(JSON.parse(savedOverrides));
      const savedZoom = localStorage.getItem('org-chart-zoom');
      if (savedZoom) setZoom(parseFloat(savedZoom));
      const savedPan = localStorage.getItem('org-chart-pan');
      if (savedPan) setPan(JSON.parse(savedPan));
    } catch {}
  }, []);

  const resetLayout = useCallback(() => {
    setNodeOverrides({});
    setPanelSize(null);
    setHasUnsaved(false);
    try {
      localStorage.removeItem(RESIZE_STORAGE_KEY);
      localStorage.removeItem('org-chart-node-overrides');
      localStorage.removeItem('org-chart-zoom');
      localStorage.removeItem('org-chart-pan');
    } catch {}
    const newZoom = isMobile ? 0.45 : 0.7;
    setZoom(newZoom);
    setTimeout(() => centerView(newZoom), 50);
  }, [isMobile, centerView]);

  // Grip dot style for resize handles
  const gripDots = (vertical: boolean) => {
    const dots = [];
    for (let i = 0; i < 3; i++) {
      dots.push(
        <span key={i} style={{
          display: 'block',
          width: 3, height: 3,
          borderRadius: '50%',
          background: activeResize ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.25)',
          margin: vertical ? '2px 0' : '0 2px',
          transition: 'background 0.15s',
        }} />
      );
    }
    return dots;
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      padding: isMobile ? '12px' : '24px', paddingTop: isMobile ? '72px' : '24px',
      ...(panelSize ? { width: panelSize.width, height: panelSize.height } : { height: '100%', minHeight: isMobile ? 500 : 600 }),
      position: 'relative',
    }}>
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
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          <button
            onClick={saveLayout}
            title="Save current layout"
            style={{
              height: 34, paddingInline: 12, borderRadius: 8,
              background: saveFlash ? 'rgba(34,197,94,0.25)' : hasUnsaved ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${saveFlash ? 'rgba(34,197,94,0.5)' : hasUnsaved ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.12)'}`,
              color: saveFlash ? '#22c55e' : '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.2s',
            }}
          >
            {saveFlash ? '✓ Saved' : hasUnsaved ? '💾 Save' : '💾'}
          </button>
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

      {/* Right resize handle */}
      <div
        onMouseDown={(e) => startResize(e, 'right')}
        style={{
          position: 'absolute', right: 0, top: '20%', height: '60%', width: 12,
          cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', borderRadius: '0 8px 8px 0', zIndex: 10,
          background: activeResize === 'right' ? 'rgba(99,102,241,0.15)' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.1)'; }}
        onMouseLeave={(e) => { if (activeResize !== 'right') (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        {gripDots(true)}
      </div>

      {/* Bottom resize handle */}
      <div
        onMouseDown={(e) => startResize(e, 'bottom')}
        style={{
          position: 'absolute', bottom: 0, left: '20%', width: '60%', height: 12,
          cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '0 0 8px 8px', zIndex: 10,
          background: activeResize === 'bottom' ? 'rgba(99,102,241,0.15)' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.1)'; }}
        onMouseLeave={(e) => { if (activeResize !== 'bottom') (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        {gripDots(false)}
      </div>

      {/* Corner resize handle (bottom-right) */}
      <div
        onMouseDown={(e) => startResize(e, 'corner')}
        style={{
          position: 'absolute', bottom: 0, right: 0, width: 20, height: 20,
          cursor: 'nwse-resize', borderRadius: '0 0 8px 0', zIndex: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: activeResize === 'corner' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.15)'; }}
        onMouseLeave={(e) => { if (activeResize !== 'corner') (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: 0.4 }}>
          <line x1="9" y1="1" x2="1" y2="9" stroke="white" strokeWidth="1.5" />
          <line x1="9" y1="5" x2="5" y2="9" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}
