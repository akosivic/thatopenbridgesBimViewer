const http = require('http');
const { app } = require('@azure/functions');
const { logMessage, logError } = require('../logger');

// Target endpoint
const targetHost = process.env.DPS_API_HOST || '192.168.50.179';
const targetPort = process.env.DPS_API_PORT || '8083';
const targetPath = process.env.DPS_API_PATH || '/api/GetDpsMapValues';

// Forward any query parameters from the original request

// Register the getDpsValues function
app.http('GetDpsMapKeys', {

  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    console.log("GetDpsMapKeys");
    return await GetDpsMapKeys(request, context);
  }
});

app.http('getDataPoint', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    logMessage(context, 'getDataPoint function started');
    
    try {
      // Parse the URL string to get searchParams
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      const key = url.searchParams.get('key');

      if (!key) {
        return {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Missing key parameter' })
        };
      }

      // Get the response from DPS API
      const response = await GetDpsMapKeys(request, context);
      
      // Check if the API call was successful
      if (response.status !== 200) {
        return {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Failed to fetch data from DPS API' })
        };
      }

      // Parse the response body to get the actual data
      const data = JSON.parse(response.body);
      
      console.log('Parsed data:', data);
      console.log('Looking for key:', key);
      
      // Check if the key exists in the data
      if (data.hasOwnProperty(key)) {
        const dataPoint = data[key];
        console.log(`Data point found for key: ${key}`, dataPoint);
        logMessage(context, `Data point found for key: ${key}`);

        return {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(dataPoint)
        };
      } else {
        logMessage(context, `No data point found for key: ${key}`);
        console.log('Available keys:', Object.keys(data));

        return {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            error: `No data point found for key: ${key}`,
            availableKeys: Object.keys(data)
          })
        };
      }
    } catch (error) {
      logError(context, `Error processing getDataPoint request:`, error);

      return {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: `Error processing request: ${error.message}` })
      };
    }
  }
});

// Register the getDpValue function for single datapoint
app.http('getDpValue', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    logMessage(context, 'GET single DP value request received');
    return await getDpValue(request, context);
  }
});

// Function to set a single datapoint value
app.http('setDpValue', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    logMessage(context, 'Set DP value request received');

    const dp = request.url.searchParams.get('dp');
    const value = request.url.searchParams.get('value');

    if (!dp || value === null) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing dp or value parameter' })
      };
    }

    try {
      const requestPath = `/api/SetDpValue?dp=${encodeURIComponent(dp)}&value=${encodeURIComponent(value)}`;

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

        logMessage(context, `SET request to: http://${targetHost}:${targetPort}${requestPath}`);

        const req = http.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            logMessage(context, `Data sent to DPS API for datapoint: ${dp}`);
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
          logError(context, `Error connecting to DPS API:`, error);
          reject(error);
        });

        req.end();
      });

      return response;
    } catch (error) {
      logError(context, `Error setting DP value:`, error);
      return {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: `Error setting DP value: ` + error.message })
      };
    }
  }
});

async function GetDpsMapKeys(request, context) {
  logMessage(context, 'DPS Values function started');

  try {

    const queryString = request.url.searchParams?.toString();
    const requestPath = queryString ? `${targetPath}?${queryString}` : targetPath;
    console.log('request', request);
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

      logMessage(context, `GET request to: http://${targetHost}:${targetPort}${requestPath}`);

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          logMessage(context, `Data received fromDPS API`);
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
        logError(context, `Error connecting to DPS API:`, error);
        reject(error);
      });

      req.end();
    });
    console.log(Object.keys(response));
    return response;
  } catch (error) {
    logError(context, `Error ${request.method === 'PUT' ? 'updating' : 'fetching'} DPS values:`, error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: `Error ${request.method === 'PUT' ? 'updating' : 'fetching'} DPS values: ` + error.message })
    };
  }
}

async function putDpsValues(request, context) {
  logMessage(context, 'DPS Values function started');

  try {
    const queryString = request.url.searchParams?.toString();
    const requestPath = queryString ? `${targetPath}?${queryString}` : targetPath;
    // Create a promise to handle the HTTP request
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: targetHost,
        port: targetPort,
        path: requestPath,
        method: 'PUT',
        headers: {
          'Accept': 'application/json'
        }
      };
      options.headers['Content-Type'] = 'application/json';

      logMessage(context, `PUT request to: http://${targetHost}:${targetPort}${requestPath}`);

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          logMessage(context, `Data sent DPS API`);
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
        logError(context, `Error sending to DPS API:`, error);
        reject(error);
      });
      req.write(request.body);
      req.end();
    });

    return response;
  } catch (error) {
    logError(context, `Error updating DPS values:`, error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: `Error updating DPS values: ` + error.message })
    };
  }
}



// {"test":{"Favorites.Light.Lounge.01.ST":false,"Favorites.Light.Lounge.02.ST":false,"Favorites.Light.TestRM.ST":false,"Favorites.Light.StockRM.ST":false,"Favorites.Light.Office.01.ST":false,"Favorites.Light.Office.02.ST":false,"Favorites.Light.Office.03.ST":false,"Favorites.Light.Office.04.ST":false,"Favorites.Light.ConfRM.01.ST":false,"Favorites.Light.ConfRM.02.ST":false,"Favorites.Light.ConfRM.03.ST":false,"Favorites.Light.ConfRM.04.ST":false}}

// Function to get a single datapoint value
async function getDpValue(request, context) {
  logMessage(context, 'Get single DP value function started');

  try {
    // Parse the URL string to get searchParams
    const urlObj = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const dp = urlObj.searchParams.get('dp');

    if (!dp) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing dp parameter' })
      };
    }

    // Create a custom path for the single datapoint request
    const requestPath = `/api/GetDpValue?dp=${encodeURIComponent(dp)}`;

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

      logMessage(context, `GET request to: http://${targetHost}:${targetPort}${requestPath}`);

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          logMessage(context, `Data received from DPS API for datapoint: ${dp}`);
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
        logError(context, `Error connecting to DPS API:`, error);
        reject(error);
      });

      req.end();
    });

    return response;
  } catch (error) {
    logError(context, `Error fetching DP value:`, error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: `Error fetching DP value: ` + error.message })
    };
  }
}

