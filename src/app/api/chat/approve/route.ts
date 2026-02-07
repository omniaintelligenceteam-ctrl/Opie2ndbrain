import { NextRequest } from 'next/server';
import { ExecutionPlanStore } from '@/lib/execution-plans';
import { executeTool } from '@/lib/tools';

// Force Node.js runtime for full env var access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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

// Helper to format tool results for display
function formatToolResult(tool: string, result: any): string {
  if (!result) return '';
  
  // Convert result to string if it's not already
  const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  
  // Handle different tool types with appropriate formatting
  switch (tool) {
    case 'memory_search':
      if (typeof result === 'object' && result.results) {
        const count = result.results.length;
        let formatted = `**Found ${count} result${count !== 1 ? 's' : ''}:**\n\n`;
        result.results.forEach((item: any, index: number) => {
          formatted += `**${index + 1}.** ${item.title || item.content || item}\n`;
          if (item.content && item.title) {
            formatted += `   ${item.content.substring(0, 100)}${item.content.length > 100 ? '...' : ''}\n`;
          }
          formatted += '\n';
        });
        return formatted;
      }
      break;
      
    case 'shell_exec':
    case 'git_status':
      // Format shell output in code block
      return `\`\`\`\n${resultStr.trim()}\n\`\`\`\n`;
      
    case 'web_search':
      if (typeof result === 'object' && result.results) {
        let formatted = `**Found ${result.results.length} search results:**\n\n`;
        result.results.slice(0, 5).forEach((item: any, index: number) => {
          formatted += `**${index + 1}.** [${item.title}](${item.url})\n`;
          if (item.snippet) {
            formatted += `   ${item.snippet}\n`;
          }
          formatted += '\n';
        });
        return formatted;
      }
      break;
      
    case 'file_read':
    case 'file_write':
      if (resultStr.length > 500) {
        return `\`\`\`\n${resultStr.substring(0, 500)}...\n\`\`\`\n`;
      } else {
        return `\`\`\`\n${resultStr}\n\`\`\`\n`;
      }
      
    default:
      // Generic formatting for other tools
      if (resultStr.length > 300) {
        return `\`\`\`\n${resultStr.substring(0, 300)}...\n\`\`\`\n`;
      } else {
        return `**Result:** ${resultStr}\n`;
      }
  }
  
  // Fallback formatting
  return `**Result:** ${resultStr}\n`;
}

// Execute a plan's tool calls with streaming feedback
async function* executePlan(plan: any): AsyncGenerator<string> {
  try {
    // Mark as executing
    ExecutionPlanStore.updateStatus(plan.id, 'executing');
    
    yield `data: ${JSON.stringify({ choices: [{ delta: { content: `🚀 **Executing Plan: ${plan.message}**\n\n` } }] })}\n\n`;
    
    const results = [];
    
    // Execute each tool call
    for (let i = 0; i < plan.toolCalls.length; i++) {
      const toolCall = plan.toolCalls[i];
      
      yield `data: ${JSON.stringify({ choices: [{ delta: { content: `**${i + 1}.** ${toolCall.description}\n` } }] })}\n\n`;
      yield `data: ${JSON.stringify({ choices: [{ delta: { content: `🔧 Executing \`${toolCall.tool}\`...\n` } }] })}\n\n`;
      
      const result = await executeTool(toolCall);
      
      if (result.success) {
        yield `data: ${JSON.stringify({ choices: [{ delta: { content: `✅ Success\n\n` } }] })}\n\n`;
        
        // Format and display the actual result
        const formattedResult = formatToolResult(toolCall.tool, result.result);
        if (formattedResult.trim()) {
          yield `data: ${JSON.stringify({ choices: [{ delta: { content: formattedResult } }] })}\n\n`;
        }
        
        results.push({ tool: toolCall.tool, success: true, result: result.result });
      } else {
        yield `data: ${JSON.stringify({ choices: [{ delta: { content: `❌ Error: ${result.error}\n\n` } }] })}\n\n`;
        results.push({ tool: toolCall.tool, success: false, error: result.error });
        
        // Continue with other tools even if one fails
      }
      
      // Small delay between tools for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary with results overview
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    yield `data: ${JSON.stringify({ choices: [{ delta: { content: `\n---\n\n**✨ Execution Complete**\n\n` } }] })}\n\n`;
    
    // Summary of all successful results
    if (successCount > 0) {
      yield `data: ${JSON.stringify({ choices: [{ delta: { content: `**Summary of Results:**\n\n` } }] })}\n\n`;
      
      results.forEach((r, i) => {
        if (r.success) {
          const toolCall = plan.toolCalls[i];
          yield `data: ${JSON.stringify({ choices: [{ delta: { content: `✅ **${toolCall.tool}**: ${toolCall.description}\n` } }] })}\n\n`;
        } else {
          const toolCall = plan.toolCalls[i];
          yield `data: ${JSON.stringify({ choices: [{ delta: { content: `❌ **${toolCall.tool}**: ${r.error}\n` } }] })}\n\n`;
        }
      });
      
      yield `data: ${JSON.stringify({ choices: [{ delta: { content: `\n` } }] })}\n\n`;
    }
    
    yield `data: ${JSON.stringify({ choices: [{ delta: { content: `Successfully executed ${successCount}/${totalCount} actions.\n\n` } }] })}\n\n`;
    
    if (successCount === totalCount) {
      yield `data: ${JSON.stringify({ choices: [{ delta: { content: `🎉 All actions completed successfully! The task has been executed as planned.` } }] })}\n\n`;
    } else {
      yield `data: ${JSON.stringify({ choices: [{ delta: { content: `⚠️ Some actions encountered errors, but others completed successfully. Review the results above.` } }] })}\n\n`;
    }
    
    // Update plan status
    ExecutionPlanStore.updateStatus(plan.id, 'completed', { result: results });
    
    yield `data: [DONE]\n\n`;
    
  } catch (error) {
    console.error('[Approve] Execution error:', error);
    yield `data: ${JSON.stringify({ choices: [{ delta: { content: `\n❌ **Execution Failed**\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n` } }] })}\n\n`;
    
    ExecutionPlanStore.updateStatus(plan.id, 'error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    yield `data: [DONE]\n\n`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { planId, action } = await req.json();
    
    if (!planId || !action) {
      return Response.json({ error: 'Missing planId or action' }, { status: 400 });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Action must be "approve" or "reject"' }, { status: 400 });
    }
    
    console.log(`[Approve] Received ${action} for plan ${planId}`);
    
    // Get the plan
    const plan = ExecutionPlanStore.get(planId);
    if (!plan) {
      return Response.json({ error: 'Plan not found or expired' }, { status: 404 });
    }
    
    if (plan.status !== 'pending') {
      return Response.json({ error: `Plan is ${plan.status}, cannot ${action}` }, { status: 400 });
    }
    
    if (action === 'reject') {
      // Reject the plan
      ExecutionPlanStore.updateStatus(planId, 'rejected');
      return Response.json({ 
        success: true, 
        message: 'Plan rejected and discarded',
        action: 'rejected'
      });
    }
    
    if (action === 'approve') {
      // Mark as approved and start execution stream
      ExecutionPlanStore.updateStatus(planId, 'approved');
      
      console.log(`[Approve] Executing plan with ${plan.toolCalls.length} tool calls`);
      
      // Return streaming execution
      const generator = executePlan(plan);
      return createStreamResponse(generator);
    }
    
    return Response.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('[Approve] API error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}