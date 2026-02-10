// Test script for OpenClaw gateway integration
// This tests the new gateway routing functionality

async function testGatewayIntegration() {
  console.log('Testing OpenClaw Gateway Integration...\n');
  
  // Test the gateway chat client
  try {
    // Import using dynamic import since this is a test file
    const { shouldUseGateway, gatewayChatClient } = await import('./src/lib/gateway-chat.ts');
    
    console.log('1. Testing gateway availability check...');
    const isAvailable = shouldUseGateway();
    console.log('   Gateway available:', isAvailable);
    console.log('   OPENCLAW_GATEWAY_URL:', process.env.OPENCLAW_GATEWAY_URL || 'not set');
    console.log('   GATEWAY_TOKEN:', process.env.GATEWAY_TOKEN ? 'set' : 'not set');
    
    if (isAvailable) {
      console.log('\n2. Testing simple chat completion...');
      
      // Test a simple non-streaming completion
      const testRequest = {
        messages: [
          { role: 'user', content: 'Hello, this is a test message. Please respond with "Gateway test successful".' }
        ],
        model: 'claude-sonnet-4-20250514',
        stream: false,
        max_tokens: 100,
        temperature: 0.1
      };
      
      try {
        const response = await gatewayChatClient.createCompletion(testRequest);
        console.log('   Response:', response.content.substring(0, 100) + '...');
        console.log('   ✅ Non-streaming completion successful');
      } catch (error) {
        console.log('   ❌ Non-streaming completion failed:', error.message);
      }
      
      console.log('\n3. Testing streaming completion...');
      
      // Test a streaming completion
      const streamRequest = {
        ...testRequest,
        stream: true
      };
      
      try {
        const stream = await gatewayChatClient.createStreamingCompletion(streamRequest);
        let chunks = 0;
        let content = '';
        
        for await (const chunk of stream) {
          chunks++;
          if (chunk.includes('"content"')) {
            try {
              const data = chunk.replace(/^data: /, '').replace(/\n\n$/, '');
              if (data !== '[DONE]') {
                const parsed = JSON.parse(data);
                content += parsed.choices?.[0]?.delta?.content || '';
              }
            } catch (e) {
              // Ignore parse errors for test
            }
          }
          if (chunks >= 5) break; // Don't run forever
        }
        
        console.log('   Chunks received:', chunks);
        console.log('   Content sample:', content.substring(0, 50) + '...');
        console.log('   ✅ Streaming completion successful');
      } catch (error) {
        console.log('   ❌ Streaming completion failed:', error.message);
      }
    } else {
      console.log('\n⚠️  Gateway not available - this is expected in local development');
      console.log('   The application will fall back to direct API calls');
    }
    
    console.log('\n4. Testing fallback behavior...');
    
    // Test chat route with a sample request
    const chatResponse = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test message for gateway routing',
        model: 'sonnet',
        provider: 'anthropic',
        interactionMode: 'plan'
      }),
    });
    
    if (chatResponse.ok) {
      console.log('   ✅ Chat API responding correctly');
    } else {
      console.log('   ❌ Chat API error:', chatResponse.status, chatResponse.statusText);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGatewayIntegration().catch(console.error);
}

export { testGatewayIntegration };