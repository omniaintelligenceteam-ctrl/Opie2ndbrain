// Server-side tools for EXECUTE mode
// These execute on the server and return results to the AI

import { getSupabaseAdmin } from './supabase';

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
  file_write: {
    name: 'file_write',
    description: 'Create a new file in the workspace with specified content. REQUIRES APPROVAL for destructive operations.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path for new file (e.g., "src/components/NewFile.tsx")' },
        content: { type: 'string', description: 'Content to write to the file' },
      },
      required: ['path', 'content'],
    },
    execute: fileWrite,
  },
  file_edit: {
    name: 'file_edit',
    description: 'Edit an existing file using find/replace, insert, append, prepend, or delete operations. REQUIRES APPROVAL for destructive operations.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to file to edit' },
        operation: { type: 'string', enum: ['replace', 'insert', 'append', 'prepend', 'delete_lines'], description: 'Type of edit operation' },
        search: { type: 'string', description: 'Text to find (for replace operation)' },
        replace: { type: 'string', description: 'Text to replace with (for replace operation)' },
        content: { type: 'string', description: 'Content to insert/append/prepend' },
        line_number: { type: 'number', description: 'Line number for insert operation (1-based)' },
        start_line: { type: 'number', description: 'Start line for delete_lines operation (1-based)' },
        end_line: { type: 'number', description: 'End line for delete_lines operation (1-based, optional)' },
      },
      required: ['path', 'operation'],
    },
    execute: fileEdit,
  },
  spawn_agent: {
    name: 'spawn_agent',
    description: 'Spawn a background sub-agent to handle a specific task. REQUIRES APPROVAL for agent creation.',
    parameters: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description for the sub-agent to execute' },
        agent_name: { type: 'string', description: 'Name for the agent (default: "subagent")', default: 'subagent' },
        model: { type: 'string', description: 'Model to use (default: claude-sonnet)', default: 'anthropic/claude-sonnet-4-20250514' },
        timeout: { type: 'number', description: 'Timeout in seconds (default: 300)', default: 300 },
      },
      required: ['task'],
    },
    execute: spawnAgent,
  },
  exec: {
    name: 'exec',
    description: 'Execute shell commands. Safe commands run immediately, dangerous commands REQUIRE APPROVAL.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        cwd: { type: 'string', description: 'Working directory (default: workspace)', default: '/root/.openclaw/workspace' },
      },
      required: ['command'],
    },
    execute: execCommand,
  },
  browser_navigate: {
    name: 'browser_navigate',
    description: 'Navigate browser to a URL. REQUIRES APPROVAL for web browsing.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to' },
        timeout: { type: 'number', description: 'Timeout in milliseconds (default: 30000)', default: 30000 },
      },
      required: ['url'],
    },
    execute: browserNavigate,
  },
  browser_screenshot: {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current browser page.',
    parameters: {
      type: 'object',
      properties: {
        full_page: { type: 'boolean', description: 'Capture full page (default: false)', default: false },
        format: { type: 'string', enum: ['png', 'jpeg'], description: 'Image format (default: png)', default: 'png' },
      },
    },
    execute: browserScreenshot,
  },
  browser_snapshot: {
    name: 'browser_snapshot',
    description: 'Get structured content/DOM snapshot of the current browser page.',
    parameters: {
      type: 'object',
      properties: {
        refs: { type: 'string', enum: ['role', 'aria'], description: 'Reference type (default: role)', default: 'role' },
        depth: { type: 'number', description: 'Content depth (default: 3)', default: 3 },
      },
    },
    execute: browserSnapshot,
  },
  browser_click: {
    name: 'browser_click',
    description: 'Click an element on the current browser page.',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector to click' },
        ref: { type: 'string', description: 'Element reference from snapshot' },
        text: { type: 'string', description: 'Text content to find and click' },
      },
    },
    execute: browserClick,
  },
  browser_type: {
    name: 'browser_type',
    description: 'Type text into an input field on the current browser page.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to type' },
        selector: { type: 'string', description: 'CSS selector of input field' },
        ref: { type: 'string', description: 'Element reference from snapshot' },
      },
      required: ['text'],
    },
    execute: browserType,
  },
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
    description: 'Legacy safe shell command executor (use "exec" tool instead). Limited to safe commands only.',
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

