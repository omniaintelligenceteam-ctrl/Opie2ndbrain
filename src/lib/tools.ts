// Server-side tools for DO IT mode
// These execute on the server and return results to the AI

import { createClient } from '@supabase/supabase-js';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any) => Promise<any>;
}

// Web search via Brave
async function webSearch(args: { query: string; count?: number }) {
  const { query, count = 5 } = args;
  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
      {
        headers: {
          'X-Subscription-Token': process.env.BRAVE_API_KEY || '',
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      return { error: `Search failed: ${response.status}` };
    }
    
    const data = await response.json();
    return {
      results: data.web?.results?.map((r: any) => ({
        title: r.title,
        url: r.url,
        description: r.description,
      })) || [],
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Search failed' };
  }
}

// Memory search
async function memorySearch(args: { query: string; limit?: number }) {
  const { query, limit = 5 } = args;
  try {
    // Call memory server
    const response = await fetch(
      `${process.env.MEMORY_SERVER_URL || 'http://localhost:3456'}/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    
    if (!response.ok) {
      return { error: 'Memory search failed' };
    }
    
    const data = await response.json();
    return { results: data.results || [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Memory search failed' };
  }
}

// Read file from workspace
async function fileRead(args: { path: string }) {
  const { path } = args;
  try {
    // Security: only allow reading from workspace
    if (path.includes('..') || path.startsWith('/')) {
      return { error: 'Invalid path - must be relative to workspace' };
    }
    
    const fs = require('fs').promises;
    const fullPath = `/root/.openclaw/workspace/${path}`;
    const content = await fs.readFile(fullPath, 'utf-8');
    return { content: content.slice(0, 10000) }; // Limit to 10KB
  } catch (error) {
    return { error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// List files in directory
async function fileList(args: { path?: string }) {
  const { path = '' } = args;
  try {
    if (path.includes('..') || path.startsWith('/')) {
      return { error: 'Invalid path' };
    }
    
    const fs = require('fs').promises;
    const fullPath = `/root/.openclaw/workspace/${path}`;
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    
    return {
      files: entries
        .filter((e: any) => e.isFile())
        .map((e: any) => e.name),
      directories: entries
        .filter((e: any) => e.isDirectory())
        .map((e: any) => e.name),
    };
  } catch (error) {
    return { error: `Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Execute shell command (restricted)
async function shellExec(args: { command: string; cwd?: string }) {
  const { command, cwd = '/root/.openclaw/workspace' } = args;
  
  // Security: whitelist safe commands only
  const allowedCommands = ['ls', 'cat', 'grep', 'find', 'head', 'tail', 'wc', 'git status', 'git log'];
  const isAllowed = allowedCommands.some(cmd => command.trim().startsWith(cmd));
  
  if (!isAllowed) {
    return { error: 'Command not allowed for security. Allowed: ls, cat, grep, find, head, tail, wc, git status, git log' };
  }
  
  try {
    const { execSync } = require('child_process');
    const result = execSync(command, { 
      cwd, 
      encoding: 'utf-8',
      timeout: 10000,
      maxBuffer: 1024 * 1024, // 1MB
    });
    return { output: result.slice(0, 5000) }; // Limit output
  } catch (error: any) {
    return { error: `Command failed: ${error.message}`, output: error.stdout || '' };
  }
}

// Read file from GitHub
async function githubReadFile(args: { owner: string; repo: string; path: string; ref?: string }) {
  const { owner, repo, path, ref = 'main' } = args;
  const githubToken = process.env.GITHUB_TOKEN;
  
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
      { headers }
    );
    
    if (!response.ok) {
      return { error: `GitHub API error: ${response.status}` };
    }
    
    const data = await response.json();
    
    if (data.type !== 'file') {
      return { error: 'Path is not a file (it may be a directory)' };
    }
    
    // Content is base64 encoded
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { 
      content: content.slice(0, 10000), // Limit to 10KB
      name: data.name,
      path: data.path,
      size: data.size,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'GitHub request failed' };
  }
}

// List directory in GitHub repo
async function githubListRepo(args: { owner: string; repo: string; path?: string; ref?: string }) {
  const { owner, repo, path = '', ref = 'main' } = args;
  const githubToken = process.env.GITHUB_TOKEN;
  
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
      { headers }
    );
    
    if (!response.ok) {
      return { error: `GitHub API error: ${response.status}` };
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      return { error: 'Path is a file, not a directory' };
    }
    
    return {
      files: data
        .filter((item: any) => item.type === 'file')
        .map((item: any) => ({ name: item.name, path: item.path, size: item.size })),
      directories: data
        .filter((item: any) => item.type === 'dir')
        .map((item: any) => ({ name: item.name, path: item.path })),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'GitHub request failed' };
  }
}

