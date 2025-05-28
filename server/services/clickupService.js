const axios = require('axios');

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';
const ACCESS_TOKEN = process.env.CLICKUP_ACCESS_TOKEN;
const LIST_ID = process.env.CLICKUP_LIST_ID;

// Custom field IDs from the specification
const CUSTOM_FIELDS = {
  VENDOR_NAME: 'de3c7c49-c48c-464f-86bc-974774099396',
  MISSING_ITEMS: '612bb05d-bc68-486b-b8bf-3db90a965188',
  LOCATION: '3ddb4595-e264-4592-87f5-69018d3ec8e3',
  ITEMS_REQUESTED: '09d6b92a-d4b3-447f-bfdd-6a0fd56764ca',
  ITEMS_DELIVERED: 'f88ef885-69a1-4c13-a950-cb3cf5539a65',
  MISSING_DETECTED: 'a8b1bae2-038a-466c-9f4f-d94e024d243d',
  INVOICE_TOTAL: 'ce44d1ab-e0f5-4338-8762-661c7014a079',
  MISSING_VALUE: 'd48a0451-d83d-44f8-b74f-760b5e0b3485',
  PROCESSED_DATE: '81dea16a-7a6b-4d12-bf4d-f02a0a08dd3c',
  INVOICE_IMAGE: '2c1a800a-7a70-4eb7-8949-6719be2ad9e2',
  // New fields
  INVOICE_DATE: '520d84f6-2eb9-4777-ab15-9693bb7b8a3d',
  INVOICE_NUMBER: '84fe70f3-8b4d-43ea-8d15-3e034b082393',
  NUM_REQUESTED_ITEMS: '61a9a77d-40d1-44d4-bf4c-0b1bd29d7499',
  NUM_DELIVERED_ITEMS: '90cc0fe8-64eb-451a-a48a-cd16cfca920d',
  NUM_MISSING_ITEMS: 'a6842f4f-7a8e-4e78-97ca-9d2b7d083be3'
};

// Location mapping for dropdown field
const LOCATION_MAPPING = {
  "Midtown": "d8ed2c85-ed1d-4669-bab6-ebbfa0e2aed2",
  "West Midtown": "36fcdab1-c453-44ef-94e6-ac4d8dd4d97a",
  "Sandy Springs": "279b441f-8872-4197-af48-58c7a119118e",
  "Chamblee": "8057228e-a122-45df-a827-300f05a34a11",
  "Alpharetta": "632f646c-c81c-4a3e-b150-888d05bec256",
  "Cumming": "64117696-4b12-43fc-8d80-2accaebacec2",
  "Sugar Hill": "b3f04a61-84d9-41d3-97c5-1a6098ecef6e",
  "Buckhead": "c15c069d-fde5-43e8-a5bc-3149b93d3c00",
  "Decatur": "54fe407f-a0b7-435e-8e92-56a9cf34cad4",
  "Lawrenceville": "679dff9f-d4d2-4280-b371-c076238491d6"
};

// Missing detected mapping for dropdown field
const MISSING_DETECTED_MAPPING = {
  "Yes": "0a15390e-db36-4a91-a493-e2579ee86006",
  "No": "4f9608cf-0d69-4418-96f0-f394c4826abb"
};

