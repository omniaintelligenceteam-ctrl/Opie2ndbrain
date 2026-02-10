import { NextRequest } from 'next/server';
import { PersonalityParameters, parametersToApiConfig } from '@/lib/personalityTypes';
import Anthropic from '@anthropic-ai/sdk';
import { TOOLS, getToolsPrompt, executeTool } from '@/lib/tools';
import { supabaseAdmin } from '@/lib/supabase';
import { ExecutionPlanStore, type ToolCall } from '@/lib/execution-plans';
import { gatewayChatClient, shouldUseGateway, type ChatMessage } from '@/lib/gateway-chat';

// Force Node.js runtime for full env var access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Provider Configuration
type Provider = 'openclaw' | 'ollama' | 'anthropic';

// Use centralized gateway config — never hardcode secrets or IPs
import { GATEWAY_URL as _GW_URL, GATEWAY_TOKEN as _GW_TOKEN } from '@/lib/gateway';
const OPENCLAW_GATEWAY_URL = _GW_URL;
const OPENCLAW_GATEWAY_TOKEN = _GW_TOKEN;
const OPENCLAW_AVAILABLE = true; // Bridge is always available

const REQUEST_TIMEOUT_MS = 120_000;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODELS = {
  kimi: { provider: 'ollama' as const, model: 'kimi-k2.5:cloud' },
  opus: { provider: 'anthropic' as const, model: 'claude-opus-4-5-20250514' },
  sonnet: { provider: 'anthropic' as const, model: 'claude-sonnet-4-20250514' },
  haiku: { provider: 'anthropic' as const, model: 'claude-3-5-haiku-20241022' },
};

type ModelAlias = keyof typeof MODELS;

// NOTE: In serverless environments module-level mutable state is unreliable
// (each invocation may get a fresh instance). These defaults are used when
// the request body does not supply model/provider.
const DEFAULT_MODEL: ModelAlias = 'kimi';
const DEFAULT_PROVIDER: Provider = 'ollama';

const VOICE_INSTRUCTIONS = `[VOICE MODE] This is a voice conversation. Rules:
- 2-3 sentences MAX. Be concise.
- NO formatting: no tables, no bullets, no markdown, no lists.
- Speak naturally like you're talking, not reading.
- Don't dump information. Answer directly.

User said: `;

const SYSTEM_PROMPT = `You are Opie, a helpful AI assistant. You're friendly, concise, and practical.`;

// For OpenClaw routing - let the agent use its natural identity
const OPENCLAW_SYSTEM_PROMPT = `You are Wes's AI assistant. Be helpful, direct, and practical.`;

// Helper to create SSE stream
function createStreamResponse(generator: AsyncGenerator<string>) {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generator) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

// Call OpenClaw (non-streaming, converted to SSE)
async function* streamOpenClaw(messages: Array<{role: string, content: string}>, sessionId: string) {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (!lastUserMessage) {
    yield `data: ${JSON.stringify({ error: 'No user message' })}\n\n`;
    return;
  }

  try {
    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        tool: 'sessions_spawn',
        args: {
          task: lastUserMessage.content,
          label: `opie:chat:${sessionId}`,
          timeoutSeconds: 115,
          cleanup: 'keep',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield `data: ${JSON.stringify({ error: `OpenClaw: ${error.slice(0, 200)}` })}\n\n`;
      return;
    }

    const data = await response.json();
    let reply = '';

    if (data.ok && data.result) {
      const result = data.result;
      // Check for error response
      if (result.details?.status === 'error' || result.status === 'error') {
        const errorMsg = result.details?.error || result.error || 'Unknown error';
        reply = `Error: ${errorMsg}`;
      }
      else if (result.details?.reply) reply = result.details.reply;
      else if (result.reply) reply = result.reply;
      else if (result.text) reply = result.text;
      else if (typeof result === 'string') reply = result;
    }

    // Stream the complete reply as one chunk
    yield `data: ${JSON.stringify({ choices: [{ delta: { content: reply } }] })}\n\n`;
    yield `data: [DONE]\n\n`;

  } catch (error) {
    console.error("[OpenClaw] Error:", error);
    yield `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'OpenClaw failed' })}\n\n`;
  }
}

