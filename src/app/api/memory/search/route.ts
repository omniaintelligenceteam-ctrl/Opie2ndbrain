import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/node/clawd';
const MEMORY_DIR = path.join(WORKSPACE_ROOT, 'memory');

interface SearchResult {
  file: string;
  path: string;
  matches: {
    line: number;
    text: string;
    context: string;
  }[];
  category: 'daily' | 'chat' | 'knowledge' | 'other';
  modified: string;
}

async function searchFiles(query: string, maxResults = 50): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  
  async function searchDir(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (results.length >= maxResults) return;
      
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip certain directories
        if (['node_modules', '.git', 'archive'].includes(entry.name)) continue;
        await searchDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json'))) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const stats = await fs.stat(fullPath);
          const relativePath = path.relative(MEMORY_DIR, fullPath);
          
          // Search content
          const lines = content.split('\n');
          const matches: SearchResult['matches'] = [];
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(queryLower)) {
              // Get context (line before and after)
              const contextStart = Math.max(0, i - 1);
              const contextEnd = Math.min(lines.length - 1, i + 1);
              const context = lines.slice(contextStart, contextEnd + 1).join('\n');
              
              matches.push({
                line: i + 1,
                text: lines[i].trim().slice(0, 200),
                context: context.slice(0, 400),
              });
              
              if (matches.length >= 5) break; // Max 5 matches per file
            }
          }
          
          if (matches.length > 0) {
            results.push({
              file: entry.name,
              path: relativePath,
              matches,
              category: getCategory(relativePath, entry.name),
              modified: stats.mtime.toISOString(),
            });
          }
        } catch (error) {
          console.error(`Error reading ${fullPath}:`, error);
        }
      }
    }
  }
  
  await searchDir(MEMORY_DIR);
  
  // Also search root workspace md files
  try {
    const rootFiles = ['MEMORY.md', 'SOUL.md', 'USER.md', 'KANBAN.md', 'AGENTS.md'];
    for (const fileName of rootFiles) {
      const fullPath = path.join(WORKSPACE_ROOT, fileName);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const stats = await fs.stat(fullPath);
        
        const lines = content.split('\n');
        const matches: SearchResult['matches'] = [];
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(queryLower)) {
            const contextStart = Math.max(0, i - 1);
            const contextEnd = Math.min(lines.length - 1, i + 1);
            const context = lines.slice(contextStart, contextEnd + 1).join('\n');
            
            matches.push({
              line: i + 1,
              text: lines[i].trim().slice(0, 200),
              context: context.slice(0, 400),
            });
            
            if (matches.length >= 5) break;
          }
        }
        
        if (matches.length > 0) {
          results.push({
            file: fileName,
            path: `../${fileName}`,
            matches,
            category: 'knowledge',
            modified: stats.mtime.toISOString(),
          });
        }
      } catch (e) {
        // File not found, skip
      }
    }
  } catch (e) {
    console.error('Error searching root files:', e);
  }
  
  // Sort by relevance (more matches = higher)
  results.sort((a, b) => b.matches.length - a.matches.length);
  
  return results;
}

function getCategory(relativePath: string, name: string): SearchResult['category'] {
  if (relativePath.startsWith('chat/')) return 'chat';
  if (/^\d{4}-\d{2}-\d{2}/.test(name)) return 'daily';
  if (['knowledge', 'facts', 'context'].some(d => relativePath.startsWith(d + '/'))) return 'knowledge';
  return 'other';
}

export async function POST(req: NextRequest) {
  try {
    const { query, maxResults } = await req.json();
    
    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }
    
    const results = await searchFiles(query, maxResults || 50);
    
    return NextResponse.json({
      query,
      resultCount: results.length,
      results,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  
  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
  }
  
  const results = await searchFiles(query, 50);
  
  return NextResponse.json({
    query,
    resultCount: results.length,
    results,
  });
}