// Write file to workspace
async function fileWrite(args: { path: string; content: string }) {
  const { path, content } = args;
  try {
    // Security: only allow writing to workspace, no traversal
    if (path.includes('..') || path.startsWith('/') || path.includes('\\')) {
      return { error: 'Invalid path - must be relative to workspace without traversal' };
    }
    
    const fs = require('fs').promises;
    const nodePath = require('path');
    const fullPath = nodePath.join('/root/.openclaw/workspace', path);
    
    // Create directory if it doesn't exist
    const dir = nodePath.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(fullPath, content, 'utf-8');
    return { success: true, path, size: content.length };
  } catch (error) {
    return { error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Edit file in workspace (find/replace, insert, delete operations)
async function fileEdit(args: { 
  path: string; 
  operation: 'replace' | 'insert' | 'append' | 'prepend' | 'delete_lines';
  search?: string;
  replace?: string;
  content?: string;
  line_number?: number;
  start_line?: number;
  end_line?: number;
}) {
  const { path, operation, search, replace, content, line_number, start_line, end_line } = args;
  
  try {
    // Security: only allow editing files in workspace
    if (path.includes('..') || path.startsWith('/') || path.includes('\\')) {
      return { error: 'Invalid path - must be relative to workspace' };
    }
    
    const fs = require('fs').promises;
    const nodePath = require('path');
    const fullPath = nodePath.join('/root/.openclaw/workspace', path);
    
    // Read current file
    let currentContent;
    try {
      currentContent = await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      return { error: `Failed to read file: ${error instanceof Error ? error.message : 'File not found'}` };
    }
    
    let newContent;
    const lines = currentContent.split('\n');
    
    switch (operation) {
      case 'replace':
        if (!search || replace === undefined) {
          return { error: 'Replace operation requires search and replace parameters' };
        }
        newContent = currentContent.replace(new RegExp(search, 'g'), replace);
        break;
        
      case 'insert':
        if (line_number === undefined || content === undefined) {
          return { error: 'Insert operation requires line_number and content parameters' };
        }
        lines.splice(line_number - 1, 0, content);
        newContent = lines.join('\n');
        break;
        
      case 'append':
        if (content === undefined) {
          return { error: 'Append operation requires content parameter' };
        }
        newContent = currentContent + '\n' + content;
        break;
        
      case 'prepend':
        if (content === undefined) {
          return { error: 'Prepend operation requires content parameter' };
        }
        newContent = content + '\n' + currentContent;
        break;
        
      case 'delete_lines':
        if (start_line === undefined) {
          return { error: 'Delete lines operation requires start_line parameter' };
        }
        const endLine = end_line || start_line;
        lines.splice(start_line - 1, endLine - start_line + 1);
        newContent = lines.join('\n');
        break;
        
      default:
        return { error: 'Invalid operation. Must be: replace, insert, append, prepend, or delete_lines' };
    }
    
    await fs.writeFile(fullPath, newContent, 'utf-8');
    return { success: true, operation, path, new_size: newContent.length };
    
  } catch (error) {
    return { error: `Failed to edit file: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Spawn sub-agent via OpenClaw
async function spawnAgent(args: { task: string; agent_name?: string; model?: string; timeout?: number }) {
  const { task, agent_name = 'subagent', model = 'anthropic/claude-sonnet-4-20250514', timeout = 300 } = args;
  
  try {
    // Import gateway functions
    const { invokeGatewayTool } = require('./gateway');
    
    const result = await invokeGatewayTool('sessions_spawn', {
      task,
      label: `agent:main:${agent_name}:${Date.now().toString(36)}`,
      model,
      timeoutSeconds: timeout,
      cleanup: 'keep',
    });
    
    if (!result.ok) {
      return { error: result.error?.message || 'Failed to spawn agent' };
    }
    
    return {
      success: true,
      agent_name,
      session_key: result.result?.sessionKey,
      task,
      model,
      timeout,
      status: 'spawned'
    };
    
  } catch (error) {
    return { error: `Failed to spawn agent: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Full shell execution with approval gate for dangerous commands
async function execCommand(args: { command: string; cwd?: string }) {
  const { command, cwd = '/root/.openclaw/workspace' } = args;
  
  // List of dangerous commands that should require explicit approval
  const dangerousCommands = [
    'rm', 'rmdir', 'del', 'delete', 'dd', 'format', 'mkfs',
    'curl.*bash', 'wget.*bash', 'curl.*sh', 'wget.*sh',
    'sudo', 'su', 'chmod +x', 'chown', 'mount', 'umount',
    'kill', 'killall', 'pkill', 'shutdown', 'reboot', 'halt',
    'crontab', 'systemctl', 'service', 'init.d',
    '>', '>>', 'tee.*>', 'mv.*\.', 'cp.*\.', 'tar.*--delete'
  ];
  
  const isDangerous = dangerousCommands.some(pattern => 
    new RegExp(pattern, 'i').test(command.trim())
  );
  
  if (isDangerous) {
    return { 
      error: 'APPROVAL_REQUIRED', 
      message: `This command requires approval: "${command}". It may be destructive.`,
      command,
      requires_approval: true
    };
  }
  
  try {
    const { execSync } = require('child_process');
    const result = execSync(command, { 
      cwd, 
      encoding: 'utf-8',
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024, // 1MB buffer
    });
    return { output: result.slice(0, 10000) }; // Limit output to 10KB
  } catch (error: any) {
    return { 
      error: `Command failed: ${error.message}`, 
      output: error.stdout || '',
      exit_code: error.status
    };
  }
}

// Browser navigation
async function browserNavigate(args: { url: string; timeout?: number }) {
  const { url, timeout = 30000 } = args;
  
  try {
    const { invokeGatewayTool } = require('./gateway');
    
    const result = await invokeGatewayTool('browser', {
      action: 'open',
      targetUrl: url,
      timeoutMs: timeout,
      profile: 'openclaw',
    });
    
    if (!result.ok) {
      return { error: result.error?.message || 'Failed to navigate browser' };
    }
    
    return {
      success: true,
      url,
      status: 'navigated'
    };
    
  } catch (error) {
    return { error: `Browser navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Browser screenshot
async function browserScreenshot(args: { full_page?: boolean; format?: 'png' | 'jpeg' }) {
  const { full_page = false, format = 'png' } = args;
  
  try {
    const { invokeGatewayTool } = require('./gateway');
    
    const result = await invokeGatewayTool('browser', {
      action: 'screenshot',
      fullPage: full_page,
      type: format,
      profile: 'openclaw',
    });
    
    if (!result.ok) {
      return { error: result.error?.message || 'Failed to take screenshot' };
    }
    
    return {
      success: true,
      format,
      full_page,
      image_data: result.result
    };
    
  } catch (error) {
    return { error: `Screenshot failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Browser content snapshot
async function browserSnapshot(args: { refs?: 'role' | 'aria'; depth?: number }) {
  const { refs = 'role', depth = 3 } = args;
  
  try {
    const { invokeGatewayTool } = require('./gateway');
    
    const result = await invokeGatewayTool('browser', {
      action: 'snapshot',
      refs,
      depth,
      profile: 'openclaw',
    });
    
    if (!result.ok) {
      return { error: result.error?.message || 'Failed to get page snapshot' };
    }
    
    return {
      success: true,
      content: result.result,
      refs,
      depth
    };
    
  } catch (error) {
    return { error: `Page snapshot failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Browser click element
async function browserClick(args: { selector?: string; ref?: string; text?: string }) {
  const { selector, ref, text } = args;
  
  if (!selector && !ref && !text) {
    return { error: 'Must provide selector, ref, or text to click' };
  }
  
  try {
    const { invokeGatewayTool } = require('./gateway');
    
    const clickArgs: any = {
      action: 'act',
      request: {
        kind: 'click'
      },
      profile: 'openclaw',
    };
    
    if (selector) clickArgs.selector = selector;
    if (ref) clickArgs.request.ref = ref;
    if (text) clickArgs.request.text = text;
    
    const result = await invokeGatewayTool('browser', clickArgs);
    
    if (!result.ok) {
      return { error: result.error?.message || 'Failed to click element' };
    }
    
    return {
      success: true,
      clicked: selector || ref || text
    };
    
  } catch (error) {
    return { error: `Click failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Browser type text
async function browserType(args: { text: string; selector?: string; ref?: string }) {
  const { text, selector, ref } = args;
  
  if (!selector && !ref) {
    return { error: 'Must provide selector or ref to type into' };
  }
  
  try {
    const { invokeGatewayTool } = require('./gateway');
    
    const typeArgs: any = {
      action: 'act',
      request: {
        kind: 'type',
        text
      },
      profile: 'openclaw',
    };
    
    if (selector) typeArgs.selector = selector;
    if (ref) typeArgs.request.ref = ref;
    
    const result = await invokeGatewayTool('browser', typeArgs);
    
    if (!result.ok) {
      return { error: result.error?.message || 'Failed to type text' };
    }
    
    return {
      success: true,
      typed: text,
      target: selector || ref
    };
    
  } catch (error) {
    return { error: `Type failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Write response back to web app via Supabase
async function writeWebResponse(args: { request_id: string; response: string }) {
  const { request_id, response } = args;
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase not configured');
    
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
  description: 'Write the final response to the web app via Supabase. Use this ONLY when completing a EXECUTE task that came from the web app. Requires request_id from the task.',
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

### APPROVAL GATE SYSTEM
🔒 Some tools require user approval for destructive operations:
- **file_write/file_edit**: Creating or modifying files
- **spawn_agent**: Creating background agents
- **browser_navigate**: Opening web pages
- **exec**: Dangerous shell commands (rm, sudo, curl|bash, etc.)

When these tools are called, the system will present an execution plan and ask for approval.
Safe operations (read-only, list files, safe shell commands) execute immediately.

### AVAILABLE TOOLS
${toolsList}

### EXAMPLES

File Operations:
{"tool": "file_write", "args": {"path": "src/components/NewFile.tsx", "content": "export default function NewFile() { return <div>Hello</div>; }"}}
{"tool": "file_edit", "args": {"path": "src/app/page.tsx", "operation": "replace", "search": "old text", "replace": "new text"}}
{"tool": "file_read", "args": {"path": "src/lib/tools.ts"}}

Agent Operations:
{"tool": "spawn_agent", "args": {"task": "Fix the bug in the login component", "agent_name": "BugFixer", "model": "anthropic/claude-sonnet-4-20250514"}}

Shell Operations:
{"tool": "exec", "args": {"command": "npm install", "cwd": "/root/.openclaw/workspace"}}
{"tool": "shell_exec", "args": {"command": "ls -la src/"}}

Browser Operations:
{"tool": "browser_navigate", "args": {"url": "https://github.com"}}
{"tool": "browser_screenshot", "args": {"full_page": true}}
{"tool": "browser_click", "args": {"text": "Sign in"}}
{"tool": "browser_type", "args": {"text": "user@example.com", "selector": "input[type=email]"}}

GitHub Operations:
{"tool": "github_read_file", "args": {"owner": "omniaintelligenceteam-ctrl", "repo": "Opie2ndbrain", "path": "src/app/page.tsx"}}
{"tool": "github_write_file", "args": {"owner": "omniaintelligenceteam-ctrl", "repo": "Opie2ndbrain", "path": "src/components/NewFile.tsx", "content": "export default function NewFile() { return <div>Hello</div> }", "message": "Add NewFile component"}}

Memory & Web:
{"tool": "memory_search", "args": {"query": "sales leads", "limit": 5}}
{"tool": "web_search", "args": {"query": "landscape lighting design", "count": 5}}

### RULES
1. To use a tool: output ONLY the JSON object, nothing else
2. After receiving results: provide your analysis (no more tool calls unless absolutely needed)
3. Never ask "did you get it?" or "should I search?" - tool execution is automatic
4. If you need multiple tools, call them one at a time and wait for results
5. Destructive operations will trigger approval - this is expected and normal
`;
}
