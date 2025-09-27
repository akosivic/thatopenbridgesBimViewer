const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Load environment variables from .env file if it exists
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
    
    console.log('Environment variables loaded from .env file');
    console.log('LOYTEC_BASE_URL:', process.env.LOYTEC_BASE_URL);
  }
} catch (error) {
  console.log('Could not load .env file:', error.message);
}

// For testing with self-signed certificates (development only)
if (process.env.NODE_ENV !== 'production') {
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
  console.log('WARNING: TLS certificate verification disabled for development');
}


const app = express();
const PORT = process.env.PORT || 8001;

// In-memory session store (for production, consider using Redis or database)
const sessionStore = new Map();

// Session configuration
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Generate secure session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Clean expired sessions
const cleanExpiredSessions = () => {
  const now = Date.now();
  for (const [sessionId, sessionData] of sessionStore.entries()) {
    if (now > sessionData.expiresAt) {
      sessionStore.delete(sessionId);
    }
  }
};

// Clean expired sessions every hour
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

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

// Authentication Routes

// Login endpoint
app.post('/ws/node/api/auth/login', async (req, res) => {
  console.log('Login request received');
  
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Username and password are required' 
      });
    }

    // Get Loytec base URL from environment or use default
    const loytecBaseUrl = process.env.LOYTEC_BASE_URL || 'https://192.168.50.69';
    const loginUrl = `${loytecBaseUrl}/webui/login`;

    console.log(`Attempting Loytec authentication for user: ${username}`);
    console.log(`Loytec URL: ${loginUrl}`);

    // Prepare Basic Auth header for Loytec
    const authString = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Configure fetch options for HTTPS with potential self-signed certificates
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'X-Create-Session': '1',
        'Content-Type': 'application/json',
        'User-Agent': 'BridgesBimViewer/1.0'
      },
      // Set timeout
      signal: AbortSignal.timeout(10000)
    };

    // For development/testing with self-signed certificates
    if (loytecBaseUrl.startsWith('https://') && (loytecBaseUrl.includes('192.168.') || loytecBaseUrl.includes('localhost'))) {
      console.log('Note: Using HTTPS with local/private IP - certificate errors may occur');
    }
    
    // Make request to Loytec device
    const response = await fetch(loginUrl, fetchOptions);

    if (!response.ok) {
      console.log(`Loytec authentication failed: ${response.status} ${response.statusText}`);
      console.log('Response details:', {
        url: loginUrl,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Parse Loytec response
    let loytecResponse;
    try {
      loytecResponse = await response.json();
    } catch (error) {
      console.error('Failed to parse Loytec response as JSON:', error);
      console.error('Response text preview:', await response.text().catch(() => 'Unable to read response'));
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }

    // Validate Loytec response structure
    if (typeof loytecResponse.loggedIn !== 'boolean') {
      console.error('Invalid Loytec response structure:', loytecResponse);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }

    console.log('Loytec response:', {
      loggedIn: loytecResponse.loggedIn,
      sessUser: loytecResponse.sessUser,
      loginState: loytecResponse.loginState
    });

    // SIMPLIFIED AUTHENTICATION CRITERIA:
    // 1. loggedIn = true
    // 2. sessUser is not blank/empty AND sessUser is not "Guest"
    // (No longer checking loginState = 2)
    const isLoggedIn = loytecResponse.loggedIn === true;
    const sessUser = loytecResponse.sessUser || '';
    const isValidUser = sessUser.trim() !== '' && sessUser.trim().toLowerCase() !== 'guest';

    if (!isLoggedIn || !isValidUser) {
      const errorDetails = [];
      if (!isLoggedIn) errorDetails.push(`loggedIn=${loytecResponse.loggedIn}`);
      if (!isValidUser) errorDetails.push(`sessUser="${sessUser}"`);
      
      const detailedError = loytecResponse.authFail?.length > 0 
        ? loytecResponse.authFail.join(', ')
        : `Authentication failed - Required: loggedIn=true and valid user. Got: ${errorDetails.join(', ')}`;
      
      console.log('Loytec authentication validation failed:', detailedError);
      console.log('Full Loytec response for debugging:', loytecResponse);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Authentication successful - create session
    const sessionId = generateSessionId();
    const now = Date.now();
    const sessionData = {
      sessionId,
      username: loytecResponse.sessUser || username,
      loginState: loytecResponse.loginState,
      createdAt: now,
      expiresAt: now + SESSION_DURATION,
      loytecResponse
    };

    // Store session
    sessionStore.set(sessionId, sessionData);

    console.log(`Authentication successful for user: ${sessionData.username} (Session: ${sessionId.substring(0, 8)}...)`);

    // Return success response (no sensitive data)
    return res.status(200).json({
      success: true,
      sessionId,
      message: 'Authentication successful',
      username: sessionData.username
    });

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      username: req.body?.username || 'unknown'
    });
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

// Validate session endpoint
app.post('/ws/node/api/auth/validate', (req, res) => {
  console.log('Session validation request received');
  
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      console.log('Session validation failed: No session ID provided');
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }

    const sessionData = sessionStore.get(sessionId);
    const now = Date.now();

    if (!sessionData) {
      console.log('Session validation failed: Session not found for ID:', sessionId.substring(0, 8) + '...');
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }

    if (now > sessionData.expiresAt) {
      console.log('Session validation failed: Session expired for user:', sessionData.username);
      sessionStore.delete(sessionId);
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }

    console.log(`Session validation successful for user: ${sessionData.username}`);
    
    return res.status(200).json({
      success: true,
      username: sessionData.username,
      loginState: sessionData.loginState
    });

  } catch (error) {
    console.error('Session validation error:', error);
    console.error('Validation error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      sessionIdPrefix: req.body?.sessionId?.substring(0, 8) + '...' || 'undefined'
    });
    return res.status(401).json({
      success: false,
      error: 'Invalid session'
    });
  }
});

