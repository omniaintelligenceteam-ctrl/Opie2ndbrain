import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/node/clawd';

// Important workspace files and directories
const IMPORTANT_FILES = [
  'MEMORY.md',
  'AGENTS.md', 
  'SOUL.md',
  'USER.md',
  'KANBAN.md',
  'TOOLS.md',
  'ORCHESTRATOR.md',
  'SKILL_INDEX.md',
  'HEARTBEAT.md',
];

const BROWSEABLE_DIRS = [
  'memory',
  'agents',
  'tools',
  'skills',
  'projects',
];

export interface WorkspaceFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  important?: boolean;
}

async function listDirectory(dir: string): Promise<WorkspaceFile[]> {
  const files: WorkspaceFile[] = [];
  const fullDir = path.join(WORKSPACE_ROOT, dir);
  
  // Security check
  const resolved = path.resolve(fullDir);
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error('Invalid directory');
  }
  
  try {
    const entries = await fs.readdir(fullDir, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip hidden files and common excludes
      if (entry.name.startsWith('.') || 
          entry.name === 'node_modules' ||
          entry.name === '__pycache__') {
        continue;
      }
      
      const fullPath = path.join(fullDir, entry.name);
      const relativePath = path.relative(WORKSPACE_ROOT, fullPath);
      
      if (entry.isDirectory()) {
        files.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
        });
      } else if (entry.isFile()) {
        // Only show relevant files
        const ext = path.extname(entry.name).toLowerCase();
        if (['.md', '.json', '.ts', '.tsx', '.js', '.jsx', '.yaml', '.yml', '.txt'].includes(ext)) {
          const stats = await fs.stat(fullPath);
          files.push({
            name: entry.name,
            path: relativePath,
            type: 'file',
            size: stats.size,
            modified: stats.mtime.toISOString(),
          });
        }
      }
    }
    
    // Sort: directories first, then alphabetically
    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    
    return files;
  } catch (error) {
    console.error('Error listing directory:', error);
    return [];
  }
}

async function readFile(filePath: string): Promise<string> {
  const fullPath = path.join(WORKSPACE_ROOT, filePath);
  
  // Security check
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error('Invalid path');
  }
  
  const stats = await fs.stat(fullPath);
  
  // Limit file size to 500KB
  if (stats.size > 500 * 1024) {
    const content = await fs.readFile(fullPath, 'utf-8');
    return content.slice(0, 500 * 1024) + '\n\n... [File truncated at 500KB]';
  }
  
  return fs.readFile(fullPath, 'utf-8');
}

async function getImportantFiles(): Promise<WorkspaceFile[]> {
  const files: WorkspaceFile[] = [];
  
  for (const fileName of IMPORTANT_FILES) {
    const fullPath = path.join(WORKSPACE_ROOT, fileName);
    try {
      const stats = await fs.stat(fullPath);
      files.push({
        name: fileName,
        path: fileName,
        type: 'file',
        size: stats.size,
        modified: stats.mtime.toISOString(),
        important: true,
      });
    } catch (e) {
      // File doesn't exist, skip
    }
  }
  
  return files;
}

async function getBrowseableDirs(): Promise<WorkspaceFile[]> {
  const dirs: WorkspaceFile[] = [];
  
  for (const dirName of BROWSEABLE_DIRS) {
    const fullPath = path.join(WORKSPACE_ROOT, dirName);
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        dirs.push({
          name: dirName,
          path: dirName,
          type: 'directory',
        });
      }
    } catch (e) {
      // Directory doesn't exist, skip
    }
  }
  
  return dirs;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dir = searchParams.get('dir');
  const file = searchParams.get('file');
  const overview = searchParams.get('overview');
  
  // Get workspace overview (important files + browseable dirs)
  if (overview === 'true') {
    const importantFiles = await getImportantFiles();
    const browseableDirs = await getBrowseableDirs();
    
    return NextResponse.json({
      importantFiles,
      browseableDirs,
    });
  }
  
  // Read file content
  if (file) {
    try {
      const content = await readFile(file);
      return NextResponse.json({ content, path: file });
    } catch (error) {
      return NextResponse.json({ error: 'File not found or inaccessible' }, { status: 404 });
    }
  }
  
  // List directory
  if (dir !== null) {
    try {
      const files = await listDirectory(dir || '');
      return NextResponse.json({
        files,
        currentDir: dir || '/',
        parent: dir ? path.dirname(dir) : null,
      });
    } catch (error) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }
  }
  
  // Default: return workspace overview
  const importantFiles = await getImportantFiles();
  const browseableDirs = await getBrowseableDirs();
  
  return NextResponse.json({
    importantFiles,
    browseableDirs,
  });
}
