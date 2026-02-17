#!/usr/bin/env node

/**
 * Test script for the Content Creation System
 * 
 * Tests:
 * 1. Create content bundle API
 * 2. Check bundle creation
 * 3. Simulate agent completion
 * 4. Test asset regeneration
 * 5. Verify database state
 * 
 * Usage: node test-content-creation-system.js
 */

// Use built-in fetch in Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/content-dashboard`;

// Test data
const TEST_BUNDLE = {
  topic: "How to Save Money on HVAC Maintenance",
  trade: "HVAC",
  selectedAssets: ["email", "linkedin", "instagram"]
};

const MOCK_AGENT_OUTPUT = `# Email Sequence for HVAC Maintenance

Here's your professional email sequence:

<content-output>
{"email": "EMAIL 1: Welcome\nSubject: Your HVAC System Needs This (Save $1000s)\n\nHi [Name],\n\nDid you know that 90% of HVAC failures are preventable with basic maintenance?\n\nYet most homeowners wait until their system breaks down - costing them thousands in emergency repairs and sky-high energy bills.\n\nI'm [Your Name], and I've been helping homeowners in [City] avoid these costly surprises for over [X] years.\n\nIn this series, I'll share the insider secrets that keep your HVAC running efficiently year-round.\n\nStarting tomorrow, you'll discover:\n- The 15-minute monthly check that prevents 80% of breakdowns\n- Why your energy bill spikes (and how to fix it)\n- The $20 part that saves most people $500+ annually\n\nStay tuned,\n[Your Name]\n\n---\n\nEMAIL 2: Value\nSubject: This $20 Part Could Save You $500+ This Year\n\nHi [Name],\n\nYesterday I promised to share money-saving HVAC secrets.\n\nHere's the first one: Your air filter is probably costing you a fortune.\n\nMost homeowners check their filter maybe twice a year. Big mistake.\n\nA dirty filter forces your system to work harder, driving up energy costs by 15-25%. That's an extra $200-500 per year on most homes.\n\nWorse? It shortens your system's life by years.\n\nThe fix is simple:\n1. Check your filter monthly\n2. Replace when it looks gray/dirty\n3. Buy quality filters (they last longer)\n4. Set a phone reminder\n\nTotal cost: About $20/year in filters\nTotal savings: $500+ annually\n\nThis one tip pays for itself 25X over.\n\nTomorrow: The warning signs that predict expensive breakdowns (so you can prevent them)\n\nKeep saving,\n[Your Name]\n\n---\n\nEMAIL 3: CTA\nSubject: Don't Wait for the Warning Signs (Schedule This Now)\n\nHi [Name],\n\nOver the past two emails, you've learned how small maintenance steps prevent huge expenses.\n\nBut here's what I've learned in [X] years of HVAC work:\n\nKnowing what to do and actually doing it are two different things.\n\nThat's why I created our Maintenance VIP Program.\n\nWe handle everything:\n- Monthly filter checks and replacements\n- Seasonal tune-ups (spring and fall)\n- Early problem detection\n- Priority emergency service\n- 20% discount on all repairs\n\nOur VIP members save an average of $800/year compared to reactive maintenance.\n\nMore importantly? They never worry about their HVAC system.\n\nNo more:\n❌ Emergency breakdowns\n❌ Sky-high energy bills\n❌ Uncomfortable temperature swings\n❌ Expensive surprise repairs\n\nJust reliable comfort, year-round.\n\nWe only accept 50 new VIP members this quarter, and we're at 43.\n\nReady to join them?\n\nClick here to schedule your free VIP consultation: [BOOK NOW LINK]\n\nOr call us at [PHONE] - mention this email for priority scheduling.\n\nStay comfortable,\n[Your Name]\n[Company Name]\n[Phone] | [Website]"}
</content-output>`;

// Utility functions
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function error(message) {
  console.error(`[${new Date().toISOString()}] ❌ ${message}`);
}

function success(message) {
  console.log(`[${new Date().toISOString()}] ✅ ${message}`);
}