// Call Ollama with streaming (with gateway routing)
async function* streamOllama(messages: Array<{role: string, content: string}>, model: string) {
  // Try gateway routing first if available
  if (shouldUseGateway()) {
    console.log('[streamOllama] Using gateway routing');
    try {
      const gatewayMessages: ChatMessage[] = [
        { role: 'system', content: OPENCLAW_SYSTEM_PROMPT },
        ...messages.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        }))
      ];

      const stream = await gatewayChatClient.createStreamingCompletion({
        messages: gatewayMessages,
        model: "openclaw:main", // Use OpenClaw main agent
        stream: true,
        max_tokens: 1024,
      });

      for await (const chunk of stream) {
        yield chunk;
      }
      return;
    } catch (error) {
      console.error('[streamOllama] Gateway failed, falling back to direct API:', error);
      // Continue to fallback below
    }
  }

  // Fallback to direct Ollama API
  console.log('[streamOllama] Using direct Ollama API');
  const ollamaKey = process.env.OLLAMA_API_KEY;
  if (!ollamaKey) {
    yield `data: ${JSON.stringify({ error: 'OLLAMA_API_KEY not configured' })}\n\n`;
    return;
  }

  try {
    const response = await fetch('https://ollama.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ollamaKey}`,
      },
      body: JSON.stringify({
        model: model,
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield `data: ${JSON.stringify({ error: `Ollama: ${error.slice(0, 200)}` })}\n\n`;
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield `data: ${JSON.stringify({ error: 'No response body' })}\n\n`;
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield `data: [DONE]\n\n`;
            return;
          }
          yield `${line}\n\n`;
        }
      }
    }

  } catch (error) {
    console.error("[Ollama] Error:", error);
    yield `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Ollama failed' })}\n\n`;
  }
}

// Parse user response for yes/no intent
function parseApprovalIntent(text: string): 'yes' | 'no' | 'unclear' {
  const cleanText = text.toLowerCase().trim();
  
  // Yes indicators
  const yesKeywords = ['yes', 'yeah', 'yep', 'go', 'do it', 'execute', 'run', 'proceed', 'continue', 'sure', 'ok', 'okay', 'yea'];
  const noKeywords = ['no', 'nah', 'cancel', 'stop', 'wait', 'hold on', 'not yet', 'nope', 'abort'];
  
  // Check for exact matches or phrases
  for (const keyword of yesKeywords) {
    if (cleanText === keyword || cleanText.includes(keyword)) {
      return 'yes';
    }
  }
  
  for (const keyword of noKeywords) {
    if (cleanText === keyword || cleanText.includes(keyword)) {
      return 'no';
    }
  }
  
  return 'unclear';
}

// Parse tool call JSON from AI response
function parseToolCall(text: string): { tool: string; args: Record<string, any> } | null {
  console.log('[parseToolCall] Input:', text.slice(0, 500).replace(/\n/g, '\\n'));
  
  // Find all potential JSON objects with "tool" key
  // Search for positions of {"tool" or { "tool"
  const toolIndices = [];
  let pos = 0;
  while ((pos = text.indexOf('"tool"', pos)) !== -1) {
    toolIndices.push(pos);
    pos++;
  }
  
  console.log('[parseToolCall] Found "tool" at positions:', toolIndices);
  
  // For each "tool" found, try to extract the surrounding JSON object
  for (const idx of toolIndices) {
    // Find the opening brace before "tool"
    let start = idx;
    while (start > 0 && text[start] !== '{') {
      start--;
    }
    if (text[start] !== '{') continue;
    
    // Find the closing brace by counting
    let braceCount = 1;
    let end = start + 1;
    while (end < text.length && braceCount > 0) {
      if (text[end] === '{') braceCount++;
      else if (text[end] === '}') braceCount--;
      end++;
    }
    
    if (braceCount !== 0) continue; // Unmatched braces
    
    const jsonStr = text.slice(start, end);
    console.log('[parseToolCall] Trying JSON:', jsonStr.slice(0, 200));
    
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.tool && typeof parsed.tool === 'string' && TOOLS[parsed.tool]) {
        console.log('[parseToolCall] SUCCESS - tool:', parsed.tool);
        return { tool: parsed.tool, args: parsed.args || {} };
      }
    } catch (e) {
      console.log('[parseToolCall] Parse error:', e);
      continue;
    }
  }
  
  console.log('[parseToolCall] No valid tool found');
  return null;
}

