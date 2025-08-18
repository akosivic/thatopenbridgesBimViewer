const { app } = require('@azure/functions');
const { logMessage, logError } = require('../logger');

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
}

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

app.http('getAllDatapoints', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    logMessage(context, 'getAllDatapoints function started');

    try {
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(dataPointMap)
      };
    } catch (error) {
      logError(context, `Error getting all datapoints:`, error);

      return {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: `Error getting all datapoints: ${error.message}` })
      };
    }
  }
});

// Add the GetDpsMapKeys endpoint to match the expected API from dpsValuesApi
app.http('GetDpsMapKeys', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    logMessage(context, 'GetDpsMapKeys function started');

    try {
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(dataPointMap)
      };
    } catch (error) {
      logError(context, `Error getting datapoints via GetDpsMapKeys:`, error);

      return {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: `Error getting datapoints: ${error.message}` })
      };
    }
  }
});