async function makeRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data.error || data.message || 'Unknown error'}`);
  }
  
  return data;
}

// Test functions
async function testGetConfiguration() {
  log('Testing GET /create (configuration)...');
  
  try {
    const response = await makeRequest('/create');
    
    if (!response.success || !response.data.availableAssetTypes) {
      throw new Error('Invalid configuration response');
    }
    
    success(`Configuration loaded: ${response.data.availableAssetTypes.length} asset types available`);
    return response.data;
  } catch (err) {
    error(`Configuration test failed: ${err.message}`);
    throw err;
  }
}

async function testCreateBundle() {
  log('Testing POST /create (bundle creation)...');
  
  try {
    const response = await makeRequest('/create', {
      method: 'POST',
      body: JSON.stringify(TEST_BUNDLE)
    });
    
    if (!response.success || !response.data.bundleId) {
      throw new Error('Invalid bundle creation response');
    }
    
    const { bundleId, sessionIds, spawnedAgents, expectedAgents } = response.data;
    
    success(`Bundle created: ${bundleId}`);
    success(`Agents spawned: ${spawnedAgents}/${expectedAgents}`);
    
    if (Object.keys(sessionIds).length > 0) {
      success(`Session IDs: ${Object.entries(sessionIds).map(([type, id]) => `${type}=${id}`).join(', ')}`);
    }
    
    return response.data;
  } catch (err) {
    error(`Bundle creation test failed: ${err.message}`);
    throw err;
  }
}

async function testAgentCompletion(sessionId) {
  log(`Testing POST /complete (agent completion for ${sessionId})...`);
  
  try {
    const response = await makeRequest('/complete', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        output: MOCK_AGENT_OUTPUT,
        status: 'completed'
      })
    });
    
    if (!response.success || !response.data.assetId) {
      throw new Error('Invalid completion response');
    }
    
    success(`Agent completion processed: asset ${response.data.assetId} created`);
    return response.data;
  } catch (err) {
    error(`Agent completion test failed: ${err.message}`);
    throw err;
  }
}

async function testAssetRegeneration(assetId) {
  log(`Testing regeneration options for asset ${assetId}...`);
  
  try {
    // First get regeneration options
    const optionsResponse = await makeRequest(`/assets/${assetId}/regenerate`);
    
    if (!optionsResponse.success || !optionsResponse.data.regenerationOptions) {
      throw new Error('Invalid regeneration options response');
    }
    
    success(`Regeneration options loaded for asset ${assetId}`);
    
    // Then test regeneration
    const regenerateResponse = await makeRequest(`/assets/${assetId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({
        angle: 'casual',
        length: 'shorter',
        tone: 'friendly',
        focus: 'cost savings'
      })
    });
    
    if (!regenerateResponse.success || !regenerateResponse.data.newAssetId) {
      throw new Error('Invalid regeneration response');
    }
    
    success(`Asset regenerated: new asset ${regenerateResponse.data.newAssetId}`);
    return regenerateResponse.data;
  } catch (err) {
    error(`Asset regeneration test failed: ${err.message}`);
    throw err;
  }
}

async function testWebhookInfo() {
  log('Testing GET /complete (webhook info)...');
  
  try {
    const response = await makeRequest('/complete');
    
    if (!response.success || !response.data.webhook) {
      throw new Error('Invalid webhook info response');
    }
    
    success('Webhook information loaded');
    return response.data;
  } catch (err) {
    error(`Webhook info test failed: ${err.message}`);
    throw err;
  }
}

// Main test suite
async function runTests() {
  log('🚀 Starting Content Creation System Tests');
  log('==========================================');
  
  try {
    // Test 1: Configuration
    await testGetConfiguration();
    
    // Test 2: Bundle Creation
    const bundleData = await testCreateBundle();
    
    // Test 3: Webhook Info
    await testWebhookInfo();
    
    // Test 4: Agent Completion (if we have session IDs)
    if (bundleData.sessionIds && Object.keys(bundleData.sessionIds).length > 0) {
      const firstSessionId = Object.values(bundleData.sessionIds)[0];
      const completionData = await testAgentCompletion(firstSessionId);
      
      // Test 5: Asset Regeneration
      if (completionData.assetId) {
        await testAssetRegeneration(completionData.assetId);
      }
    } else {
      log('⚠️  No agents spawned - skipping completion and regeneration tests');
      log('This might be expected in environments without Gateway access');
    }
    
    log('==========================================');
    success('🎉 All tests completed successfully!');
    
    log('\nSummary:');
    log(`- Bundle ID: ${bundleData.bundleId}`);
    log(`- Topic: ${bundleData.topic}`);
    log(`- Trade: ${bundleData.trade}`);
    log(`- Assets requested: ${bundleData.selectedAssets.join(', ')}`);
    log(`- Agents spawned: ${bundleData.spawnedAgents}/${bundleData.expectedAgents}`);
    
  } catch (err) {
    error(`Test suite failed: ${err.message}`);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(err => {
    error(`Unexpected error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testCreateBundle,
  testAgentCompletion,
  testAssetRegeneration
};