async function createTask(ocrData, location, imageUrl = null) {
  try {
    const taskName = `Receipt - ${ocrData.proveedor} - ${location}`;
    
    // Convert arrays to strings for text fields
    const itemsPedidosStr = Array.isArray(ocrData.items_pedidos) 
      ? ocrData.items_pedidos.join(', ')
      : ocrData.items_pedidos || 'Not specified';
    
    const itemsFaltantesStr = Array.isArray(ocrData.items_faltantes) 
      ? ocrData.items_faltantes.join(', ')
      : ocrData.items_faltantes || 'Not specified';
    
    // Calculate items delivered (items requested - missing items)
    const itemsDelivered = calculateItemsDelivered(ocrData.items_pedidos, ocrData.items_faltantes);
    
    // Simplified description
    const description = `Automatically created via invoice processing form.`;

    // Build custom fields array
    const customFields = [
      {
        id: CUSTOM_FIELDS.VENDOR_NAME,
        value: ocrData.proveedor
      },
      {
        id: CUSTOM_FIELDS.MISSING_ITEMS,
        value: itemsFaltantesStr
      },
      {
        id: CUSTOM_FIELDS.LOCATION,
        value: LOCATION_MAPPING[location] || null
      },
      {
        id: CUSTOM_FIELDS.ITEMS_REQUESTED,
        value: itemsPedidosStr
      },
      {
        id: CUSTOM_FIELDS.ITEMS_DELIVERED,
        value: itemsDelivered
      },
      {
        id: CUSTOM_FIELDS.MISSING_DETECTED,
        value: MISSING_DETECTED_MAPPING[ocrData.faltantes_detectados] || MISSING_DETECTED_MAPPING["No"]
      },
      {
        id: CUSTOM_FIELDS.INVOICE_TOTAL,
        value: typeof ocrData.valor_total_invoice_usd === 'number' ? ocrData.valor_total_invoice_usd : 0
      },
      {
        id: CUSTOM_FIELDS.MISSING_VALUE,
        value: typeof ocrData.valor_faltantes_usd === 'number' ? ocrData.valor_faltantes_usd : 0
      },
      {
        id: CUSTOM_FIELDS.PROCESSED_DATE,
        value: Date.now() // Unix timestamp in milliseconds
      }
    ];

    // Add new fields
    if (ocrData.fecha_invoice) {
      // Convert date to Unix timestamp
      const dateTimestamp = new Date(ocrData.fecha_invoice).getTime();
      if (!isNaN(dateTimestamp)) {
        customFields.push({
          id: CUSTOM_FIELDS.INVOICE_DATE,
          value: dateTimestamp
        });
      }
    }

    if (ocrData.numero_invoice) {
      customFields.push({
        id: CUSTOM_FIELDS.INVOICE_NUMBER,
        value: ocrData.numero_invoice
      });
    }

    // Add item counts
    customFields.push(
      {
        id: CUSTOM_FIELDS.NUM_REQUESTED_ITEMS,
        value: ocrData.cantidad_items_pedidos || 0
      },
      {
        id: CUSTOM_FIELDS.NUM_DELIVERED_ITEMS,
        value: ocrData.cantidad_items_entregados || 0
      },
      {
        id: CUSTOM_FIELDS.NUM_MISSING_ITEMS,
        value: ocrData.cantidad_items_faltantes || 0
      }
    );

    // Add invoice image if provided
    if (imageUrl) {
      customFields.push({
        id: CUSTOM_FIELDS.INVOICE_IMAGE,
        value: imageUrl
      });
    }

    const taskData = {
      name: taskName,
      description: description,
      custom_fields: customFields,
      tags: [
        'auto-ocr',
        location.toLowerCase().replace(/\s+/g, '-'),
        ocrData.faltantes_detectados === 'Yes' ? 'missing-items' : 'complete-order'
      ]
    };

    console.log('Creating ClickUp task with data:', JSON.stringify(taskData, null, 2));

    const response = await axios.post(
      `${CLICKUP_API_BASE}/list/${LIST_ID}/task`,
      taskData,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('ClickUp task created successfully:', response.data.id);
    
    return {
      id: response.data.id,
      url: response.data.url,
      name: response.data.name
    };

  } catch (error) {
    console.error('Error creating ClickUp task:', error.response?.data || error.message);
    
    // If ClickUp is not available, return a mock response for development
    if (error.response?.data?.err === 'Oauth token not found' || error.response?.status === 401) {
      console.log('⚠️  ClickUp authentication failed. Using mock response for development.');
      
      return {
        id: 'mock_task_' + Date.now(),
        url: 'https://app.clickup.com/mock-task',
        name: `Receipt - ${ocrData.proveedor} - ${location}`,
        mock: true
      };
    }
    
    if (error.response?.status === 404) {
      throw new Error('ClickUp list not found. Please check the list ID.');
    } else if (error.response?.data) {
      throw new Error(`ClickUp API error: ${JSON.stringify(error.response.data)}`);
    } else {
      throw new Error(`Failed to create ClickUp task: ${error.message}`);
    }
  }
}

// Helper function to calculate items delivered
function calculateItemsDelivered(itemsPedidos, itemsFaltantes) {
  // If no missing items, all items were delivered
  if (!itemsFaltantes || itemsFaltantes === 'Not specified' || 
      (Array.isArray(itemsFaltantes) && itemsFaltantes.length === 0)) {
    return Array.isArray(itemsPedidos) ? itemsPedidos.join(', ') : itemsPedidos;
  }
  
  // If we have both arrays, try to parse and calculate
  if (Array.isArray(itemsPedidos) && Array.isArray(itemsFaltantes)) {
    try {
      // Create a map of missing items
      const missingMap = {};
      itemsFaltantes.forEach(item => {
        // Try to extract item name and quantity
        const match = item.match(/(.+?)\s*-\s*(?:Cantidad:|Qty:)?\s*(\d+)/i);
        if (match) {
          const [, itemName, quantity] = match;
          missingMap[itemName.trim().toLowerCase()] = parseInt(quantity);
        }
      });
      
      // Calculate delivered items
      const deliveredItems = [];
      itemsPedidos.forEach(item => {
        const match = item.match(/(.+?)\s*-\s*(?:Cantidad:|Qty:)?\s*(\d+)/i);
        if (match) {
          const [, itemName, quantity] = match;
          const itemKey = itemName.trim().toLowerCase();
          const orderedQty = parseInt(quantity);
          const missingQty = missingMap[itemKey] || 0;
          const deliveredQty = orderedQty - missingQty;
          
          if (deliveredQty > 0) {
            deliveredItems.push(`${itemName.trim()} - Qty: ${deliveredQty}`);
          }
        } else {
          // If we can't parse, include as is
          deliveredItems.push(item);
        }
      });
      
      return deliveredItems.length > 0 ? deliveredItems.join(', ') : 'None';
    } catch (error) {
      console.error('Error calculating delivered items:', error);
      return 'See description for details';
    }
  }
  
  // Default fallback
  return "See description for details";
}

async function testConnection() {
  try {
    const response = await axios.get(
      `${CLICKUP_API_BASE}/list/${LIST_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      }
    );
    
    console.log('ClickUp connection test successful:', response.data.name);
    return true;
  } catch (error) {
    console.error('ClickUp connection test failed:', error.response?.data || error.message);
    
    if (error.response?.data?.err === 'Oauth token not found') {
      console.log('⚠️  The ClickUp access token appears to be invalid or expired.');
      console.log('   Please check the CLICKUP_ACCESS_TOKEN in your .env file.');
      console.log('   The application will continue to work but will use mock ClickUp responses.');
    }
    
    return false;
  }
}

module.exports = {
  createTask,
  testConnection
}; 