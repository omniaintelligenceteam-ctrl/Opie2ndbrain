// Simple test for the Model Counsel API endpoint
// Run with: node test-model-counsel.js

const testQuestion = "What are the key principles of good software architecture?";

async function testModelCounselAPI() {
  try {
    console.log('Testing Model Counsel API...');
    console.log('Question:', testQuestion);
    
    const response = await fetch('http://localhost:3000/api/model-counsel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: testQuestion
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('\n✅ API Response received successfully!');
    console.log('Timestamp:', data.timestamp);
    console.log('\nModel Responses:');
    
    Object.entries(data.responses).forEach(([model, response]) => {
      if (response) {
        console.log(`\n📝 ${model.toUpperCase()}:`);
        console.log(`   Timing: ${response.timing}ms`);
        console.log(`   Tokens: ${response.tokens}`);
        console.log(`   Response: ${response.response.slice(0, 100)}...`);
        if (response.error) {
          console.log(`   ❌ Error: ${response.error}`);
        }
      }
    });

    console.log('\n🎯 Synthesis:');
    console.log(data.synthesis ? data.synthesis.slice(0, 200) + '...' : 'No synthesis available');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run if this file is executed directly (not imported)
if (require.main === module) {
  testModelCounselAPI();
}

module.exports = { testModelCounselAPI };