// Logout endpoint
app.post('/ws/node/api/auth/logout', (req, res) => {
  console.log('Logout request received');
  
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      console.log('Logout failed: No session ID provided');
      return res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    }

    const sessionData = sessionStore.get(sessionId);
    if (sessionData) {
      sessionStore.delete(sessionId);
      console.log(`Session terminated for user: ${sessionData.username} (Session: ${sessionId.substring(0, 8)}...)`);
    } else {
      console.log(`Logout attempted for non-existent session: ${sessionId.substring(0, 8)}...`);
    }

    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    console.error('Logout error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      sessionIdPrefix: req.body?.sessionId?.substring(0, 8) + '...' || 'undefined'
    });
    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  }
});

// Test connection to Loytec device
app.get('/ws/node/api/auth/test-connection', async (req, res) => {
  console.log('Connection test request received');
  
  try {
    const loytecBaseUrl = process.env.LOYTEC_BASE_URL || 'https://192.168.50.69';
    const testUrl = `${loytecBaseUrl}/webui/`;
    
    console.log(`Testing connection to: ${testUrl}`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'BridgesBimViewer/1.0'
      }
    });

    clearTimeout(timeoutId);

    // 401 is expected without auth, so it's a valid response
    const isConnected = response.ok || response.status === 401;
    
    console.log('Connection test result:', {
      connected: isConnected,
      status: response.status,
      statusText: response.statusText,
      url: loytecBaseUrl
    });
    
    return res.status(200).json({
      success: true,
      connected: isConnected
    });

  } catch (error) {
    console.error('Connection test error:', error);
    console.error('Connection error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: loytecBaseUrl
    });
    return res.status(200).json({
      success: true,
      connected: false
    });
  }
});

// Data Point Routes

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