// Check if a tool call requires approval (destructive operations)
function requiresApproval(toolCall: { tool: string; args: Record<string, any> }): boolean {
  const destructiveTools = [
    'file_write',
    'file_edit', 
    'spawn_agent',
    'browser_navigate',
    'github_write_file',
    'github_delete_file'
  ];
  
  // Check for destructive tools
  if (destructiveTools.includes(toolCall.tool)) {
    return true;
  }
  
  // Check for dangerous exec commands
  if (toolCall.tool === 'exec') {
    const command = toolCall.args.command || '';
    const dangerousCommands = [
      'rm', 'rmdir', 'del', 'delete', 'dd', 'format', 'mkfs',
      'curl.*bash', 'wget.*bash', 'curl.*sh', 'wget.*sh',
      'sudo', 'su', 'chmod +x', 'chown', 'mount', 'umount',
      'kill', 'killall', 'pkill', 'shutdown', 'reboot', 'halt',
      'crontab', 'systemctl', 'service', 'init.d',
      '>', '>>', 'tee.*>', 'mv.*\.', 'cp.*\.', 'tar.*--delete'
    ];
    
    return dangerousCommands.some(pattern => 
      new RegExp(pattern, 'i').test(command.trim())
    );
  }
  
  return false;
}

// Generate an execution plan by asking AI what it would do
async function generateExecutionPlan(
  messages: Array<{ role: string; content: string }>,
  sessionId: string
): Promise<{
  success: boolean;
  plan?: {
    message: string;
    plannedActions: string[];
    toolCalls: ToolCall[];
  };
  error?: string;
}> {
  // Try Claude Sonnet first (more reliable for JSON), fallback to Kimi if unavailable
  const useAnthropic = process.env.ANTHROPIC_API_KEY && true; // Enable Claude for planning
  
  if (useAnthropic) {
    return generateExecutionPlanAnthropic(messages, sessionId);
  }
  
  // Fallback to Kimi with improved parsing
  return generateExecutionPlanKimi(messages, sessionId);
}

// Claude Sonnet planning (reliable JSON) - with gateway support
async function generateExecutionPlanAnthropic(
  messages: Array<{ role: string; content: string }>,
  sessionId: string
): Promise<{
  success: boolean;
  plan?: {
    message: string;
    plannedActions: string[];
    toolCalls: ToolCall[];
  };
  error?: string;
}> {

  try {
    const planningPrompt = `Create an execution plan in JSON format:

{
  "plannedActions": ["Brief summary ending with 'Execute?'"],
  "toolCalls": [{"tool": "...", "args": {...}, "description": "..."}]
}

User request: "${messages[messages.length - 1]?.content || ''}"

Available tools: ${Object.keys(TOOLS).join(', ')}`;

    let planText = '';

    // Try gateway first if available
    if (shouldUseGateway()) {
      console.log('[Planning] Using gateway for Claude planning');
      try {
        const gatewayMessages: ChatMessage[] = [
          { role: 'system', content: 'You are a helpful assistant that creates execution plans in JSON format. Always return valid JSON only.' },
          ...messages.slice(1, -1).map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content,
          })),
          { role: 'user', content: planningPrompt }
        ];

        const response = await gatewayChatClient.createCompletion({
          messages: gatewayMessages,
          model: 'openclaw:main', // Use OpenClaw main agent
          max_tokens: 1024,
          temperature: 0.1,
        });

        planText = response.content;
        console.log('[Planning] Gateway Claude response:', planText.slice(0, 500));
      } catch (gatewayError) {
        console.error('[Planning] Gateway failed, falling back to direct Claude API:', gatewayError);
        // Continue to fallback below
      }
    }

    // Fallback to direct Anthropic API if gateway failed or not available
    if (!planText && process.env.ANTHROPIC_API_KEY) {
      console.log('[Planning] Using direct Anthropic API');
      const apiMessages = messages.slice(1, -1).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      apiMessages.push({
        role: 'user',
        content: planningPrompt,
      });

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: 'You are a helpful assistant that creates execution plans in JSON format. Always return valid JSON only.',
        messages: apiMessages,
        temperature: 0.1,
      });

      planText = response.content[0].type === 'text' ? response.content[0].text : '';
      console.log('[Planning] Direct Claude response:', planText.slice(0, 500));
    }

    // If no response from either method, return error
    if (!planText) {
      return { success: false, error: 'No response from Claude (gateway or direct API)' };
    }

    // Parse JSON more robustly
    const planJson = parseExecutionPlanJSON(planText);
    if (!planJson) {
      return { success: false, error: 'Failed to parse execution plan JSON' };
    }

    // Validate the plan
    const validation = validateExecutionPlan(planJson);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    return {
      success: true,
      plan: {
        message: messages[messages.length - 1]?.content || '',
        plannedActions: planJson.plannedActions,
        toolCalls: planJson.toolCalls,
      },
    };
  } catch (error) {
    console.error('[Planning] Claude error:', error);
    // Fallback to Kimi if Claude fails
    return generateExecutionPlanKimi(messages, sessionId);
  }
}

