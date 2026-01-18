/**
 * BimViewer Backend Module Export
 * Exports routes for use by bridges-hub gateway server
 * 
 * Note: Auth endpoints are handled by bridges-hub.
 * This module only exports BimViewer-specific API routes.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ============================================
// Helper Functions
// ============================================

// Helper function to convert Loytec datapoints to original format
function convertLoytecToOriginalFormat(loytecDataPoints) {
  const converted = {};
  
  for (const [groupKey, dataPoints] of Object.entries(loytecDataPoints)) {
    converted[groupKey] = dataPoints.map(dp => {
      return { [dp.id]: dp.name };
    });
  }
  
  return converted;
}

// Helper function to load Loytec datapoints from JSON file
function loadLoytecDataPoints() {
  try {
    const dataPath = path.join(__dirname, 'loytec-datapoints.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('[BimViewer] Error loading Loytec datapoints:', error);
    return {};
  }
}

// Function to get available datapoint keys
function getAvailableDataPointKeys() {
  const dataPoints = loadLoytecDataPoints();
  return Object.keys(dataPoints);
}

// Helper function to save Loytec datapoints to JSON file
function saveLoytecDataPoints(dataPoints) {
  try {
    const dataPath = path.join(__dirname, 'loytec-datapoints.json');
    const jsonData = JSON.stringify(dataPoints, null, 2);
    fs.writeFileSync(dataPath, jsonData, 'utf8');
    return true;
  } catch (error) {
    console.error('[BimViewer] Error saving Loytec datapoints:', error);
    return false;
  }
}

// ============================================
// Health Check
// ============================================
router.get('/bimviewer/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'bimviewer-api',
    version: '1.0.0'
  });
});

// ============================================
// Data Point Routes
// ============================================

// Get data point by key
router.get('/getDataPoint', (req, res) => {
  console.log('[BimViewer] getDataPoint request');

  try {
    const key = req.query.key;

    if (!key) {
      return res.status(400).json({ error: 'Missing key parameter' });
    }

    const loytecDataPoints = loadLoytecDataPoints();

    if (loytecDataPoints.hasOwnProperty(key)) {
      const dataPoint = loytecDataPoints[key];
      
      const convertedDataPoint = dataPoint.map(dp => ({ 
        [dp.id]: {
          name: dp.name,
          status: dp.status,
          value: dp.value,
          type: dp.type,
          description: dp.description
        }
      }));
      
      return res.status(200).json(convertedDataPoint);
    } else {
      return res.status(404).json({ 
        error: `No data point found for key: ${key}`,
        availableKeys: getAvailableDataPointKeys()
      });
    }
  } catch (error) {
    console.error('[BimViewer] Error processing getDataPoint:', error);
    return res.status(500).json({ 
      error: `Error processing request: ${error.message}`
    });
  }
});

// Get all data point keys
router.get('/getAllDataPointKeys', (req, res) => {
  console.log('[BimViewer] getAllDataPointKeys request');

  try {
    const keys = getAvailableDataPointKeys();
    return res.status(200).json({ keys });
  } catch (error) {
    console.error('[BimViewer] Error getting all data point keys:', error);
    return res.status(500).json({ 
      error: `Error getting all keys: ${error.message}` 
    });
  }
});

// Get initial button states
router.get('/getInitialButtonStates', (req, res) => {
  console.log('[BimViewer] getInitialButtonStates request');

  try {
    const loytecDataPoints = loadLoytecDataPoints();
    const buttonStates = {};

    for (const [groupKey, dataPoints] of Object.entries(loytecDataPoints)) {
      const hasAnyOn = dataPoints.some(dp => dp.status === 'ON');
      buttonStates[groupKey] = hasAnyOn;
    }

    return res.status(200).json(buttonStates);
  } catch (error) {
    console.error('[BimViewer] Error getting initial button states:', error);
    return res.status(500).json({ 
      error: `Error getting initial button states: ${error.message}` 
    });
  }
});

// Get all datapoints
router.get('/getAllDatapoints', (req, res) => {
  console.log('[BimViewer] getAllDatapoints request');

  try {
    const loytecDataPoints = loadLoytecDataPoints();
    const convertedDataPoints = convertLoytecToOriginalFormat(loytecDataPoints);
    return res.status(200).json(convertedDataPoints);
  } catch (error) {
    console.error('[BimViewer] Error getting all datapoints:', error);
    return res.status(500).json({ 
      error: `Error getting all datapoints: ${error.message}` 
    });
  }
});

// Get DPS Map Keys (backward compatibility)
router.get('/GetDpsMapKeys', (req, res) => {
  console.log('[BimViewer] GetDpsMapKeys request');

  try {
    const loytecDataPoints = loadLoytecDataPoints();
    const convertedDataPoints = convertLoytecToOriginalFormat(loytecDataPoints);
    return res.status(200).json(convertedDataPoints);
  } catch (error) {
    console.error('[BimViewer] Error getting datapoints:', error);
    return res.status(500).json({ 
      error: `Error getting datapoints: ${error.message}` 
    });
  }
});

// Enhanced Loytec datapoint endpoint
router.get('/getLoytecDataPoint', (req, res) => {
  console.log('[BimViewer] getLoytecDataPoint request');

  try {
    const key = req.query.key;

    if (!key) {
      return res.status(400).json({ error: 'Missing key parameter' });
    }

    const loytecDataPoints = loadLoytecDataPoints();

    if (loytecDataPoints.hasOwnProperty(key)) {
      const dataPoint = loytecDataPoints[key];

      const response = {
        key: key,
        timestamp: new Date().toISOString(),
        source: 'loytec-mock',
        dataPoints: dataPoint,
        summary: {
          total: dataPoint.length,
          onCount: dataPoint.filter(dp => dp.status === 'ON').length,
          offCount: dataPoint.filter(dp => dp.status === 'OFF').length,
          devices: dataPoint.map(dp => ({
            id: dp.id,
            name: dp.name,
            status: dp.status,
            value: dp.value
          }))
        }
      };

      return res.status(200).json(response);
    } else {
      return res.status(404).json({ 
        error: `No data point found for key: ${key}`,
        availableKeys: getAvailableDataPointKeys()
      });
    }
  } catch (error) {
    console.error('[BimViewer] Error processing getLoytecDataPoint:', error);
    return res.status(500).json({ 
      error: `Error processing request: ${error.message}`
    });
  }
});

// Toggle individual light status
router.post('/toggleLight', (req, res) => {
  console.log('[BimViewer] toggleLight request');

  try {
    const { groupKey, lightId } = req.body;

    if (!groupKey || !lightId) {
      return res.status(400).json({ 
        error: 'Missing groupKey or lightId parameter',
        required: { groupKey: 'string', lightId: 'string' }
      });
    }

    const loytecDataPoints = loadLoytecDataPoints();

    if (!loytecDataPoints.hasOwnProperty(groupKey)) {
      return res.status(404).json({ 
        error: `Group ${groupKey} not found`,
        availableGroups: Object.keys(loytecDataPoints)
      });
    }

    const groupLights = loytecDataPoints[groupKey];
    const lightIndex = groupLights.findIndex(light => light.id === lightId);

    if (lightIndex === -1) {
      return res.status(404).json({ 
        error: `Light ${lightId} not found in group ${groupKey}`,
        availableLights: groupLights.map(l => ({ id: l.id, name: l.name }))
      });
    }

    const currentLight = groupLights[lightIndex];
    const newStatus = currentLight.status === 'ON' ? 'OFF' : 'ON';
    const newValue = newStatus === 'ON' ? 1 : 0;

    loytecDataPoints[groupKey][lightIndex] = {
      ...currentLight,
      status: newStatus,
      value: newValue,
      timestamp: new Date().toISOString()
    };

    const saveSuccess = saveLoytecDataPoints(loytecDataPoints);

    if (!saveSuccess) {
      return res.status(500).json({ 
        error: 'Failed to save light status change'
      });
    }

    console.log(`[BimViewer] Light toggled: ${groupKey}.${lightId} -> ${newStatus}`);

    const updatedLight = loytecDataPoints[groupKey][lightIndex];
    const groupSummary = {
      total: groupLights.length,
      onCount: groupLights.filter(l => l.status === 'ON').length,
      offCount: groupLights.filter(l => l.status === 'OFF').length
    };

    return res.status(200).json({
      success: true,
      light: updatedLight,
      groupSummary: groupSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[BimViewer] Error toggling light:', error);
    return res.status(500).json({ 
      error: `Error toggling light: ${error.message}`
    });
  }
});

// Toggle entire light group
router.post('/toggleLightGroup', (req, res) => {
  console.log('[BimViewer] toggleLightGroup request');

  try {
    const { lightGroup } = req.body;

    if (!lightGroup) {
      return res.status(400).json({ 
        error: 'Missing lightGroup parameter',
        required: { lightGroup: 'string (e.g., M1, M2, L1, etc.)' }
      });
    }

    const loytecDataPoints = loadLoytecDataPoints();

    if (!loytecDataPoints.hasOwnProperty(lightGroup)) {
      return res.status(404).json({ 
        error: `Light group ${lightGroup} not found`,
        availableGroups: Object.keys(loytecDataPoints)
      });
    }

    const groupLights = loytecDataPoints[lightGroup];
    const onCount = groupLights.filter(light => light.status === 'ON').length;
    const totalCount = groupLights.length;
    const majorityOn = onCount > (totalCount / 2);
    
    const newState = majorityOn ? 'OFF' : 'ON';
    const newValue = newState === 'ON' ? 1 : 0;
    
    console.log(`[BimViewer] Group ${lightGroup}: ${onCount}/${totalCount} ON -> Setting all to ${newState}`);

    loytecDataPoints[lightGroup] = groupLights.map(light => ({
      ...light,
      status: newState,
      value: newValue,
      timestamp: new Date().toISOString()
    }));

    const saveSuccess = saveLoytecDataPoints(loytecDataPoints);

    if (!saveSuccess) {
      return res.status(500).json({ 
        error: 'Failed to save light group status change'
      });
    }

    const groupSummary = {
      group: lightGroup,
      newState: newState,
      total: totalCount,
      onCount: newState === 'ON' ? totalCount : 0,
      offCount: newState === 'OFF' ? totalCount : 0,
      lights: loytecDataPoints[lightGroup].map(l => ({ id: l.id, name: l.name, status: l.status }))
    };

    return res.status(200).json({
      success: true,
      groupSummary: groupSummary,
      newState: newState,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[BimViewer] Error toggling light group:', error);
    return res.status(500).json({ 
      error: `Error toggling light group: ${error.message}`
    });
  }
});

// ============================================
// Export Module
// ============================================
module.exports = {
  routes: router
};

module.exports.default = {
  routes: router
};
