#!/usr/bin/env node
/**
 * Test script for Telegram Webhook endpoint
 * 
 * Usage:
 *   node test-telegram-webhook.js
 *   node test-telegram-webhook.js http://localhost:3000
 */

const https = require('https');
const http = require('http');
const url = require('url');

// Configuration
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const WEBHOOK_URL = `${BASE_URL}/api/telegram/webhook`;

// Test payloads
const testCases = [
  {
    name: 'Valid user message',
    payload: {
      message: 'Hello from Telegram test!',
      sender: 'wes',
      timestamp: new Date().toISOString(),
      sessionId: 'test-session-001'
    },
    expectedStatus: 200
  },
  {
    name: 'Valid assistant message',
    payload: {
      message: 'This is a response from the AI assistant.',
      sender: 'opie',
      timestamp: new Date().toISOString(),
      sessionId: 'test-session-001'
    },
    expectedStatus: 200
  },
  {
    name: 'Missing message field',
    payload: {
      sender: 'wes',
      timestamp: new Date().toISOString(),
    },
    expectedStatus: 400
  },
  {
    name: 'Missing sender field',
    payload: {
      message: 'Test message without sender',
      timestamp: new Date().toISOString(),
    },
    expectedStatus: 400
  },
  {
    name: 'Default sessionId test',
    payload: {
      message: 'Test with default session ID',
      sender: 'wes',
    },
    expectedStatus: 200
  }
];

// Helper function to make HTTP requests
function makeRequest(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test health check endpoint
async function testHealthCheck() {
  console.log('\n🔍 Testing health check endpoint...');
  try {
    const response = await makeRequest('GET', WEBHOOK_URL);
    console.log(`✅ GET ${WEBHOOK_URL}`);
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${response.body.slice(0, 200)}`);
    return response.statusCode === 200;
  } catch (error) {
    console.log(`❌ GET ${WEBHOOK_URL} failed:`, error.message);
    return false;
  }
}

// Test webhook endpoint
async function testWebhook() {
  console.log('\n🚀 Testing webhook endpoint...');
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      console.log(`\n📝 Testing: ${testCase.name}`);
      const response = await makeRequest('POST', WEBHOOK_URL, testCase.payload);
      
      const success = response.statusCode === testCase.expectedStatus;
      console.log(`   ${success ? '✅' : '❌'} Expected: ${testCase.expectedStatus}, Got: ${response.statusCode}`);
      
      let responseData;
      try {
        responseData = JSON.parse(response.body);
        console.log(`   Response: ${JSON.stringify(responseData, null, 2)}`);
      } catch (e) {
        console.log(`   Raw response: ${response.body.slice(0, 200)}`);
      }

      if (success) {
        passed++;
      } else {
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ${testCase.name} failed:`, error.message);
      failed++;
    }
  }

  return { passed, failed };
}

// Main test runner
async function runTests() {
  console.log('🧪 Telegram Webhook Test Suite');
  console.log('================================');
  console.log(`Target URL: ${WEBHOOK_URL}`);

  // Test health check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Health check failed. Is the server running?');
    process.exit(1);
  }

  // Test webhook functionality
  const { passed, failed } = await testWebhook();

  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${passed}/${passed + failed} (${Math.round(passed / (passed + failed) * 100)}%)`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed!');
    process.exit(1);
  }
}

// cURL examples
function printCurlExamples() {
  console.log('\n📋 cURL Examples:');
  console.log('=================');
  
  console.log('\n# Health check:');
  console.log(`curl -X GET ${WEBHOOK_URL}`);
  
  console.log('\n# Send user message:');
  console.log(`curl -X POST ${WEBHOOK_URL} \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello from Telegram!",
    "sender": "wes",
    "timestamp": "${new Date().toISOString()}",
    "sessionId": "test-session"
  }'`);

  console.log('\n# Send assistant message:');
  console.log(`curl -X POST ${WEBHOOK_URL} \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "How can I help you?",
    "sender": "opie",
    "sessionId": "test-session"
  }'`);
}

// Check command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node test-telegram-webhook.js [BASE_URL]');
  console.log('       node test-telegram-webhook.js --curl');
  console.log('');
  console.log('Examples:');
  console.log('  node test-telegram-webhook.js');
  console.log('  node test-telegram-webhook.js http://localhost:3000');
  console.log('  node test-telegram-webhook.js https://myapp.vercel.app');
  console.log('  node test-telegram-webhook.js --curl');
  process.exit(0);
}

if (process.argv.includes('--curl')) {
  printCurlExamples();
  process.exit(0);
}

// Run the tests
runTests().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});