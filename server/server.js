const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow embedding for development
  contentSecurityPolicy: false // Disable CSP for simplicity in development
}));
app.use(compression());
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Vite dev server
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// In-memory map of string keys to datapoints
const dataPointMap = {
  "M1": [
    { "727413": "Favorites.Light.Lounge.01.ST" },
    { "727441": "Favorites.Light.Lounge.02.ST" },
    { "727469": "Favorites.Light.TestRM.ST" },
    { "727495": "Favorites.Light.StockRM.ST" },
    { "727761": "Favorites.Light.Office.01.ST" },
    { "727787": "Favorites.Light.ConfRM.01.ST" },
    { "727813": "Favorites.Light.ConfRM.02.ST" }
  ],
  "M2": [
    { "723420": "Favorites.Light.Lounge.01.ST" },
    { "727329": "Favorites.Light.Lounge.02.ST" },
    { "727598": "Favorites.Light.TestRM.ST" },
    { "727624": "Favorites.Light.StockRM.ST" },
    { "728049": "Favorites.Light.Office.01.ST" }
  ],
  "M3": [
    { "728121": "Favorites.Light.Lounge.01.ST" },
    { "728556": "Favorites.Light.Lounge.02.ST" },
    { "728819": "Favorites.Light.TestRM.ST" },
    { "728830": "Favorites.Light.StockRM.ST" }
  ],
  "M4": [
    { "728123": "Favorites.Light.Lounge.01.ST" },
    { "728124": "Favorites.Light.Lounge.02.ST" },
    { "728125": "Favorites.Light.TestRM.ST" },
    { "728820": "Favorites.Light.StockRM.ST" },
    { "728821": "Favorites.Light.Office.01.ST" },
    { "728822": "Favorites.Light.ConfRM.01.ST" }
  ],
  "L1": [
    { "728869": "Favorites.Light.Lounge.01.ST" },
    { "728873": "Favorites.Light.Lounge.02.ST" },
    { "729112": "Favorites.Light.TestRM.ST" },
    { "729116": "Favorites.Light.StockRM.ST" },
    { "729117": "Favorites.Light.Office.01.ST" },
    { "3363628": "Favorites.Light.ConfRM.01.ST" }
  ],
  "L2": [
    { "728870": "Favorites.Light.Lounge.01.ST" },
    { "728871": "Favorites.Light.Lounge.02.ST" },
    { "728872": "Favorites.Light.TestRM.ST" },
    { "729113": "Favorites.Light.StockRM.ST" },
    { "729114": "Favorites.Light.Office.01.ST" },
    { "729115": "Favorites.Light.ConfRM.01.ST" }
  ],
  "O1": [
    { "729149": "Favorites.Light.Lounge.01.ST" },
    { "729153": "Favorites.Light.Lounge.02.ST" },
    { "729154": "Favorites.Light.TestRM.ST" },
    { "729180": "Favorites.Light.StockRM.ST" },
    { "729184": "Favorites.Light.Office.01.ST" },
    { "729185": "Favorites.Light.ConfRM.01.ST" }
  ],
  "O2": [
    { "729150": "Favorites.Light.Lounge.01.ST" },
    { "729151": "Favorites.Light.Lounge.02.ST" },
    { "729152": "Favorites.Light.TestRM.ST" },
    { "729181": "Favorites.Light.StockRM.ST" },
    { "729182": "Favorites.Light.Office.01.ST" },
    { "729183": "Favorites.Light.ConfRM.01.ST" }
  ],
  "O3": [
    { "729211": "Favorites.Light.Lounge.01.ST" },
    { "729215": "Favorites.Light.Lounge.02.ST" },
    { "729216": "Favorites.Light.TestRM.ST" },
    { "729246": "Favorites.Light.StockRM.ST" },
    { "729250": "Favorites.Light.Office.01.ST" },
    { "729251": "Favorites.Light.ConfRM.01.ST" }
  ],
  "O4": [
    { "729212": "Favorites.Light.Lounge.01.ST" },
    { "729213": "Favorites.Light.Lounge.02.ST" },
    { "729214": "Favorites.Light.TestRM.ST" },
    { "729427": "Favorites.Light.StockRM.ST" },
    { "729248": "Favorites.Light.Office.01.ST" },
    { "729249": "Favorites.Light.ConfRM.01.ST" },
    { "729247": "Favorites.Light.ConfRM.01.ST" }
  ],
  "ER": [
    { "729279": "Favorites.Light.Lounge.01.ST" },
    { "729283": "Favorites.Light.Lounge.02.ST" },
    { "729284": "Favorites.Light.TestRM.ST" },
    { "729312": "Favorites.Light.StockRM.ST" },
    { "729316": "Favorites.Light.Office.01.ST" },
    { "729317": "Favorites.Light.ConfRM.01.ST" }
  ],
  "ST": [
    { "729280": "Favorites.Light.Lounge.01.ST" },
    { "729281": "Favorites.Light.Lounge.02.ST" },
    { "729282": "Favorites.Light.TestRM.ST" },
    { "729313": "Favorites.Light.StockRM.ST" },
    { "729314": "Favorites.Light.Office.01.ST" },
    { "729315": "Favorites.Light.ConfRM.01.ST" },
    { "729445": "Favorites.Light.Office.01.ST" },
    { "729446": "Favorites.Light.ConfRM.01.ST" }
  ]
};

