// =============================================================================
// Observability — Fire-and-forget event emission to the observability dashboard
// =============================================================================
// Emits OpenClaw agent lifecycle events (spawn, progress, complete, fail)
// to the multi-agent observability server for real-time monitoring.

const OBSERVABILITY_SERVER_URL = process.env.OBSERVABILITY_SERVER_URL || 'http://localhost:4000'
const OBSERVABILITY_ENABLED = process.env.OBSERVABILITY_ENABLED !== 'false'

export function emitEvent(
  eventType: string,
  sessionId: string,
  payload: Record<string, unknown>,
  extra?: { agent_id?: string; agent_type?: string }
): void {
  if (!OBSERVABILITY_ENABLED) return

  fetch(`${OBSERVABILITY_SERVER_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_app: 'opie-openclaw',
      session_id: sessionId,
      hook_event_type: eventType,
      payload,
      timestamp: Date.now(),
      ...extra,
    }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {}) // Silent failure — observability never blocks the app
}
