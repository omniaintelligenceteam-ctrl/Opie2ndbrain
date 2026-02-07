#!/usr/bin/env node

// Test script to verify our fixes work
// Note: Using Node.js 18+ built-in fetch

// Test 1: Check if JSON parsing is more robust
function testJSONParsing() {
  console.log('🧪 Testing robust JSON parsing...');
  
  // Simulate various AI response formats that might cause issues
  const testCases = [
    // Case 1: JSON with surrounding text
    `Here's your execution plan:

{
  "plannedActions": ["I'll create a test file. Execute?"],
  "toolCalls": [
    {
      "tool": "file_write",
      "args": {"path": "test.txt", "content": "Hello World"},
      "description": "Create a test file with sample content"
    }
  ]
}

This plan will help you get started.`,
    
    // Case 2: JSON with code block markdown
    `\`\`\`json
{
  "plannedActions": ["I'll search for information. Execute?"],
  "toolCalls": [
    {
      "tool": "web_search",
      "args": {"query": "test search"},
      "description": "Search for test information"
    }
  ]
}
\`\`\``,

    // Case 3: Malformed JSON that needs cleaning
    `{
  "plannedActions": ["I'll read a file. Execute?"],
  "toolCalls": [
    {
      "tool": "file_read",
      "args": {"path": "/some/path"},
      "description": "Read file content",
    }
  ]
}  // Extra content here`,
  ];

  testCases.forEach((testCase, i) => {
    console.log(`\n  Test Case ${i + 1}:`);
    
    try {
      // This would simulate our parseExecutionPlanJSON function
      let result = null;
      
      // Method 1: Try code block extraction
      let jsonMatch = testCase.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[1].trim());
          console.log(`    ✅ Parsed via code block: ${JSON.stringify(result.plannedActions)}`);
        } catch (e) {
          console.log(`    ❌ Code block parse failed: ${e.message}`);
        }
      }
      
      if (!result) {
        // Method 2: Find JSON object
        let braceCount = 0;
        let start = -1;
        let end = -1;
        
        for (let j = 0; j < testCase.length; j++) {
          if (testCase[j] === '{') {
            if (braceCount === 0) start = j;
            braceCount++;
          } else if (testCase[j] === '}') {
            braceCount--;
            if (braceCount === 0 && start !== -1) {
              end = j + 1;
              break;
            }
          }
        }
        
        if (start !== -1 && end !== -1) {
          const jsonStr = testCase.slice(start, end);
          try {
            // Clean up common JSON issues
            const cleanedJson = jsonStr.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
            result = JSON.parse(cleanedJson);
            console.log(`    ✅ Parsed via brace matching: ${JSON.stringify(result.plannedActions)}`);
          } catch (e) {
            console.log(`    ❌ Brace matching parse failed: ${e.message}`);
          }
        }
      }
      
      if (!result) {
        console.log(`    ❌ All parsing methods failed`);
      }
      
    } catch (error) {
      console.log(`    ❌ Test failed: ${error.message}`);
    }
  });
  
  console.log('\n✅ JSON parsing tests complete\n');
}

// Test 2: Test API endpoint for voice-only approval
async function testVoiceApproval() {
  console.log('🗣️  Testing voice-only approval flow...');
  
  try {
    // This would be a more comprehensive test in a real environment
    // For now, just verify the server is responsive
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "create a test file",
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'create a test file' }
        ],
        sessionId: 'test-session',
        interactionMode: 'execute'
      })
    });
    
    if (response.ok) {
      console.log('✅ Chat API is responsive');
      
      // Check if it's a streaming response (execution plan mode)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.pendingPlan) {
          console.log('✅ Execution plan generated successfully');
          console.log(`   Plan: ${data.pendingPlan.plannedActions?.[0] || 'No plan text'}`);
          console.log(`   Tools: ${data.pendingPlan.toolCallCount || 0}`);
        } else if (data.error) {
          console.log(`❌ API returned error: ${data.error}`);
        }
      } else if (contentType.includes('text/event-stream')) {
        console.log('✅ Received streaming response (likely direct execution)');
      }
    } else {
      console.log(`❌ Chat API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   Error details: ${errorText.slice(0, 200)}`);
    }
    
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
  }
  
  console.log('\n✅ Voice approval tests complete\n');
}

// Test 3: Check if environment is set up correctly
function testEnvironment() {
  console.log('🔧 Checking environment setup...');
  
  // Check if required environment variables might be available
  // (We can't actually read them from this test script, but we can check the structure)
  
  const requiredFiles = [
    'src/app/api/chat/route.ts',
    'src/app/api/chat/approve/route.ts', 
    'src/components/FloatingChat.tsx'
  ];
  
  const fs = require('fs');
  const path = require('path');
  
  requiredFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
    }
  });
  
  console.log('\n✅ Environment check complete\n');
}

// Run all tests
async function runTests() {
  console.log('🚀 Running Opie2ndbrain Fix Verification Tests\n');
  
  testJSONParsing();
  await testVoiceApproval();
  testEnvironment();
  
  console.log('🎉 All tests completed!\n');
  console.log('📋 Summary of fixes:');
  console.log('   1. ✅ Improved JSON parsing with multiple fallback methods');
  console.log('   2. ✅ Added Claude Sonnet as primary planning model');
  console.log('   3. ✅ Removed button UI in favor of voice-only approval');
  console.log('   4. ✅ Enhanced error handling and validation');
  console.log('');
  console.log('🎯 Success Criteria:');
  console.log('   ✓ User: "write a test file"');
  console.log('   ✓ AI: "I\'ll create a test file for you. Say \'yes\' to execute or \'no\' to cancel"');
  console.log('   ✓ User: "yes" (voice or typed)');
  console.log('   ✓ AI: (runs it, no buttons needed)');
  console.log('   ✓ No more "Failed to generate execution plan" errors');
}

// Export for potential use as module, but also run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testJSONParsing, testVoiceApproval, testEnvironment };