// API Routes

// Get data point by key (compatible with Azure Functions endpoint)
app.get('/ws/node/api/getDataPoint', (req, res) => {
  console.log('getDataPoint function started');

  try {
    const key = req.query.key;

    if (!key) {
      return res.status(400).json({ error: 'Missing key parameter' });
    }

    // Check if the key exists in the map
    if (dataPointMap.hasOwnProperty(key)) {
      const dataPoint = dataPointMap[key];
      console.log(`Data point found for key: ${key}`, dataPoint);

      return res.status(200).json(dataPoint);
    } else {
      console.log(`No data point found for key: ${key}`);

      return res.status(404).json({ 
        error: `No data point found for key: ${key}`,
        availableKeys: Object.keys(dataPointMap)
      });
    }
  } catch (error) {
    console.error(`Error processing getDataPoint request:`, error);

    return res.status(500).json({ 
      error: `Error processing request: ${error.message}` 
    });
  }
});

// Get all data point keys
app.get('/ws/node/api/getAllDataPointKeys', (req, res) => {
  console.log('getAllDataPointKeys function started');

  try {
    const keys = Object.keys(dataPointMap);

    return res.status(200).json({ keys });
  } catch (error) {
    console.error(`Error getting all data point keys:`, error);

    return res.status(500).json({ 
      error: `Error getting all keys: ${error.message}` 
    });
  }
});

// Get all datapoints
app.get('/ws/node/api/getAllDatapoints', (req, res) => {
  console.log('getAllDatapoints function started');

  try {
    return res.status(200).json(dataPointMap);
  } catch (error) {
    console.error(`Error getting all datapoints:`, error);

    return res.status(500).json({ 
      error: `Error getting all datapoints: ${error.message}` 
    });
  }
});

// Get DPS Map Keys (compatible with the old endpoint)
app.get('/ws/node/api/GetDpsMapKeys', (req, res) => {
  console.log('GetDpsMapKeys function started');

  try {
    return res.status(200).json(dataPointMap);
  } catch (error) {
    console.error(`Error getting datapoints via GetDpsMapKeys:`, error);

    return res.status(500).json({ 
      error: `Error getting datapoints: ${error.message}` 
    });
  }
});

// Stream IFC file (compatible with Azure Functions endpoint)
app.get('/ws/node/api/streamIfc', (req, res) => {
  console.log('streamIfc function started');

  try {
    const blobName = req.query.blobName || 'bim.ifc';
    const ifcFilePath = path.join(__dirname, 'ifc-files', blobName);

    // Check if file exists
    if (!require('fs').existsSync(ifcFilePath)) {
      return res.status(404).json({ 
        error: `IFC file not found: ${blobName}` 
      });
    }

    console.log(`Streaming IFC file: ${blobName}`);

    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${blobName}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the file
    const fileStream = require('fs').createReadStream(ifcFilePath);
    
    fileStream.on('error', (error) => {
      console.error(`Error reading IFC file:`, error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: `Error reading IFC file: ${error.message}` 
        });
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error(`Error streaming IFC file:`, error);

    return res.status(500).json({ 
      error: `Error streaming IFC file: ${error.message}` 
    });
  }
});

// Serve static files from the dist directory (after build)
app.use('/ws/node/bimviewer', express.static(path.join(__dirname, '../dist')));

// Also serve static files from the public directory (for development)
app.use('/', express.static(path.join(__dirname, '../public')));

// Handle client-side routing - serve index.html for all non-API routes under the new base path
app.get('/ws/node/bimviewer*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints available at:`);
  console.log(`  - http://localhost:${PORT}/ws/node/api/getDataPoint?key=M1`);
  console.log(`  - http://localhost:${PORT}/ws/node/api/getAllDataPointKeys`);
  console.log(`  - http://localhost:${PORT}/ws/node/api/getAllDatapoints`);
  console.log(`  - http://localhost:${PORT}/ws/node/api/GetDpsMapKeys`);
  console.log(`  - http://localhost:${PORT}/ws/node/api/streamIfc`);
});

module.exports = app;
