const http = require('http');
const { app } = require('@azure/functions');
const { logMessage, logError } = require('../logger');

// Register the getDpsValues function
app.http('getDpsValues', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    return await getDpsValues(request, context);
  }
});

async function getDpsValues(request, context) {
  logMessage(context, 'DPS Values function started');

  try {
    // Target endpoint
    const targetHost = process.env.DPS_API_HOST || '192.168.50.179';
    const targetPort = process.env.DPS_API_PORT || '8083';
    const targetPath = process.env.DPS_API_PATH || '/api/GetDpsValues';

    // Forward any query parameters from the original request
    const queryString = request.url.searchParams.toString();
    const requestPath = queryString ? `${targetPath}?${queryString}` : targetPath;

    // Create a promise to handle the HTTP request
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: targetHost,
        port: targetPort,
        path: requestPath,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      logMessage(context, `Connecting to: http://${targetHost}:${targetPort}${requestPath}`);

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          logMessage(context, 'Data received from DPS API');
          resolve({
            status: res.statusCode,
            headers: {
              'Content-Type': res.headers['content-type'] || 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: data
          });
        });
      });

      req.on('error', (error) => {
        logError(context, 'Error connecting to DPS API:', error);
        reject(error);
      });

      req.end();
    });

    return response;
  } catch (error) {
    logError(context, 'Error fetching DPS values:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: "Error fetching DPS values: " + error.message })
    };
  }
}