// Get info panels configuration
app.get('/ws/node/api/getInfoPanelsConfig', (req, res) => {
  console.log('getInfoPanelsConfig function started');

  try {
    const configFilePath = path.join(__dirname, 'info-panels-config.json');

    // Check if file exists
    if (!fs.existsSync(configFilePath)) {
      return res.status(404).json({ 
        error: 'Info panels configuration file not found' 
      });
    }

    console.log('Reading info panels configuration file');

    // Read the file
    fs.readFile(configFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading info panels config file:', err);
        return res.status(500).json({ 
          error: `Error reading configuration file: ${err.message}` 
        });
      }

      try {
        const configData = JSON.parse(data);
        console.log('Info panels configuration loaded successfully');
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        return res.status(200).json(configData);
      } catch (parseError) {
        console.error('Error parsing info panels config JSON:', parseError);
        return res.status(500).json({ 
          error: `Error parsing configuration file: ${parseError.message}` 
        });
      }
    });

  } catch (error) {
    console.error('Error processing getInfoPanelsConfig request:', error);

    return res.status(500).json({ 
      error: `Error processing request: ${error.message}` 
    });
  }
});

// Update info panel configuration
app.post('/ws/node/api/updateInfoPanel', (req, res) => {
  console.log('updateInfoPanel function started');

  try {
    const updatedPanel = req.body;
    console.log('Received panel update:', updatedPanel);

    if (!updatedPanel.id) {
      return res.status(400).json({ 
        error: 'Panel ID is required' 
      });
    }

    const configFilePath = path.join(__dirname, 'info-panels-config.json');

    // Check if file exists
    if (!fs.existsSync(configFilePath)) {
      return res.status(404).json({ 
        error: 'Info panels configuration file not found' 
      });
    }

    // Read the current configuration
    fs.readFile(configFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading info panels config file:', err);
        return res.status(500).json({ 
          error: `Error reading configuration file: ${err.message}` 
        });
      }

      try {
        const config = JSON.parse(data);
        
        // Find and update the panel
        const panelIndex = config.panels.findIndex(panel => panel.id === updatedPanel.id);
        
        if (panelIndex === -1) {
          return res.status(404).json({ 
            error: `Panel with ID '${updatedPanel.id}' not found` 
          });
        }

        // Update the panel data
        config.panels[panelIndex] = {
          ...config.panels[panelIndex],
          ...updatedPanel,
          modified: new Date().toISOString()
        };

        // Write the updated configuration back to file
        fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf8', (writeErr) => {
          if (writeErr) {
            console.error('Error writing info panels config file:', writeErr);
            return res.status(500).json({ 
              error: `Error saving configuration file: ${writeErr.message}` 
            });
          }

          console.log(`Panel '${updatedPanel.id}' updated successfully`);
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).json({ 
            success: true,
            message: `Panel '${updatedPanel.id}' updated successfully`,
            panel: config.panels[panelIndex]
          });
        });

      } catch (parseError) {
        console.error('Error parsing info panels config JSON:', parseError);
        return res.status(500).json({ 
          error: `Error parsing configuration file: ${parseError.message}` 
        });
      }
    });

  } catch (error) {
    console.error('Error processing updateInfoPanel request:', error);
    return res.status(500).json({ 
      error: `Error processing request: ${error.message}` 
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
    if (!fs.existsSync(ifcFilePath)) {
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
    const fileStream = fs.createReadStream(ifcFilePath);
    
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
  console.log(`Authentication endpoints available at:`);
  console.log(`  - POST http://localhost:${PORT}/ws/node/api/auth/login`);
  console.log(`  - POST http://localhost:${PORT}/ws/node/api/auth/validate`);
  console.log(`  - POST http://localhost:${PORT}/ws/node/api/auth/logout`);
  console.log(`  - GET  http://localhost:${PORT}/ws/node/api/auth/test-connection`);
  console.log(`Data API endpoints available at:`);
  console.log(`  - http://localhost:${PORT}/ws/node/api/getDataPoint?key=M1`);
  console.log(`  - http://localhost:${PORT}/ws/node/api/getAllDataPointKeys`);
  console.log(`  - http://localhost:${PORT}/ws/node/api/getAllDatapoints`);
  console.log(`  - http://localhost:${PORT}/ws/node/api/GetDpsMapKeys`);
  console.log(`  - http://localhost:${PORT}/ws/node/api/getInfoPanelsConfig`);
  console.log(`  - http://localhost:${PORT}/ws/node/api/updateInfoPanel`);
  console.log(`  - http://localhost:${PORT}/ws/node/api/streamIfc`);
});

module.exports = app;
