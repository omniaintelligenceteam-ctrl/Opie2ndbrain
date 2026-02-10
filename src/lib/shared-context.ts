// Shared Context Bridge
// Syncs conversation context between Dashboard and Telegram sessions
// Uses Supabase as the shared state store

import { supabaseAdmin } from './supabase';

export interface SharedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  source: 'dashboard' | 'telegram';
  created_at: string;
  session_id: string;
}

// Default shared session ID - links dashboard to main Telegram session
const SHARED_SESSION_ID = 'wes-main-session';

/**
 * Save a message to shared context
 */
export async function saveToSharedContext(
  message: Omit<SharedMessage, 'id' | 'created_at'>
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('shared_conversations')
      .insert({
        role: message.role,
        content: message.content,
        source: message.source,
        session_id: message.session_id || SHARED_SESSION_ID,
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('[SharedContext] Save error:', error);
    }
  } catch (err) {
    console.error('[SharedContext] Save failed:', err);
  }
}

/**
 * Load recent shared context (last N messages from both sources)
 */
export async function loadSharedContext(
  limit: number = 20,
  sessionId: string = SHARED_SESSION_ID
): Promise<SharedMessage[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('shared_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[SharedContext] Load error:', error);
      return [];
    }
    
    // Return in chronological order
    return (data || []).reverse();
  } catch (err) {
    console.error('[SharedContext] Load failed:', err);
    return [];
  }
}

/**
 * Format shared context as a system message for the AI
 */
export async function getSharedContextPrompt(
  limit: number = 10
): Promise<string> {
  const messages = await loadSharedContext(limit);
  
  if (messages.length === 0) {
    return '';
  }
  
  const formatted = messages.map(m => {
    const source = m.source === 'telegram' ? '📱 Telegram' : '💻 Dashboard';
    return `[${source}] ${m.role}: ${m.content.slice(0, 500)}${m.content.length > 500 ? '...' : ''}`;
  }).join('\n');
  
  return `\n\n[SHARED CONTEXT - Recent conversation across platforms]\n${formatted}\n[END SHARED CONTEXT]\n`;
}

/**
 * Clear shared context (for testing or reset)
 */
export async function clearSharedContext(
  sessionId: string = SHARED_SESSION_ID
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('shared_conversations')
      .delete()
      .eq('session_id', sessionId);
    
    if (error) {
      console.error('[SharedContext] Clear error:', error);
    }
  } catch (err) {
    console.error('[SharedContext] Clear failed:', err);
  }
}
