// Server-side tools for DO IT mode
// These execute on the server and return results to the AI

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
};

export function getToolsPrompt(): string {
  return `
You have access to the following tools. To use a tool, respond with a JSON object in this format:
{"tool": "tool_name", "args": {"arg1": "value1", "arg2": "value2"}}

Available tools:
${Object.values(TOOLS).map(t => `
${t.name}: ${t.description}
Parameters: ${JSON.stringify(t.parameters.properties)}
`).join('\n')}

You can use multiple tools in sequence. After each tool result, you'll receive the output and can decide to use another tool or provide your final response.
`;
}
