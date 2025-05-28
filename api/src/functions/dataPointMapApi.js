const { app } = require('@azure/functions');
const { logMessage, logError } = require('../logger');

// In-memory map of string keys to datapoints
const dataPointMap = {
  "723420": { id: "Favorites.Light.Lounge.01.ST" },
  "727329": { id: "Favorites.Light.Lounge.02.ST" },
  "727413": { id: "Favorites.Light.TestRM.ST" },
  "727441": { id: "Favorites.Light.StockRM.ST" },
  "727469": { id: "Favorites.Light.Office.01.ST" },
  "727495": { id: "Favorites.Light.ConfRM.01.ST" }
};

// Register the getDataPoint function
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

      // Check if the key exists in the map
      if (dataPointMap.hasOwnProperty(key)) {
        const dataPoint = dataPointMap[key];
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

        return {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: `No data point found for key: ${key}` })
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

app.http('getAllDataPointKeys', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    logMessage(context, 'getAllDataPointKeys function started');

    try {
      const keys = Object.keys(dataPointMap);

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ keys })
      };
    } catch (error) {
      logError(context, `Error getting all data point keys:`, error);

      return {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: `Error getting all keys: ${error.message}` })
      };
    }
  }
});