// Kimi planning with improved JSON parsing - with gateway support
async function generateExecutionPlanKimi(
  messages: Array<{ role: string; content: string }>,
  sessionId: string
): Promise<{
  success: boolean;
  plan?: {
    message: string;
    plannedActions: string[];
    toolCalls: ToolCall[];
  };
  error?: string;
}> {

  try {
    // Simplified prompt for better JSON consistency
    const planningPrompt = `Create an execution plan in JSON format:

{
  "plannedActions": ["Brief summary ending with 'Execute?'"],
  "toolCalls": [{"tool": "...", "args": {...}, "description": "..."}]
}

User request: "${messages[messages.length - 1]?.content || ''}"

Available tools: ${Object.keys(TOOLS).join(', ')}`;

    let planText = '';

    // Try gateway first if available
    if (shouldUseGateway()) {
      console.log('[Planning] Using gateway for Kimi planning');
      try {
        const gatewayMessages: ChatMessage[] = [
          ...messages.slice(0, -1).map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content,
          })),
          { role: 'user', content: planningPrompt }
        ];

        const response = await gatewayChatClient.createCompletion({
          messages: gatewayMessages,
          model: 'openclaw:main', // Use OpenClaw main agent
          max_tokens: 1024,
          temperature: 0.1,
        });

        planText = response.content;
        console.log('[Planning] Gateway Kimi response:', planText.slice(0, 500));
      } catch (gatewayError) {
        console.error('[Planning] Gateway failed, falling back to direct Ollama API:', gatewayError);
        // Continue to fallback below
      }
    }

    // Fallback to direct Ollama API if gateway failed or not available
    if (!planText) {
      console.log('[Planning] Using direct Ollama API');
      const ollamaKey = process.env.OLLAMA_API_KEY;
      if (!ollamaKey) {
        return { success: false, error: 'OLLAMA_API_KEY not configured and gateway not available' };
      }

      const planningMessages = [
        ...messages.slice(0, -1),
        { role: 'user', content: planningPrompt }
      ];

      const response = await fetch('https://ollama.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ollamaKey}`,
        },
        body: JSON.stringify({
          model: 'kimi-k2.5:cloud',
          stream: false,
          messages: planningMessages,
          max_tokens: 1024,
          temperature: 0.1, // Very low temperature for consistent JSON
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Planning API error: ${response.status}` };
      }

      const data = await response.json();
      planText = data.choices?.[0]?.message?.content || '';
      console.log('[Planning] Direct Kimi response:', planText.slice(0, 500));
    }

    // If no response from either method, return error
    if (!planText) {
      return { success: false, error: 'No response from Kimi (gateway or direct API)' };
    }

    // Parse JSON more robustly
    const planJson = parseExecutionPlanJSON(planText);
    if (!planJson) {
      return { success: false, error: 'Failed to parse execution plan JSON' };
    }

    // Validate the plan
    const validation = validateExecutionPlan(planJson);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    return {
      success: true,
      plan: {
        message: messages[messages.length - 1]?.content || '',
        plannedActions: planJson.plannedActions,
        toolCalls: planJson.toolCalls,
      },
    };
  } catch (error) {
    console.error('[Planning] Kimi error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Planning failed' };
  }
}

// Robust JSON parsing function
function parseExecutionPlanJSON(text: string): any | null {
  console.log('[JSON Parser] Input:', text.slice(0, 500).replace(/\n/g, '\\n'));
  
  // Method 1: Try to find JSON between code blocks
  let jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      console.log('[JSON Parser] SUCCESS - code block');
      return parsed;
    } catch (e) {
      console.log('[JSON Parser] Code block parse failed:', e);
    }
  }
  
  // Method 2: Find the first complete JSON object
  let braceCount = 0;
  let start = -1;
  let end = -1;
  
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (braceCount === 0) start = i;
      braceCount++;
    } else if (text[i] === '}') {
      braceCount--;
      if (braceCount === 0 && start !== -1) {
        end = i + 1;
        break;
      }
    }
  }
  
  if (start !== -1 && end !== -1) {
    const jsonStr = text.slice(start, end);
    try {
      const parsed = JSON.parse(jsonStr);
      console.log('[JSON Parser] SUCCESS - brace matching');
      return parsed;
    } catch (e) {
      console.log('[JSON Parser] Brace matching parse failed:', e);
    }
  }
  
  // Method 3: Try to parse the entire text as JSON
  try {
    const parsed = JSON.parse(text.trim());
    console.log('[JSON Parser] SUCCESS - direct parse');
    return parsed;
  } catch (e) {
    console.log('[JSON Parser] Direct parse failed:', e);
  }
  
  // Method 4: Try to extract JSON-like content more aggressively
  const cleanText = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
  if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleanText);
      console.log('[JSON Parser] SUCCESS - aggressive clean');
      return parsed;
    } catch (e) {
      console.log('[JSON Parser] Aggressive clean parse failed:', e);
    }
  }
  
  console.log('[JSON Parser] All methods failed');
  return null;
}

// Validation function for execution plans
function validateExecutionPlan(planJson: any): { valid: boolean; error?: string } {
  if (!planJson || typeof planJson !== 'object') {
    return { valid: false, error: 'Plan must be an object' };
  }
  
  if (!planJson.plannedActions || !Array.isArray(planJson.plannedActions)) {
    return { valid: false, error: 'Invalid plan format: missing plannedActions array' };
  }
  
  if (planJson.plannedActions.length === 0) {
    return { valid: false, error: 'plannedActions cannot be empty' };
  }
  
  if (!planJson.toolCalls || !Array.isArray(planJson.toolCalls)) {
    return { valid: false, error: 'Invalid plan format: missing toolCalls array' };
  }
  
  // Validate each tool call
  for (let i = 0; i < planJson.toolCalls.length; i++) {
    const toolCall = planJson.toolCalls[i];
    
    if (!toolCall.tool || typeof toolCall.tool !== 'string') {
      return { valid: false, error: `Tool call ${i + 1}: missing or invalid tool name` };
    }
    
    if (!TOOLS[toolCall.tool]) {
      return { valid: false, error: `Tool call ${i + 1}: unknown tool '${toolCall.tool}'` };
    }
    
    if (!toolCall.args || typeof toolCall.args !== 'object') {
      return { valid: false, error: `Tool call ${i + 1}: missing or invalid args` };
    }
    
    if (!toolCall.description || typeof toolCall.description !== 'string') {
      return { valid: false, error: `Tool call ${i + 1}: missing description` };
    }
  }
  
  return { valid: true };
}

// Call Ollama with tool execution loop (for EXECUTE mode)
async function* streamOllamaWithTools(
  messages: Array<{ role: string; content: string }>,
  model: string,
  maxToolIterations = 25
): AsyncGenerator<string> {
  // Try gateway routing first if available (OpenClaw handles tools natively)
  if (shouldUseGateway()) {
    console.log('[streamOllamaWithTools] Using OpenClaw gateway for tools');
    try {
      const gatewayMessages: ChatMessage[] = [
        { role: 'system', content: messages[0]?.content || OPENCLAW_SYSTEM_PROMPT },
        ...messages.slice(1).map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        }))
      ];

      const stream = await gatewayChatClient.createStreamingCompletion({
        messages: gatewayMessages,
        model: "openclaw:main", // OpenClaw main agent with tools
        stream: true,
        max_tokens: 2048,
      });

      for await (const chunk of stream) {
        yield chunk;
      }
      return;
    } catch (error) {
      console.error('[streamOllamaWithTools] OpenClaw gateway failed, falling back to direct API:', error);
      // Continue to fallback below
    }
  }
  
  console.log('[streamOllamaWithTools] Using direct Ollama API');
  const ollamaKey = process.env.OLLAMA_API_KEY;
  if (!ollamaKey) {
    yield `data: ${JSON.stringify({ error: 'OLLAMA_API_KEY not configured' })}\n\n`;
    return;
  }

  let iterations = 0;
  let currentMessages = [...messages];

  while (iterations < maxToolIterations) {
    iterations++;
    console.log(`[EXECUTE] Tool iteration ${iterations}/${maxToolIterations}`);

    // Call Ollama and collect full response (non-streaming to check for tool calls)
    try {
      const response = await fetch('https://ollama.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ollamaKey}`,
        },
        body: JSON.stringify({
          model: model,
          stream: false, // Non-streaming to get full response
          messages: currentMessages,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        yield `data: ${JSON.stringify({ error: `Ollama: ${error.slice(0, 200)}` })}\n\n`;
        return;
      }

      const data = await response.json();
      const fullResponse = data.choices?.[0]?.message?.content || '';
      console.log(`[EXECUTE] AI response:`, fullResponse.slice(0, 200));

      // Check for tool call
      const toolCall = parseToolCall(fullResponse);

      if (!toolCall) {
        // No tool call - stream the final response
        console.log(`[EXECUTE] No tool call, streaming final response`);
        yield `data: ${JSON.stringify({ choices: [{ delta: { content: fullResponse } }] })}\n\n`;
        yield `data: [DONE]\n\n`;
        return;
      }

      // Execute the tool
      console.log(`[EXECUTE] Executing tool: ${toolCall.tool}`, toolCall.args);
      yield `data: ${JSON.stringify({ choices: [{ delta: { content: `\n🔧 Executing ${toolCall.tool}...\n` } }] })}\n\n`;

      const toolResult = await executeTool(toolCall);

      if (!toolResult.success) {
        console.error(`[EXECUTE] Tool error:`, toolResult.error);
        yield `data: ${JSON.stringify({ choices: [{ delta: { content: `\n❌ Tool error: ${toolResult.error}\n` } }] })}\n\n`;
        // Add error to context and continue
        currentMessages.push(
          { role: 'assistant', content: fullResponse },
          { role: 'user', content: `Tool error: ${toolResult.error}. Please provide an alternative response or try a different approach.` }
        );
        continue;
      }

      // Add tool result to conversation
      const resultStr = JSON.stringify(toolResult.result, null, 2);
      console.log(`[EXECUTE] Tool result:`, resultStr.slice(0, 500));
      yield `data: ${JSON.stringify({ choices: [{ delta: { content: `\n✅ Got results\n` } }] })}\n\n`;

      currentMessages.push(
        { role: 'assistant', content: fullResponse },
        { role: 'user', content: `Tool "${toolCall.tool}" returned:\n\`\`\`json\n${resultStr}\n\`\`\`\n\nNow provide your final response incorporating this information. Do NOT call another tool unless absolutely necessary.` }
      );

    } catch (error) {
      console.error("[EXECUTE] Error:", error);
      yield `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Tool execution failed' })}\n\n`;
      return;
    }
  }

  yield `data: ${JSON.stringify({ choices: [{ delta: { content: '\n⚠️ Max tool iterations reached' } }] })}\n\n`;
  yield `data: [DONE]\n\n`;
}

