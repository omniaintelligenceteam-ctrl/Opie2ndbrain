import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPIE_GATEWAY_URL || process.env.MOLTBOT_GATEWAY_URL || 'http://localhost:18100';
const GATEWAY_TOKEN = process.env.OPIE_GATEWAY_TOKEN || process.env.MOLTBOT_GATEWAY_TOKEN || '';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'task';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionLabel?: string;
  agentId?: string;
  agentEmoji?: string;
}

// In-memory notification store (would be replaced with database in production)
let notificationStore: Notification[] = [];
let lastActivityCheck = Date.now();

async function checkForNewActivity(): Promise<Notification[]> {
  const newNotifs: Notification[] = [];
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
    };
    
    // Check gateway for recent activity
    const params = new URLSearchParams();
    params.set('since', new Date(lastActivityCheck).toISOString());
    
    const res = await fetch(`${GATEWAY_URL}/v1/activity?${params.toString()}`, { headers });
    
    if (res.ok) {
      const data = await res.json();
      const activities = data.activities || data.events || [];
      
      // Convert activities to notifications
      for (const activity of activities) {
        if (activity.type === 'task_complete') {
          newNotifs.push({
            id: `notif-${activity.id || Date.now()}`,
            type: 'success',
            title: 'Task Completed',
            message: activity.title || 'A task has been completed',
            timestamp: activity.timestamp || new Date().toISOString(),
            read: false,
            priority: 'medium',
            agentId: activity.agentId,
            agentEmoji: activity.agentEmoji,
          });
        } else if (activity.type === 'task_failed' || activity.type === 'error') {
          newNotifs.push({
            id: `notif-${activity.id || Date.now()}`,
            type: 'error',
            title: 'Task Failed',
            message: activity.title || 'A task has failed',
            timestamp: activity.timestamp || new Date().toISOString(),
            read: false,
            priority: 'high',
            agentId: activity.agentId,
            agentEmoji: activity.agentEmoji,
          });
        } else if (activity.type === 'reminder') {
          newNotifs.push({
            id: `notif-${activity.id || Date.now()}`,
            type: 'info',
            title: activity.title || 'Reminder',
            message: activity.description || '',
            timestamp: activity.timestamp || new Date().toISOString(),
            read: false,
            priority: 'medium',
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking for activity:', error);
  }
  
  lastActivityCheck = Date.now();
  return newNotifs;
}

// GET /api/notifications - Get notifications
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  
  // Check for new activity-based notifications
  const newNotifs = await checkForNewActivity();
  if (newNotifs.length > 0) {
    notificationStore = [...newNotifs, ...notificationStore].slice(0, 100);
  }
  
  // Filter and return
  let notifications = notificationStore;
  if (unreadOnly) {
    notifications = notifications.filter(n => !n.read);
  }
  
  return NextResponse.json({
    notifications: notifications.slice(0, limit),
    unreadCount: notificationStore.filter(n => !n.read).length,
    total: notificationStore.length,
  });
}

// POST /api/notifications - Create a notification
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: body.type || 'info',
      title: body.title,
      message: body.message || '',
      timestamp: new Date().toISOString(),
      read: false,
      priority: body.priority || 'medium',
      actionUrl: body.actionUrl,
      actionLabel: body.actionLabel,
      agentId: body.agentId,
      agentEmoji: body.agentEmoji,
    };
    
    notificationStore = [notification, ...notificationStore].slice(0, 100);
    
    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { ids, markAll } = body;
    
    if (markAll) {
      notificationStore = notificationStore.map(n => ({ ...n, read: true }));
    } else if (ids && Array.isArray(ids)) {
      const idSet = new Set(ids);
      notificationStore = notificationStore.map(n => 
        idSet.has(n.id) ? { ...n, read: true } : n
      );
    }
    
    return NextResponse.json({ 
      success: true,
      unreadCount: notificationStore.filter(n => !n.read).length,
    });
  } catch (error) {
    console.error('Failed to update notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}

// DELETE /api/notifications - Clear notifications
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (id) {
    notificationStore = notificationStore.filter(n => n.id !== id);
  } else {
    notificationStore = [];
  }
  
  return NextResponse.json({ success: true });
}