export const TOOLS: Record<string, Tool> = {
  web_search: {
    name: 'web_search',
    description: 'Search the web for current information. Returns title, URL, and description for each result.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        count: { type: 'number', description: 'Number of results (default: 5, max: 10)', default: 5 },
      },
      required: ['query'],
    },
    execute: webSearch,
  },
  memory_search: {
    name: 'memory_search',
    description: 'Search your long-term memory (MEMORY.md and daily notes) for relevant information about past work, decisions, or context.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to search for in memory' },
        limit: { type: 'number', description: 'Number of results (default: 5)', default: 5 },
      },
      required: ['query'],
    },
    execute: memorySearch,
  },
  file_read: {
    name: 'file_read',
    description: 'Read the contents of a file in the workspace. Useful for reviewing code, documents, or configuration files.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to file (e.g., "memory/2026-02-04.md" or "src/lib/tools.ts")' },
      },
      required: ['path'],
    },
    execute: fileRead,
  },
  file_list: {
    name: 'file_list',
    description: 'List files and directories in a workspace path. Useful for exploring the file structure.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path (default: root workspace)', default: '' },
      },
    },
    execute: fileList,
  },
  shell_exec: {
    name: 'shell_exec',
    description: 'Execute a safe shell command (ls, cat, grep, find, head, tail, wc, git status, git log). For exploring the system.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to execute (must start with allowed command)' },
        cwd: { type: 'string', description: 'Working directory (default: workspace)', default: '/root/.openclaw/workspace' },
      },
      required: ['command'],
    },
    execute: shellExec,
  },
  github_read_file: {
    name: 'github_read_file',
    description: 'Read a file from a GitHub repository. Useful for reviewing code in your repos.',
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner (e.g., "omniaintelligenceteam-ctrl")' },
        repo: { type: 'string', description: 'Repository name (e.g., "Omnia-Light-Scape-Pro-V3")' },
        path: { type: 'string', description: 'File path within repo (e.g., "src/components/Hero.tsx")' },
        ref: { type: 'string', description: 'Branch name, tag, or commit SHA (default: main)', default: 'main' },
      },
      required: ['owner', 'repo', 'path'],
    },
    execute: githubReadFile,
  },
  github_list_repo: {
    name: 'github_list_repo',
    description: 'List files and directories in a GitHub repository path.',
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        path: { type: 'string', description: 'Directory path (default: root)', default: '' },
        ref: { type: 'string', description: 'Branch name, tag, or commit SHA (default: main)', default: 'main' },
      },
      required: ['owner', 'repo'],
    },
    execute: githubListRepo,
  },
  github_search: {
    name: 'github_search',
    description: 'Search code across GitHub repositories. Find files, functions, or text within your repos.',
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner (e.g., "omniaintelligenceteam-ctrl")' },
        repo: { type: 'string', description: 'Repository name to search within (optional - leave blank to search all user repos)' },
        query: { type: 'string', description: 'Search query (code, function names, text to find)' },
        language: { type: 'string', description: 'Filter by programming language (e.g., "typescript", "python")', default: '' },
      },
      required: ['owner', 'query'],
    },
    execute: githubSearch,
  },
  github_write_file: {
    name: 'github_write_file',
    description: 'Create or update a file in a GitHub repository. Commits the change directly to the branch.',
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner (e.g., "omniaintelligenceteam-ctrl")' },
        repo: { type: 'string', description: 'Repository name' },
        path: { type: 'string', description: 'File path to create/update (e.g., "src/components/Hero.tsx")' },
        content: { type: 'string', description: 'The new file content' },
        message: { type: 'string', description: 'Commit message describing the change' },
        branch: { type: 'string', description: 'Branch name (default: main)', default: 'main' },
      },
      required: ['owner', 'repo', 'path', 'content', 'message'],
    },
    execute: githubWriteFile,
  },
  github_delete_file: {
    name: 'github_delete_file',
    description: 'Delete a file from a GitHub repository.',
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        path: { type: 'string', description: 'File path to delete' },
        message: { type: 'string', description: 'Commit message for the deletion' },
        branch: { type: 'string', description: 'Branch name (default: main)', default: 'main' },
      },
      required: ['owner', 'repo', 'path', 'message'],
    },
    execute: githubDeleteFile,
  },
};