// Call Anthropic with streaming (with gateway routing)
async function* streamAnthropic(messages: Array<{role: string, content: string}>, model: string) {
  // Try gateway routing first if available
  if (shouldUseGateway()) {
    console.log('[streamAnthropic] Using gateway routing');
    try {
      const gatewayMessages: ChatMessage[] = [
        { role: 'system', content: OPENCLAW_SYSTEM_PROMPT },
        ...messages.slice(1).map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        }))
      ];

      const stream = await gatewayChatClient.createStreamingCompletion({
        messages: gatewayMessages,
        model: "openclaw:main", // Use OpenClaw main agent
        stream: true,
        max_tokens: 1024,
      });

      for await (const chunk of stream) {
        yield chunk;
      }
      return;
    } catch (error) {
      console.error('[streamAnthropic] Gateway failed, falling back to direct API:', error);
      // Continue to fallback below
    }
  }

  // Fallback to direct Anthropic API
  console.log('[streamAnthropic] Using direct Anthropic API');
  if (!process.env.ANTHROPIC_API_KEY) {
    yield `data: ${JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' })}\n\n`;
    return;
  }

  try {
    const apiMessages = messages.slice(1).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const stream = await anthropic.messages.create({
      model: model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: apiMessages,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield `data: ${JSON.stringify({ choices: [{ delta: { content: event.delta.text } }] })}\n\n`;
      }
    }

    yield `data: [DONE]\n\n`;

  } catch (error) {
    console.error("[Anthropic] Error:", error);
    yield `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Anthropic failed' })}\n\n`;
  }
}

