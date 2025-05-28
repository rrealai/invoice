const OpenAI = require('openai');
const clickupService = require('./services/clickupService');
require('dotenv').config();

async function testConnections() {
  console.log('🧪 Testing API connections...\n');

  // Test OpenAI
  console.log('1. Testing OpenAI connection...');
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "Hello! Just testing the connection. Please respond with 'Connection successful!'"
        }
      ],
      max_tokens: 50
    });

    console.log('✅ OpenAI connection successful!');
    console.log('   Response:', response.choices[0].message.content);
  } catch (error) {
    console.log('❌ OpenAI connection failed:', error.message);
  }

  console.log('\n2. Testing ClickUp connection...');
  try {
    const result = await clickupService.testConnection();
    if (result) {
      console.log('✅ ClickUp connection successful!');
    } else {
      console.log('❌ ClickUp connection failed');
    }
  } catch (error) {
    console.log('❌ ClickUp connection failed:', error.message);
  }

  console.log('\n🎉 Connection tests completed!');
}

testConnections(); 