// GitHub search implementation
async function githubSearch(args: { owner: string; repo?: string; query: string; language?: string }) {
  const { owner, repo, query, language = '' } = args;
  const githubToken = process.env.GITHUB_TOKEN;
  
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    // Build search query
    let searchQuery = `${query} user:${owner}`;
    if (repo) searchQuery += ` repo:${owner}/${repo}`;
    if (language) searchQuery += ` language:${language}`;
    
    const response = await fetch(
      `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}&per_page=10`,
      { headers }
    );
    
    if (!response.ok) {
      return { error: `GitHub search error: ${response.status}` };
    }
    
    const data = await response.json();
    
    return {
      total_count: data.total_count,
      results: data.items?.map((item: any) => ({
        file: item.name,
        path: item.path,
        repository: item.repository?.full_name,
        url: item.html_url,
        score: item.score,
      })) || [],
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'GitHub search failed' };
  }
}

// GitHub write file implementation
async function githubWriteFile(args: { owner: string; repo: string; path: string; content: string; message: string; branch?: string }) {
  const { owner, repo, path, content, message, branch = 'main' } = args;
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    return { error: 'GITHUB_TOKEN not configured - cannot write to repositories' };
  }
  
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${githubToken}`,
      'Content-Type': 'application/json',
    };
    
    // First, try to get the file's current SHA (needed for updates)
    let sha: string | undefined;
    try {
      const getResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        { headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `token ${githubToken}` } }
      );
      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
      }
    } catch {
      // File doesn't exist, that's fine for create
    }
    
    // Create or update the file
    const body: any = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
    };
    if (sha) {
      body.sha = sha;
    }
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: `GitHub write error: ${response.status} - ${errorData.message || 'Unknown error'}` };
    }
    
    const data = await response.json();
    return {
      success: true,
      commit: data.commit?.sha,
      url: data.content?.html_url,
      action: sha ? 'updated' : 'created',
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'GitHub write failed' };
  }
}

// GitHub delete file implementation
async function githubDeleteFile(args: { owner: string; repo: string; path: string; message: string; branch?: string }) {
  const { owner, repo, path, message, branch = 'main' } = args;
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    return { error: 'GITHUB_TOKEN not configured - cannot delete from repositories' };
  }
  
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${githubToken}`,
      'Content-Type': 'application/json',
    };
    
    // Get file SHA (required for delete)
    const getResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `token ${githubToken}` } }
    );
    
    if (!getResponse.ok) {
      return { error: `File not found: ${path}` };
    }
    
    const fileData = await getResponse.json();
    
    // Delete the file
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          message,
          sha: fileData.sha,
          branch,
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: `GitHub delete error: ${response.status} - ${errorData.message || 'Unknown error'}` };
    }
    
    const data = await response.json();
    return {
      success: true,
      commit: data.commit?.sha,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'GitHub delete failed' };
  }
}

