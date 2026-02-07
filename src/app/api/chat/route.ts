import { NextRequest } from 'next/server';
import { PersonalityParameters, parametersToApiConfig } from '@/lib/personalityTypes';
import Anthropic from '@anthropic-ai/sdk';
import { TOOLS, getToolsPrompt, executeTool } from '@/lib/tools';
import { supabaseAdmin } from '@/lib/supabase';
import { ExecutionPlanStore, type ToolCall } from '@/lib/execution-plans';

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

// Call Ollama with streaming
async function* streamOllama(messages: Array<{role: string, content: string}>, model: string) {
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
  const ollamaKey = process.env.OLLAMA_API_KEY;
  if (!ollamaKey) {
    return { success: false, error: 'OLLAMA_API_KEY not configured' };
  }

  try {
    const planningPrompt = `
VOICE-FRIENDLY PLANNING MODE: Create a simple execution plan for voice approval.

Based on the user's request, create a simple plan in this EXACT JSON format:
{
  "plannedActions": [
    "Simple 1-2 sentence summary ending with 'Execute?'"
  ],
  "toolCalls": [
    {
      "tool": "tool_name",
      "args": {"param": "value"},
      "description": "Human-readable description of what this tool call will do"
    }
  ]
}

IMPORTANT RULES:
- plannedActions should contain ONLY ONE item: a simple 1-2 sentence summary of what you'll do, ending with "Execute?"
- Example: "I'll search your memory for GitHub information and check your recent commits. Execute?"
- Do NOT list detailed steps - keep it conversational and brief for voice interaction
- toolCalls should still be complete and accurate for actual execution
- Your ENTIRE response must be valid JSON

User's request: "${messages[messages.length - 1]?.content || ''}"

Available tools: ${Object.keys(TOOLS).join(', ')}
    `;

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
        temperature: 0.3, // Lower temperature for more consistent JSON
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Planning API error: ${response.status}` };
    }

    const data = await response.json();
    const planText = data.choices?.[0]?.message?.content || '';
    
    console.log('[Planning] Raw AI response:', planText.slice(0, 500));

    // Try to extract JSON from the response
    let planJson;
    try {
      // Look for JSON between ```json and ``` or just find the JSON object
      const jsonMatch = planText.match(/```json\s*([\s\S]*?)\s*```/) || planText.match(/(\{[\s\S]*\})/);
      const jsonString = jsonMatch ? jsonMatch[1] : planText;
      planJson = JSON.parse(jsonString.trim());
    } catch (e) {
      console.error('[Planning] Failed to parse JSON:', e);
      return { success: false, error: 'Failed to parse execution plan from AI response' };
    }

    if (!planJson.plannedActions || !Array.isArray(planJson.plannedActions)) {
      return { success: false, error: 'Invalid plan format: missing plannedActions' };
    }

    if (!planJson.toolCalls || !Array.isArray(planJson.toolCalls)) {
      return { success: false, error: 'Invalid plan format: missing toolCalls' };
    }

    // Validate tool calls
    for (const toolCall of planJson.toolCalls) {
      if (!toolCall.tool || !TOOLS[toolCall.tool]) {
        return { success: false, error: `Invalid tool: ${toolCall.tool}` };
      }
      if (!toolCall.args || typeof toolCall.args !== 'object') {
        return { success: false, error: `Invalid args for tool ${toolCall.tool}` };
      }
      if (!toolCall.description || typeof toolCall.description !== 'string') {
        return { success: false, error: `Missing description for tool ${toolCall.tool}` };
      }
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
    console.error('[Planning] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Planning failed' };
  }
}

// Call Ollama with tool execution loop (for EXECUTE mode)
async function* streamOllamaWithTools(
  messages: Array<{ role: string; content: string }>,
  model: string,
  maxToolIterations = 25
): AsyncGenerator<string> {
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

// Call Anthropic with streaming
async function* streamAnthropic(messages: Array<{role: string, content: string}>, model: string) {
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

  // EXECUTE MODE: Generate execution plan (approval gate)
  console.log('[Chat] EXECUTE mode entered, interactionMode:', interactionMode);
  if (interactionMode === 'execute') {
    // Option A: Generate execution plan for approval (new approval gate system) - default
    const useApprovalGate = process.env.EXECUTE_APPROVAL_GATE !== 'false';

    if (useApprovalGate) {
      console.log('[Chat] EXECUTE mode: Generating execution plan for approval');
      
      // Build native message array (proper multi-turn format)
      const historyMessages = (conversationHistory || []).slice(-10).map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.text || m.content || ''
      }));
      
      console.log('[Chat] Native message array - history count:', historyMessages.length);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userMessage }
      ];

      // Generate execution plan
      const planResult = await generateExecutionPlan(messages, sessionId);
      
      if (!planResult.success) {
        console.error('[Chat] Failed to generate execution plan:', planResult.error);
        return Response.json({ 
          error: 'Failed to generate execution plan', 
          details: planResult.error 
        }, { status: 500 });
      }

      // Store the plan
      const executionPlan = ExecutionPlanStore.create({
        sessionId,
        message: planResult.plan!.message,
        plannedActions: planResult.plan!.plannedActions,
        toolCalls: planResult.plan!.toolCalls,
      });

      console.log(`[Chat] Created execution plan ${executionPlan.id} with ${executionPlan.toolCalls.length} tool calls`);

      // Return plan for approval
      return Response.json({
        pendingPlan: {
          id: executionPlan.id,
          message: executionPlan.message,
          plannedActions: executionPlan.plannedActions,
          status: executionPlan.status,
          createdAt: executionPlan.createdAt,
          requiresApproval: true,
          toolCallCount: executionPlan.toolCalls.length,
        }
      });
    }
    
    // Option B: Direct execution without approval (fallback when EXECUTE_APPROVAL_GATE=false)
    const useLocalExecution = true; // Keep the existing direct execution as fallback

    if (useLocalExecution) {
      console.log('[Chat] EXECUTE mode: Using direct tool execution (no approval)');
      
      // Build native message array (proper multi-turn format)
      const historyMessages = (conversationHistory || []).slice(-10).map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.text || m.content || ''
      }));
      
      console.log('[Chat] Native message array - history count:', historyMessages.length);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userMessage + '\n[MODE: EXECUTE] Execute tasks using available tools.' }
      ];

      const generator = streamOllamaWithTools(messages, MODELS.kimi.model);
      return createStreamResponse(generator);
    }

    // Option B: Remote execution via OpenClaw (fallback when EXECUTE_LOCAL=false)
    console.log('[Chat] EXECUTE mode: Using OpenClaw delegation');
    const requestId = crypto.randomUUID();

    // Check if Supabase is configured
    if (!supabaseAdmin) {
      return Response.json({ error: 'Supabase not configured for EXECUTE mode' }, { status: 503 });
    }

    try {
      // 1. Write pending task to Supabase
      await supabaseAdmin.from('opie_requests').insert({
        request_id: requestId,
        user_message: message,
        status: 'pending',
        source: 'web_app',
        created_at: new Date().toISOString(),
      });

      // 2. Build task with conversation context
      let taskMessage = `[WEB APP REQUEST] User says: "${message}"`;

      if (conversationHistory && conversationHistory.length > 0) {
        const context = conversationHistory
          .slice(-5) // Last 5 messages
          .map((m: { role: string; text?: string; content?: string }) => `${m.role}: ${m.text || m.content || ''}`)
          .join('\n');
        taskMessage += `\n\nCONVERSATION CONTEXT:\n${context}`;
      }

      taskMessage += `\n\nExecute with full tools. Write final response to Supabase request_id: ${requestId}`;

      // Spawn task to me (agent:main)
      const spawnRes = await fetch(`${OPENCLAW_GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({
          tool: 'sessions_spawn',
          args: {
            task: taskMessage,
            label: `webapp:${requestId}`,
            timeoutSeconds: 180,
            cleanup: 'keep',
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      const spawnData = await spawnRes.json();

      // 3. Update with session info
      if (spawnData.ok && spawnData.result?.sessionKey) {
        await supabaseAdmin.from('opie_requests').update({
          session_id: spawnData.result.sessionKey,
        }).eq('request_id', requestId);
      }

      // 4. Return async response for polling
      return Response.json({
        mode: 'async',
        request_id: requestId,
        poll_url: `/api/chat/poll?request_id=${requestId}`,
        message: 'Task sent to G - checking for result...',
      });

    } catch (error) {
      console.error('[Chat] EXECUTE spawn error:', error);
      return Response.json({
        error: 'Failed to spawn task',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }

  // PLAN MODE: Fast streaming via Ollama
  // Build native message array (proper multi-turn format)
  const historyMessages = (conversationHistory || []).slice(-10).map((m: any) => ({
    role: m.role as 'user' | 'assistant',
    content: m.text || m.content || ''
  }));
  
  console.log('[Chat] Plan mode - native message array, history count:', historyMessages.length);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: userMessage + '\n[MODE: Plan] Discuss ideas but do NOT execute actions.' }
  ];
  
  const generator = streamOllama(messages, MODELS.kimi.model);
  return createStreamResponse(generator);
}
