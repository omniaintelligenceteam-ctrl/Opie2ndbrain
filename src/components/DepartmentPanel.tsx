'use client';
import React, { useState } from 'react';
import { useAgentSessions } from '@/hooks/useAgentSessions';

interface Department {
  id: string;
  name: string;
  title: string;
  emoji: string;
  color: string;
  role: string;
  owns: string;
  workers: Worker[];
}

interface Worker {
  id: string;
  name: string;
  emoji: string;
  role: string;
}

const DEPARTMENTS: Department[] = [
  {
    id: 'elon',
    name: 'Elon Musk',
    title: 'CTO \u2014 Infra & Systems',
    emoji: '\U0001f680',
    color: '#06b6d4',
    role: 'Owns all technical infrastructure: plugins, crons, skills, server health, security.',
    owns: 'Infra',
    workers: [
      { id: 'ops-guardian', name: 'Ops Guardian', emoji: '\U0001f6e1\ufe0f', role: 'File ops, configs, infra changes' },
      { id: 'analyst', name: 'Analyst', emoji: '\U0001f4ca', role: 'Research, monitoring, deep dives' },
      { id: 'research', name: 'Research', emoji: '\U0001f50d', role: 'Competitive intel, market research' },
    ]
  },
  {
    id: 'gary',
    name: 'Gary Vaynerchuk',
    title: 'CMO \u2014 Marketing & Content',
    emoji: '\U0001f4e3',
    color: '#f97316',
    role: 'Owns all marketing, content, brand voice, and social.',
    owns: 'Marketing',
    workers: [
      { id: 'content-writer', name: 'Content Writer', emoji: '\u270d\ufe0f', role: 'Emails, copy, social posts, scripts' },
      { id: 'analyst', name: 'Analyst', emoji: '\U0001f4ca', role: 'Market research, audience analysis' },
    ]
  },
  {
    id: 'warren',
    name: 'Warren Buffett',
    title: 'CRO \u2014 Revenue & Deals',
    emoji: '\U0001f4b0',
    color: '#22c55e',
    role: 'Owns all revenue: leads, pipeline, outreach, proposals, and deal closing.',
    owns: 'Revenue',
    workers: [
      { id: 'scout', name: 'Scout', emoji: '\U0001f50d', role: 'Lead generation from job boards' },
      { id: 'outreach', name: 'Outreach', emoji: '\U0001f4e7', role: 'Cold/warm email sequences' },
      { id: 'call-debrief', name: 'Call Debrief', emoji: '\U0001f4de', role: 'Call transcript analysis + lead scoring' },
    ]
  },
];

export default function DepartmentPanel() {
  const [expanded, setExpanded] = useState<string | null>('warren');
  const { nodes } = useAgentSessions(3000);

  function getNodeStatus(id: string) {
    const node = nodes.find(n => n.id === id);
    return node?.status || 'idle';
  }

  function StatusDot({ id }: { id: string }) {
    const status = getNodeStatus(id);
    const color = status === 'working' ? '#f59e0b' : status === 'connected' ? '#22c55e' : 'rgba(255,255,255,0.2)';
    return (
      <span style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: color, marginRight: 6,
        boxShadow: status === 'working' ? `0 0 8px ${color}` : 'none',
      }} />
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>
          \U0001f3e2 Department Command Center
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '6px 0 0' }}>
          Wes \u2192 G (Orchestrator) \u2192 Department Heads \u2192 Workers
        </p>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.1))',
        border: '1px solid rgba(102,126,234,0.3)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
          boxShadow: '0 0 20px rgba(102,126,234,0.4)',
        }}>\U0001f916</div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>G \u2014 Orchestrator</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            Routes tasks to the right department. You talk to G, G delegates down the chain.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {DEPARTMENTS.map(dept => {
          const isOpen = expanded === dept.id;
          return (
            <div key={dept.id} style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${isOpen ? dept.color + '50' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 14, overflow: 'hidden',
            }}>
              <div
                onClick={() => setExpanded(isOpen ? null : dept.id)}
                style={{
                  padding: '18px 24px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: isOpen ? `linear-gradient(135deg, ${dept.color}10, transparent)` : 'transparent',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: `${dept.color}20`, border: `2px solid ${dept.color}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>{dept.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{dept.name}</div>
                  <div style={{ color: dept.color, fontSize: 12, marginTop: 2 }}>{dept.title}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: `${dept.color}20`, color: dept.color,
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  }}>{dept.owns}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>
                    {isOpen ? '\u25b2' : '\u25bc'}
                  </span>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '0 24px 24px', borderTop: `1px solid ${dept.color}20` }}>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '16px 0' }}>
                    {dept.role}
                  </p>
                  <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 10, letterSpacing: 1 }}>
                    WORKERS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dept.workers.map(worker => (
                      <div key={worker.id} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10, padding: '12px 16px',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <span style={{ fontSize: 18 }}>{worker.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{worker.name}</div>
                          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{worker.role}</div>
                        </div>
                        <StatusDot id={worker.id} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
