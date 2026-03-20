import { NextRequest, NextResponse } from 'next/server';

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type ColumnId = 'todo' | 'inprogress' | 'blocked' | 'done';

type Card = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  owner: string;
  ownerEmoji: string;
  dueDate?: string;
  category: string;
  note?: string;
};

type Column = {
  id: ColumnId;
  title: string;
  emoji: string;
  headerColor: string;
  cards: Card[];
};

type BoardState = { columns: Column[] };

const defaultBoard: BoardState = {
  columns: [
    {
      id: 'todo',
      title: 'TO DO',
      emoji: '📥',
      headerColor: '#6b7280',
      cards: [
        { id: 'todo-1', title: 'Gmail OAuth Setup', description: 'Complete OAuth consent + token flow for Gmail integrations.', priority: 'HIGH', owner: 'Wes', ownerEmoji: '👔', category: 'Infrastructure' },
        { id: 'todo-2', title: 'TikTok OAuth in Postiz', description: 'Connect TikTok account authorization flow in Postiz.', priority: 'MEDIUM', owner: 'Wes', ownerEmoji: '👔', category: 'Content' },
        { id: 'todo-3', title: 'Email forwarding to G', description: 'Set forwarding rules and test message relay reliability.', priority: 'MEDIUM', owner: 'Wes', ownerEmoji: '👔', category: 'Infrastructure' },
        { id: 'todo-4', title: 'Google client secret rotation', description: 'Rotate keys and rebind app credentials for all dependent services.', priority: 'HIGH', owner: 'Wes', ownerEmoji: '👔', category: 'Security' },
      ],
    },
    {
      id: 'inprogress',
      title: 'IN PROGRESS',
      emoji: '🔨',
      headerColor: '#3b82f6',
      cards: [
        { id: 'inprogress-1', title: '2nd Brain Dashboard Rebuild', description: 'Rebuild the Ops Center tabbed dashboard architecture.', priority: 'HIGH', owner: 'G', ownerEmoji: '🧠', category: 'Product' },
        { id: 'inprogress-2', title: 'Cron Error Remediation', description: 'Identify timeout patterns and stabilize failing cron routines.', priority: 'HIGH', owner: 'G', ownerEmoji: '🧠', category: 'Infrastructure' },
        { id: 'inprogress-3', title: 'Lead Pipeline (Scout)', description: 'Improve lead extraction + dedupe + ranking cadence.', priority: 'MEDIUM', owner: 'Scout', ownerEmoji: '🛰️', category: 'Sales' },
      ],
    },
    {
      id: 'blocked',
      title: 'BLOCKED',
      emoji: '⏳',
      headerColor: '#f59e0b',
      cards: [
        { id: 'blocked-1', title: 'OIOS Demo Redeploy', description: 'Restore demo endpoint and validate post-deploy uptime.', priority: 'HIGH', owner: 'G', ownerEmoji: '🧠', category: 'Infrastructure', note: 'Vercel 404 since Mar 13 — needs Wes' },
        { id: 'blocked-2', title: 'Kenny @ Redwoods Follow-up', description: 'Owner handoff required before outreach can proceed.', priority: 'HIGH', owner: 'Wes', ownerEmoji: '👔', category: 'Sales' },
        { id: 'blocked-3', title: 'Jessica Patton', description: 'Contact loop exists but detail packet is incomplete.', priority: 'MEDIUM', owner: 'Wes', ownerEmoji: '👔', category: 'Unknown', note: 'No details provided' },
      ],
    },
    {
      id: 'done',
      title: 'DONE',
      emoji: '✅',
      headerColor: '#22c55e',
      cards: [
        { id: 'done-1', title: 'Orchestration Tab', description: 'Delivered organization chart tab with hierarchy view.', priority: 'HIGH', owner: 'G', ownerEmoji: '🧠', category: 'Product' },
        { id: 'done-2', title: 'Agent Roster Update (12 agents)', description: 'Roster refreshed to the current 12-agent operating model.', priority: 'MEDIUM', owner: 'G', ownerEmoji: '🧠', category: 'Product' },
        { id: 'done-3', title: 'Soul Guardian Baselines', description: 'Baselines initialized and heartbeat check validated.', priority: 'LOW', owner: 'G', ownerEmoji: '🧠', category: 'Infrastructure' },
      ],
    },
  ],
};

let inMemoryBoard: BoardState = defaultBoard;

export async function GET() {
  return NextResponse.json(inMemoryBoard);
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    if (!payload || !Array.isArray(payload.columns)) {
      return NextResponse.json({ error: 'Invalid board state. Expected { columns: [] }' }, { status: 400 });
    }

    inMemoryBoard = payload as BoardState;
    return NextResponse.json({ ok: true, board: inMemoryBoard });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
}
