const multer = require('multer');
const { OpenAI } = require('openai');
const axios = require('axios');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize OpenAI
const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Helper function to process the invoice with OpenAI
async function processInvoiceWithAI(imageBase64) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "You are an expert at reading invoices. Please analyze this invoice and extract the following information in a JSON format:\n- proveedor (vendor name)\n- fecha_invoice (invoice date in YYYY-MM-DD format)\n- numero_invoice (invoice number)\n- items_pedidos (array of items ordered with their quantities)\n- items_faltantes (array of missing items with their quantities)\n- faltantes_detectados (Yes/No if there are missing items)\n- valor_faltantes_usd (total value of missing items in USD)\n- valor_total_invoice_usd (total invoice value in USD)\n- cantidad_items_pedidos (total number of different items ordered)\n- cantidad_items_entregados (total number of different items delivered)\n- cantidad_items_faltantes (total number of different items missing)"
            },
            {
              type: "image",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1500
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error processing with OpenAI:', error);
    throw new Error('Failed to process image with OpenAI');
  }
}

// Helper function to create ClickUp task
async function createClickUpTask(ocrData, location) {
  try {
    const locationMap = {
      'chamblee': {
        listId: '901500538',
        tagName: 'chamblee'
      },
      'lawrenceville': {
        listId: '901500542',
        tagName: 'lawrenceville'
      }
    };

    const locationInfo = locationMap[location.toLowerCase()];
    if (!locationInfo) {
      throw new Error('Invalid location');
    }

    const taskData = {
      name: `Receipt - ${ocrData.proveedor} - ${location}`,
      description: "Automatically created via invoice processing form.",
      list_id: locationInfo.listId,
      custom_fields: [
        // Add your custom fields here based on your ClickUp configuration
      ],
      tags: [
        "auto-ocr",
        locationInfo.tagName,
        ocrData.faltantes_detectados === 'Yes' ? 'missing-items' : 'complete-order'
      ]
    };

    const response = await axios.post(
      `https://api.clickup.com/api/v2/list/${locationInfo.listId}/task`,
      taskData,
      {
        headers: {
          'Authorization': process.env.CLICKUP_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      id: response.data.id,
      url: response.data.url
    };
  } catch (error) {
    console.error('Error creating ClickUp task:', error);
    throw new Error('Failed to create task in ClickUp');
  }
}

// Vercel serverless function
module.exports = async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Process the uploaded file
    const imageBase64 = req.body.image;
    const location = req.body.location;

    if (!imageBase64) {
      return res.status(400).json({
        error: 'No image provided',
        details: 'Please provide an image in base64 format'
      });
    }

    if (!location) {
      return res.status(400).json({
        error: 'Location is required',
        details: 'Please select a location from the dropdown'
      });
    }

    // Process with OpenAI OCR
    console.log('Processing invoice with OpenAI...');
    const ocrData = await processInvoiceWithAI(imageBase64);

    // Create task in ClickUp
    console.log('Creating task in ClickUp...');
    const clickupTask = await createClickUpTask(ocrData, location);

    res.json({
      success: true,
      ocrData,
      clickupTask: {
        id: clickupTask.id,
        url: clickupTask.url
      }
    });

  } catch (error) {
    console.error('Error processing invoice:', error);
    
    let errorMessage = 'Failed to process invoice';
    let errorDetails = error.message;
    
    if (error.message.includes('OpenAI')) {
      errorMessage = 'Failed to process image with AI';
      errorDetails = 'The AI service could not read the invoice. Please ensure the image is clear and contains invoice information.';
    } else if (error.message.includes('ClickUp')) {
      errorMessage = 'Failed to create task in ClickUp';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails
    });
  }
}; 