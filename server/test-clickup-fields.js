require('dotenv').config();
const clickupService = require('./services/clickupService');

// Test data simulating OCR output
const testOcrData = {
  proveedor: 'Test Vendor - Sysco Atlanta',
  fecha_invoice: '2024-01-15',
  numero_invoice: 'INV-2024-0123',
  items_pedidos: [
    'Avocados - Qty: 10',
    'Tomatoes - Qty: 5',
    'Lettuce - Qty: 20'
  ],
  items_faltantes: [
    'Avocados - Qty: 3'
  ],
  faltantes_detectados: 'Yes',
  valor_faltantes_usd: 45.50,
  valor_total_invoice_usd: 387.25,
  cantidad_items_pedidos: 3,
  cantidad_items_entregados: 2,
  cantidad_items_faltantes: 1
};

const testLocation = 'Chamblee';

async function testClickUpIntegration() {
  console.log('🧪 Testing ClickUp integration with new custom fields...\n');
  
  try {
    // Test connection first
    console.log('1️⃣ Testing ClickUp connection...');
    const connectionOk = await clickupService.testConnection();
    if (!connectionOk) {
      console.log('⚠️  Connection test failed, but continuing with task creation test...\n');
    } else {
      console.log('✅ Connection successful!\n');
    }
    
    // Test task creation
    console.log('2️⃣ Creating test task with all custom fields...');
    console.log('Test data:', JSON.stringify(testOcrData, null, 2));
    console.log('Location:', testLocation);
    console.log('\n');
    
    const result = await clickupService.createTask(testOcrData, testLocation);
    
    console.log('✅ Task created successfully!');
    console.log('Task ID:', result.id);
    console.log('Task URL:', result.url);
    console.log('Task Name:', result.name);
    
    if (result.mock) {
      console.log('\n⚠️  Note: This was a mock response (ClickUp authentication may have failed)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testClickUpIntegration(); 