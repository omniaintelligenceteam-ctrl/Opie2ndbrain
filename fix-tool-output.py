#!/usr/bin/env python3
import re

with open('src/app/api/chat/route.ts', 'r') as f:
    content = f.read()

# 1. Find and replace the "Executing" line with conditional
old_exec = 'yield `data: ${JSON.stringify({ choices: [{ delta: { content: `\\n🔧 Executing ${toolCall.tool}...\\n` } }] })}\\n\\n`'
new_exec = '''// Show "Working..." only once on first tool
      if (iterations === 1) {
        yield `data: ${JSON.stringify({ choices: [{ delta: { content: `⚡ Working...\\n` } }] })}\\n\\n`;
      }'''

content = content.replace(old_exec, new_exec)

# 2. Remove the error message yield
old_error = 'yield `data: ${JSON.stringify({ choices: [{ delta: { content: `\\n❌ Tool error: ${toolResult.error}\\n` } }] })}\\n\\n`;'
new_error = '// Error message suppressed - continue silently'
content = content.replace(old_error, new_error)

# 3. Remove the "Got results" yield  
old_result = 'yield `data: ${JSON.stringify({ choices: [{ delta: { content: `\\n✅ Got results\\n` } }] })}\\n\\n`'
new_result = '// Results received - continuing silently'
content = content.replace(old_result, new_result)

with open('src/app/api/chat/route.ts', 'w') as f:
    f.write(content)

print('Fixed tool output messages')