// Main handler
export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log('[Chat API] Request body keys:', Object.keys(body));
  console.log('[Chat API] Messages count:', body.messages?.length || 0);
  
  const {
    message,
    messages: conversationHistory,
    sessionId = 'default',
    isVoice = true,
    personality,
    interactionMode = 'plan',
    model,
    provider,
    memoryContext,
    image,
    pendingPlanId, // Check if user is responding to a pending plan
  } = body;

  // Use request-scoped variables — module-level mutation is unreliable in serverless
  let activeProvider: Provider = DEFAULT_PROVIDER;
  let activeModel: ModelAlias = DEFAULT_MODEL;

  if (provider && ['openclaw', 'ollama', 'anthropic'].includes(provider)) {
    activeProvider = provider as Provider;
  }
  if (model && model in MODELS) {
    activeModel = model as ModelAlias;
  }

  if (!message) {
    return Response.json({ error: 'No message provided' }, { status: 400 });
  }

  // Handle approval responses for pending execution plans
  if (pendingPlanId && message) {
    console.log('[Chat API] Checking for approval response to plan:', pendingPlanId);
    const intent = parseApprovalIntent(message);
    console.log('[Chat API] Detected intent:', intent, 'for message:', message);
    
    if (intent === 'yes') {
      // Approve the plan
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/chat/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: pendingPlanId, action: 'approve' }),
        });
        
        if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
          // Stream the approval execution back
          return response;
        } else {
          const errorData = await response.json();
          return Response.json({ error: errorData.error || 'Failed to approve plan' }, { status: 500 });
        }
      } catch (error) {
        console.error('[Chat API] Approval error:', error);
        return Response.json({ error: 'Failed to approve plan' }, { status: 500 });
      }
    } else if (intent === 'no') {
      // Reject the plan and continue with normal chat
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/chat/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: pendingPlanId, action: 'reject' }),
        });
        
        // Continue with normal PLAN mode conversation asking what to do instead
        const userMessage = isVoice ? VOICE_INSTRUCTIONS + 'Task cancelled. ' + message : 'Task cancelled. ' + message;
        
        // Build native message array for normal chat
        const historyMessages = (conversationHistory || []).slice(-10).map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.text || m.content || ''
        }));
        
        const messages = [
          { role: 'system', content: `${SYSTEM_PROMPT}\n\nYou are in PLAN mode. The user just cancelled a task execution. Ask what they'd like to do instead and help them explore options.` },
          ...historyMessages,
          { role: 'user', content: userMessage }
        ];
        
        const generator = streamOllama(messages, MODELS.kimi.model);
        return createStreamResponse(generator);
        
      } catch (error) {
        console.error('[Chat API] Rejection error:', error);
        // Continue anyway with normal chat
      }
    } else if (intent === 'unclear') {
      // Ask for clarification
      const clarificationMessage = isVoice 
        ? "I didn't catch that. Please say 'yes' to execute or 'no' to cancel."
        : "Please respond with 'yes' to execute the plan or 'no' to cancel.";
        
      return Response.json({
        pendingPlan: {
          id: pendingPlanId,
          message: clarificationMessage,
          plannedActions: ["Waiting for clear yes/no response..."],
          status: 'pending',
          createdAt: new Date(),
          requiresApproval: true,
          toolCallCount: 0,
        }
      });
    }
  }

  // Build user message with context
  let userMessage = message;
  if (isVoice) userMessage = VOICE_INSTRUCTIONS + userMessage;

  // Fetch user memory for context injection
  let userMemoryBlock = '';
  try {
    const memoryRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/memory/get?sessionId=${sessionId}&limit=30`);
    if (memoryRes.ok) {
      const memoryData = await memoryRes.json();
      userMemoryBlock = memoryData.formatted || '';
      if (userMemoryBlock) {
        console.log('[Chat] Injecting user memory:', memoryData.total, 'items');
      }
    }
  } catch (e) {
    console.log('[Chat] Memory fetch skipped:', e instanceof Error ? e.message : 'unknown');
  }

  // Select system prompt based on mode (with memory injection)
  const memorySection = userMemoryBlock ? `\n\n${userMemoryBlock}\n` : '';
  
  const PLAN_PROMPT = `${SYSTEM_PROMPT}${memorySection}\n\nYou are in PLAN mode. Your job is to discuss and strategize. Present options, don't execute without permission.`;

  const EXECUTE_PROMPT = `${SYSTEM_PROMPT}${memorySection}\n\nYou are in EXECUTE mode. Your job is to take action and execute tasks. Be decisive, use tools, provide clear status updates.${getToolsPrompt()}`;

  const systemPrompt = interactionMode === 'execute' ? EXECUTE_PROMPT : PLAN_PROMPT;

  // EXECUTE MODE: Route directly through OpenClaw for tool execution
  console.log('[Chat] EXECUTE mode entered, interactionMode:', interactionMode);
  if (interactionMode === 'execute') {
    // Route through OpenClaw gateway (handles tools natively)
    if (shouldUseGateway()) {
      console.log('[Chat] EXECUTE mode: Using OpenClaw gateway directly');
      
      const historyMessages = (conversationHistory || []).slice(-10).map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.text || m.content || ''
      }));

      // Build user message content - include image if present
      const userContent: any = image 
        ? [
            { type: 'text', text: userMessage || 'What do you see in this image?' },
            { type: 'image_url', image_url: { url: image } }
          ]
        : userMessage;

      const gatewayMessages: ChatMessage[] = [
        ...historyMessages.map((msg: any) => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: userContent }
      ];

      try {
        const stream = await gatewayChatClient.createStreamingCompletion({
          messages: gatewayMessages,
          model: "openclaw:main",
          stream: true,
          max_tokens: 4096,
        });

        return createStreamResponse(stream);
      } catch (error) {
        console.error('[Chat] OpenClaw gateway failed:', error);
        // Fall through to local execution below
      }
    }

    // Fallback: Local execution with tools
    console.log('[Chat] EXECUTE mode: Using local tool execution');
    {
      const historyMessages = (conversationHistory || []).slice(-10).map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.text || m.content || ''
      }));

      const messages = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userMessage + '\n[MODE: EXECUTE] Execute tasks using available tools.' }
      ];

      const generator = streamOllamaWithTools(messages, MODELS.kimi.model);
      return createStreamResponse(generator);
    }
  }

  // PLAN MODE: Fast streaming via Ollama (with OpenClaw gateway routing)
  const historyMessages = (conversationHistory || []).slice(-10).map((m: any) => ({
    role: m.role as 'user' | 'assistant',
    content: m.text || m.content || ''
  }));
  
  console.log('[Chat] Plan mode - history count:', historyMessages.length);

  // Build user content with optional image
  const planUserContent: any = image
    ? [
        { type: 'text', text: userMessage },
        { type: 'image_url', image_url: { url: image } }
      ]
    : userMessage;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: planUserContent }
  ];
  
  const generator = streamOllama(messages, MODELS.kimi.model);
  return createStreamResponse(generator);
}
