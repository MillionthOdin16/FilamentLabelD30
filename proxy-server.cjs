const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3002;

// Enable CORS for all origins
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Catch-all proxy endpoint for Gemini API
app.use('/api/gemini', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Extract the path after /api/gemini
  const geminiPath = req.url.substring(1); // Remove leading /
  const geminiUrl = `https://generativelanguage.googleapis.com/${geminiPath}`;
  
  console.log(`[PROXY] Forwarding ${req.method} request to: ${geminiUrl.split('?')[0]}...`);
  console.log(`[PROXY] Body size: ${JSON.stringify(req.body).length} bytes`);

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(geminiUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.text();
    
    console.log(`[PROXY] Response status: ${response.status}`);
    console.log(`[PROXY] Response size: ${data.length} bytes`);
    
    // Set appropriate headers
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');
    res.send(data);
  } catch (error) {
    console.error('[PROXY] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`📡 Forwarding /api/gemini/* to Gemini API`);
  console.log(`🔑 API Key: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Missing'}\n`);
});
