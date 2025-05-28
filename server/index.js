const express = require('express');
const cors = require('cors');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const ocrService = require('./services/ocrService');
const clickupService = require('./services/clickupService');

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(limiter);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Process invoice endpoint
app.post('/api/process-invoice', upload.single('invoice'), async (req, res) => {
  try {
    const { location } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ 
        error: 'No image file provided',
        details: 'Please select an image file to upload' 
      });
    }

    if (!location) {
      return res.status(400).json({ 
        error: 'Location is required',
        details: 'Please select a location from the dropdown' 
      });
    }

    // Convert image to base64
    const imageBase64 = imageFile.buffer.toString('base64');

    // Process with OpenAI OCR
    console.log('Processing invoice with OpenAI...');
    const ocrData = await ocrService.processInvoice(imageBase64);

    // Create task in ClickUp
    console.log('Creating task in ClickUp...');
    const clickupTask = await clickupService.createTask(ocrData, location);

    res.json({
      success: true,
      ocrData,
      clickupTask: {
        id: clickupTask.id,
        url: clickupTask.url,
        mock: clickupTask.mock || false
      }
    });

  } catch (error) {
    console.error('Error processing invoice:', error);
    
    // Provide specific error messages based on the error type
    let errorMessage = 'Failed to process invoice';
    let errorDetails = error.message;
    
    if (error.message.includes('OpenAI')) {
      errorMessage = 'Failed to process image with AI';
      errorDetails = 'The AI service could not read the invoice. Please ensure the image is clear and contains invoice information.';
    } else if (error.message.includes('ClickUp')) {
      errorMessage = 'Failed to create task in ClickUp';
      if (error.message.includes('FIELD_018')) {
        errorDetails = 'Invalid data format for ClickUp fields. This has been fixed, please try again.';
      }
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'Service temporarily unavailable';
      errorDetails = 'Too many requests. Please wait a moment and try again.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
      technicalDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
}); 