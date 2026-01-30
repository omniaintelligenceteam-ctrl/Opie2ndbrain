import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const MEMORY_DIR = process.env.MEMORY_DIR || '/home/node/clawd/memory';

interface RecentMemory {
  id: string;
  title: string;
  type: 'file' | 'conversation' | 'note' | 'task';
  path?: string;
  timestamp: string;
  preview?: string;
}

async function getRecentMemoryFiles(limit: number): Promise<RecentMemory[]> {
  const memories: RecentMemory[] = [];
  
  try {
    // Check if memory directory exists
    await fs.access(MEMORY_DIR);
    
    // Read all files in memory directory
    const entries = await fs.readdir(MEMORY_DIR, { withFileTypes: true });
    
    // Get file stats and sort by modification time
    const fileStats = await Promise.all(
      entries
        .filter(e => e.isFile() && e.name.endsWith('.md'))
        .map(async (entry) => {
          const filePath = path.join(MEMORY_DIR, entry.name);
          const stat = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8').catch(() => '');
          const firstLine = content.split('\n').find(line => line.trim() && !line.startsWith('#')) || '';
          
          return {
            name: entry.name,
            path: filePath,
            mtime: stat.mtime,
            preview: firstLine.slice(0, 100),
          };
        })
    );
    
    // Sort by modification time (most recent first)
    fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    // Convert to RecentMemory format
    for (const file of fileStats.slice(0, limit)) {
      const isDateFile = /^\d{4}-\d{2}-\d{2}\.md$/.test(file.name);
      const isChatFile = file.path.includes('/chat/');
      
      memories.push({
        id: file.name.replace('.md', ''),
        title: file.name.replace('.md', ''),
        type: isDateFile ? 'note' : isChatFile ? 'conversation' : 'file',
        path: file.path,
        timestamp: file.mtime.toISOString(),
        preview: file.preview,
      });
    }
    
    // Also check chat subdirectory
    const chatDir = path.join(MEMORY_DIR, 'chat');
    try {
      await fs.access(chatDir);
      const chatEntries = await fs.readdir(chatDir, { withFileTypes: true });
      
      const chatStats = await Promise.all(
        chatEntries
          .filter(e => e.isFile() && e.name.endsWith('.md'))
          .map(async (entry) => {
            const filePath = path.join(chatDir, entry.name);
            const stat = await fs.stat(filePath);
            return {
              name: `chat/${entry.name}`,
              path: filePath,
              mtime: stat.mtime,
              preview: `Chat log from ${entry.name.replace('.md', '')}`,
            };
          })
      );
      
      for (const file of chatStats) {
        memories.push({
          id: file.name,
          title: file.name.replace('.md', '').replace('chat/', 'Chat: '),
          type: 'conversation',
          path: file.path,
          timestamp: file.mtime.toISOString(),
          preview: file.preview,
        });
      }
    } catch {
      // Chat directory doesn't exist
    }
    
    // Re-sort all memories by timestamp
    memories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return memories.slice(0, limit);
    
  } catch (error) {
    console.error('Failed to read memory directory:', error);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  
  const memories = await getRecentMemoryFiles(Math.min(limit, 50));
  
  return NextResponse.json({
    memories,
    timestamp: new Date().toISOString(),
  });
}
