const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OCR_PROMPT = `
Extract the following fields from the invoice:
- Vendor/Supplier name
- Invoice date (the date printed on the document)
- Invoice number (usually at the top of the document)
- Originally ordered items (with quantities)
- Missing items (e.g., if it says "One Missing Item", "Missing" or similar)
- Were missing items detected? → Yes or No
- Total invoice value in USD (number only, no $ symbol)
- Value of missing items in USD (number only, no $ symbol)

Respond as structured JSON. If any data is not available, return null for numbers or "Not specified" for text.

Expected format:
{
  "vendor": "Vendor name",
  "invoice_date": "2024-01-15", // YYYY-MM-DD format
  "invoice_number": "INV-12345",
  "requested_items": ["Item 1 - Qty: X", "Item 2 - Qty: Y"],
  "missing_items": ["Item 1 - Qty: X"],
  "missing_detected": "Yes or No",
  "missing_value_usd": 123.45,
  "invoice_total_usd": 456.78,
  "num_requested_items": 5,
  "num_delivered_items": 3,
  "num_missing_items": 2
}

IMPORTANT: 
- requested_items and missing_items must be arrays
- missing_value_usd and invoice_total_usd must be numbers (not strings)
- If there are no missing items, missing_items should be an empty array []
- num_requested_items is the total number of different items ordered
- num_delivered_items = num_requested_items - num_missing_items
- Date must be in YYYY-MM-DD format
`;

async function processInvoice(imageBase64) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.');
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: OCR_PROMPT
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const content = response.choices[0].message.content;
    
    // Try to parse JSON from the response
    let parsedData;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', content);
      // Return a default structure if parsing fails
      parsedData = {
        vendor: "Not specified",
        invoice_date: null,
        invoice_number: "Not specified",
        requested_items: [],
        missing_items: [],
        missing_detected: "No",
        missing_value_usd: null,
        invoice_total_usd: null,
        num_requested_items: 0,
        num_delivered_items: 0,
        num_missing_items: 0,
        raw_response: content
      };
    }

    // Validate and clean the data
    const cleanedData = {
      proveedor: parsedData.vendor || parsedData.proveedor || "Not specified",
      fecha_invoice: parsedData.invoice_date || parsedData.fecha_invoice || null,
      numero_invoice: parsedData.invoice_number || parsedData.numero_invoice || "Not specified",
      items_pedidos: Array.isArray(parsedData.requested_items) ? parsedData.requested_items : 
                     Array.isArray(parsedData.items_pedidos) ? parsedData.items_pedidos : [],
      items_faltantes: Array.isArray(parsedData.missing_items) ? parsedData.missing_items : 
                       Array.isArray(parsedData.items_faltantes) ? parsedData.items_faltantes : [],
      faltantes_detectados: parsedData.missing_detected === "Yes" || parsedData.faltantes_detectados === "Yes" ? "Yes" : "No",
      valor_faltantes_usd: typeof parsedData.missing_value_usd === 'number' ? parsedData.missing_value_usd : 
                           typeof parsedData.valor_faltantes_usd === 'number' ? parsedData.valor_faltantes_usd : 0,
      valor_total_invoice_usd: typeof parsedData.invoice_total_usd === 'number' ? parsedData.invoice_total_usd : 
                               typeof parsedData.valor_total_invoice_usd === 'number' ? parsedData.valor_total_invoice_usd : 0,
      cantidad_items_pedidos: typeof parsedData.num_requested_items === 'number' ? parsedData.num_requested_items : 
                              typeof parsedData.cantidad_items_pedidos === 'number' ? parsedData.cantidad_items_pedidos : 
                              parsedData.requested_items?.length || parsedData.items_pedidos?.length || 0,
      cantidad_items_entregados: typeof parsedData.num_delivered_items === 'number' ? parsedData.num_delivered_items : 
                                 typeof parsedData.cantidad_items_entregados === 'number' ? parsedData.cantidad_items_entregados : 0,
      cantidad_items_faltantes: typeof parsedData.num_missing_items === 'number' ? parsedData.num_missing_items : 
                                typeof parsedData.cantidad_items_faltantes === 'number' ? parsedData.cantidad_items_faltantes : 
                                parsedData.missing_items?.length || parsedData.items_faltantes?.length || 0
    };

    // Calculate delivered items if not provided
    if (cleanedData.cantidad_items_entregados === 0 && cleanedData.cantidad_items_pedidos > 0) {
      cleanedData.cantidad_items_entregados = cleanedData.cantidad_items_pedidos - cleanedData.cantidad_items_faltantes;
    }

    console.log('OCR processing completed:', cleanedData);
    return cleanedData;

  } catch (error) {
    console.error('Error processing invoice with OpenAI:', error);
    
    // Provide specific error messages
    if (error.code === 'invalid_api_key') {
      throw new Error('OpenAI API key is invalid. Please check your configuration.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI rate limit exceeded. Please wait a moment and try again.');
    } else if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI quota exceeded. Please check your OpenAI account.');
    } else if (error.message?.includes('model_not_found')) {
      throw new Error('OpenAI model not available. Please contact support.');
    } else if (error.message?.includes('timeout')) {
      throw new Error('OpenAI request timed out. Please try again.');
    } else {
      throw new Error(`OpenAI processing failed: ${error.message}`);
    }
  }
}

module.exports = {
  processInvoice
}; 