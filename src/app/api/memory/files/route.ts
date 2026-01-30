import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/node/clawd';
const MEMORY_DIR = path.join(WORKSPACE_ROOT, 'memory');

export interface MemoryFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  category?: 'daily' | 'chat' | 'knowledge' | 'archive' | 'other';
}

async function listMemoryFiles(dir: string, category?: string): Promise<MemoryFile[]> {
  const files: MemoryFile[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(MEMORY_DIR, fullPath);
      
      if (entry.isDirectory()) {
        files.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
          category: getCategoryForDir(entry.name),
        });
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json'))) {
        const stats = await fs.stat(fullPath);
        files.push({
          name: entry.name,
          path: relativePath,
          type: 'file',
          size: stats.size,
          modified: stats.mtime.toISOString(),
          category: getCategoryForFile(relativePath, entry.name),
        });
      }
    }
    
    // Sort: directories first, then by name
    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    
    return files;
  } catch (error) {
    console.error('Error listing memory files:', error);
    return [];
  }
}

function getCategoryForDir(name: string): MemoryFile['category'] {
  if (name === 'chat') return 'chat';
  if (name === 'archive') return 'archive';
  if (['knowledge', 'facts', 'context'].includes(name)) return 'knowledge';
  return 'other';
}

function getCategoryForFile(relativePath: string, name: string): MemoryFile['category'] {
  if (relativePath.startsWith('chat/')) return 'chat';
  if (relativePath.startsWith('archive/')) return 'archive';
  if (/^\d{4}-\d{2}-\d{2}/.test(name)) return 'daily';
  if (['knowledge', 'facts', 'context'].some(d => relativePath.startsWith(d + '/'))) return 'knowledge';
  return 'other';
}

async function readFileContent(filePath: string): Promise<string> {
  const fullPath = path.join(MEMORY_DIR, filePath);
  
  // Security: ensure path is within memory dir
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(MEMORY_DIR)) {
    throw new Error('Invalid path');
  }
  
  return fs.readFile(fullPath, 'utf-8');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subdir = searchParams.get('dir') || '';
  const file = searchParams.get('file');
  const category = searchParams.get('category');
  
  // If requesting file content
  if (file) {
    try {
      const content = await readFileContent(file);
      return NextResponse.json({ content, path: file });
    } catch (error) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  }
  
  // List files
  const targetDir = path.join(MEMORY_DIR, subdir);
  
  // Security check
  const resolved = path.resolve(targetDir);
  if (!resolved.startsWith(MEMORY_DIR)) {
    return NextResponse.json({ error: 'Invalid directory' }, { status: 400 });
  }
  
  const files = await listMemoryFiles(resolved, category || undefined);
  
  // Get daily notes (root level dated files)
  const dailyNotes: MemoryFile[] = [];
  if (!subdir) {
    try {
      const rootEntries = await fs.readdir(MEMORY_DIR, { withFileTypes: true });
      for (const entry of rootEntries) {
        if (entry.isFile() && /^\d{4}-\d{2}-\d{2}.*\.md$/.test(entry.name)) {
          const stats = await fs.stat(path.join(MEMORY_DIR, entry.name));
          dailyNotes.push({
            name: entry.name,
            path: entry.name,
            type: 'file',
            size: stats.size,
            modified: stats.mtime.toISOString(),
            category: 'daily',
          });
        }
      }
      dailyNotes.sort((a, b) => b.name.localeCompare(a.name)); // Most recent first
    } catch (e) {
      console.error('Error reading daily notes:', e);
    }
  }
  
  return NextResponse.json({
    files,
    dailyNotes: !subdir ? dailyNotes : undefined,
    currentDir: subdir || '/',
  });
}
