// =============================================================================
// Research-First Content Creation System Test Script
// =============================================================================
// Tests the complete research → strategy → content flow

const { parseContentRequest, formatClarificationQuestions } = require('./src/lib/inputParser')

async function testInputParser() {
  console.log('🧪 Testing Input Parser...\n')

  const testInputs = [
    "Create HVAC content for LinkedIn and Instagram",
    "I need plumbing marketing content",
    "Generate professional electrical contractor posts",
    "Research trending topics in landscaping industry",
    "Create casual roofing content for all platforms",
    "Take the wheel and help me create content",
    "Just do research on HVAC missed calls"
  ]

  testInputs.forEach((input, i) => {
    console.log(`Test ${i + 1}: "${input}"`)
    
    try {
      const parsed = parseContentRequest(input)
      console.log(`  ✅ Topic: ${parsed.topic}`)
      console.log(`  ✅ Trade: ${parsed.trade || 'Not specified'}`)
      console.log(`  ✅ Platforms: ${parsed.platforms.join(', ') || 'None'}`)
      console.log(`  ✅ Tone: ${parsed.tone}`)
      console.log(`  ✅ Intent: ${parsed.intent}`)
      console.log(`  ✅ Confidence: ${parsed.confidence}%`)
      
      if (parsed.needsClarification) {
        console.log(`  ❓ Questions: ${parsed.clarificationQuestions.join('; ')}`)
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
    }
    
    console.log('')
  })
}

async function testApiEndpoints() {
  console.log('🌐 Testing API Endpoints...\n')

  // Test 1: Create research-first bundle
  try {
    console.log('Test 1: Creating research-first content bundle...')
    
    const createResponse = await fetch('http://localhost:3000/api/content-dashboard/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Missed call management',
        trade: 'HVAC',
        selectedAssets: ['linkedin', 'instagram', 'email'],
        tone: 'professional',
        intent: 'full_creation',
        autoApprove: false,
        skipResearch: false
      })
    })

    const createData = await createResponse.json()
    
    if (createData.success) {
      console.log(`  ✅ Bundle created: ${createData.data.bundleId}`)
      console.log(`  ✅ Mode: ${createData.data.mode}`)
      console.log(`  ✅ Phase: ${createData.data.currentPhase}`)
      
      if (createData.data.sessionIds.research) {
        console.log(`  ✅ Research session: ${createData.data.sessionIds.research}`)
      }

      // Test 2: Check research progress
      console.log('\nTest 2: Checking research progress...')
      
      const bundleId = createData.data.bundleId
      const researchResponse = await fetch(`http://localhost:3000/api/content-dashboard/research?bundleId=${bundleId}`)
      const researchData = await researchResponse.json()
      
      if (researchData.success) {
        console.log(`  ✅ Research status: ${researchData.data.status}`)
        console.log(`  ✅ Research complete: ${researchData.data.isComplete}`)
        
        if (researchData.data.progress) {
          console.log(`  ✅ Progress: ${researchData.data.progress.progress_percent}% - ${researchData.data.progress.message}`)
        }
      } else {
        console.log(`  ❌ Research check failed: ${researchData.error}`)
      }

      // Test 3: Check bundle status
      console.log('\nTest 3: Checking bundle status...')
      
      const bundleResponse = await fetch(`http://localhost:3000/api/content-dashboard/bundles/${bundleId}`)
      const bundleData = await bundleResponse.json()
      
      if (bundleData.success) {
        console.log(`  ✅ Bundle status: ${bundleData.data.bundle.status}`)
        console.log(`  ✅ Assets: ${bundleData.data.assets.length}`)
        
        if (bundleData.data.bundle.research_findings) {
          console.log(`  ✅ Research findings available`)
        }
        
        if (bundleData.data.bundle.strategy_doc) {
          console.log(`  ✅ Strategy document available`)
        }
      } else {
        console.log(`  ❌ Bundle check failed: ${bundleData.error}`)
      }

    } else {
      console.log(`  ❌ Bundle creation failed: ${createData.error}`)
    }

  } catch (error) {
    console.log(`  ❌ API test failed: ${error.message}`)
  }
}

async function testLegacyMode() {
  console.log('\n🔄 Testing Legacy Mode (Skip Research)...\n')

  try {
    const createResponse = await fetch('http://localhost:3000/api/content-dashboard/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'HVAC maintenance tips',
        trade: 'HVAC',
        selectedAssets: ['linkedin', 'instagram'],
        skipResearch: true  // Legacy mode
      })
    })

    const createData = await createResponse.json()
    
    if (createData.success) {
      console.log(`  ✅ Legacy bundle created: ${createData.data.bundleId}`)
      console.log(`  ✅ Mode: ${createData.data.mode}`)
      console.log(`  ✅ Phase: ${createData.data.currentPhase}`)
      console.log(`  ✅ Agents spawned: ${createData.data.spawnedAgents}/${createData.data.expectedAgents}`)
    } else {
      console.log(`  ❌ Legacy mode failed: ${createData.error}`)
    }

  } catch (error) {
    console.log(`  ❌ Legacy test failed: ${error.message}`)
  }
}

async function testConfigurationEndpoint() {
  console.log('\n⚙️ Testing Configuration Endpoint...\n')

  try {
    const configResponse = await fetch('http://localhost:3000/api/content-dashboard/create')
    const configData = await configResponse.json()
    
    if (configData.success) {
      console.log(`  ✅ Available asset types: ${configData.data.availableAssetTypes.length}`)
      console.log(`  ✅ Trade options: ${configData.data.tradeOptions.length}`)
      console.log(`  ✅ Default assets: ${configData.data.defaultAssets.join(', ')}`)
      console.log(`  ✅ Max assets: ${configData.data.maxAssets}`)
      console.log(`  ✅ Estimated time: ${configData.data.estimatedTime}`)
    } else {
      console.log(`  ❌ Configuration fetch failed: ${configData.error}`)
    }

  } catch (error) {
    console.log(`  ❌ Configuration test failed: ${error.message}`)
  }
}

async function runAllTests() {
  console.log('🚀 Research-First Content Creation System Test Suite\n')
  console.log('=' .repeat(60))
  
  // Test input parser (runs without server)
  await testInputParser()
  console.log('=' .repeat(60))
  
  // Check if server is running
  try {
    await fetch('http://localhost:3000/api/content-dashboard/create')
    console.log('✅ Server is running, proceeding with API tests...\n')
    
    await testConfigurationEndpoint()
    console.log('=' .repeat(60))
    
    await testApiEndpoints()
    console.log('=' .repeat(60))
    
    await testLegacyMode()
    console.log('=' .repeat(60))
    
  } catch (error) {
    console.log('❌ Server is not running. Please start with `npm run dev` first.')
    console.log('   Only testing input parser functionality.\n')
  }
  
  console.log('🎉 Test suite completed!')
  console.log('\n📋 Next Steps:')
  console.log('  1. Start server: npm run dev')
  console.log('  2. Test UI: http://localhost:3000/content-command-center')
  console.log('  3. Try research-first creation with real content')
  console.log('  4. Monitor agent sessions in Discord #agents channel')
}

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testInputParser,
    testApiEndpoints,
    testLegacyMode,
    testConfigurationEndpoint,
    runAllTests
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error)
}