// Write response back to web app via Supabase
async function writeWebResponse(args: { request_id: string; response: string }) {
  const { request_id, response } = args;
  
  try {
    const supabase = createClient(
      'https://wsiedmznnwaejwonuraj.supabase.co',
      process.env.SUPABASE_SERVICE_KEY || '',
      { auth: { persistSession: false } }
    );
    
    const { error } = await supabase
      .from('opie_requests')
      .update({
        response,
        status: 'complete',
        updated_at: new Date().toISOString(),
      })
      .eq('request_id', request_id);
    
    if (error) {
      return { error: `Failed to write response: ${error.message}` };
    }
    
    return { success: true, message: 'Response written to web app' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to write response' };
  }
}

// Add to TOOLS after defining the function
(TOOLS as any).write_web_response = {
  name: 'write_web_response',
  description: 'Write the final response to the web app via Supabase. Use this ONLY when completing a DO IT task that came from the web app. Requires request_id from the task.',
  parameters: {
    type: 'object',
    properties: {
      request_id: { type: 'string', description: 'The request ID from the web app task (e.g., "webapp:abc123")' },
      response: { type: 'string', description: 'The complete response to send to the web app user' },
    },
    required: ['request_id', 'response'],
  },
  execute: writeWebResponse,
};

// Tool executor dispatcher for local execution
export async function executeTool(toolCall: { tool: string; args: Record<string, any> }): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  const tool = TOOLS[toolCall.tool as keyof typeof TOOLS];
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolCall.tool}` };
  }
  try {
    console.log(`[Tools] Executing: ${toolCall.tool}`, toolCall.args);
    const result = await tool.execute(toolCall.args);
    console.log(`[Tools] Result:`, result);
    return { success: true, result };
  } catch (error) {
    console.error(`[Tools] Error executing ${toolCall.tool}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Tool execution failed' };
  }
}

export function getToolsPrompt(): string {
  const toolsList = Object.values(TOOLS).map(t => {
    const params = Object.entries(t.parameters.properties || {})
      .map(([key, val]: [string, any]) => `    ${key}: ${val.description}${val.default !== undefined ? ` (default: ${val.default})` : ''}${t.parameters.required?.includes(key) ? ' [REQUIRED]' : ''}`)
      .join('\n');
    return `
${t.name}:
  Description: ${t.description}
  Parameters:
${params}`;
  }).join('\n');

  return `
## TOOL ACCESS

You have access to the following tools. To use a tool, respond with ONLY a JSON object:
{"tool": "tool_name", "args": {"param1": "value1"}}

CRITICAL: When calling a tool, your ENTIRE response must be ONLY the JSON object.
- No text before the JSON
- No text after the JSON
- No explanations, questions, or commentary
- The system will execute the tool and give you the result
- THEN you provide your analysis in a follow-up response

### AVAILABLE TOOLS
${toolsList}

### EXAMPLES

CORRECT tool call (entire response is just JSON):
{"tool": "github_list_repo", "args": {"owner": "omniaintelligenceteam-ctrl", "repo": "Opie2ndbrain"}}

CORRECT final response (after receiving tool result):
Based on the repository contents, I can see the src folder contains components, hooks, and lib directories...

WRONG (mixing tool call with text - DO NOT DO THIS):
Let me check that. {"tool": "github_list_repo", "args": {...}} I'll analyze the results.

### TOOL EXAMPLES

GitHub read: {"tool": "github_read_file", "args": {"owner": "omniaintelligenceteam-ctrl", "repo": "Opie2ndbrain", "path": "src/app/page.tsx"}}
GitHub list: {"tool": "github_list_repo", "args": {"owner": "omniaintelligenceteam-ctrl", "repo": "Opie2ndbrain", "path": "src"}}
GitHub search: {"tool": "github_search", "args": {"owner": "omniaintelligenceteam-ctrl", "query": "pricing", "language": "typescript"}}
GitHub write: {"tool": "github_write_file", "args": {"owner": "omniaintelligenceteam-ctrl", "repo": "Opie2ndbrain", "path": "src/components/NewFile.tsx", "content": "export default function NewFile() { return <div>Hello</div> }", "message": "Add NewFile component"}}
GitHub delete: {"tool": "github_delete_file", "args": {"owner": "omniaintelligenceteam-ctrl", "repo": "Opie2ndbrain", "path": "src/old-file.ts", "message": "Remove old file"}}
Memory search: {"tool": "memory_search", "args": {"query": "sales leads", "limit": 5}}
Web search: {"tool": "web_search", "args": {"query": "landscape lighting design", "count": 5}}

### RULES
1. To use a tool: output ONLY the JSON object, nothing else
2. After receiving results: provide your analysis (no more tool calls unless absolutely needed)
3. Never ask "did you get it?" or "should I search?" - tool execution is automatic
4. If you need multiple tools, call them one at a time and wait for results
`;
}
