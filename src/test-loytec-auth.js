// Test script for Loytec Authentication
// This script demonstrates how to use the enhanced authentication service

// Debug utility - only logs when ?debug parameter is in URL
const isDebugMode = () => typeof window !== 'undefined' && window.location?.search?.toLowerCase().includes('debug') || false;
const debugLog = (...args) => isDebugMode() && debugLog(...args);

import loytecAuthService from './src/services/loytecAuth';

// Example usage of the authentication service
async function testLoytecAuth() {
  debugLog('Testing Loytec Authentication...');
  
  // Test connection
  debugLog('1. Testing connection to Loytec server...');
  const isConnected = await loytecAuthService.testConnection();
  debugLog(`Connection test result: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
  
  if (!isConnected) {
    debugLog('âš ï¸  Cannot connect to Loytec server. Please check:');
    debugLog('   - Server URL is correct in .env file');
    debugLog('   - Server is accessible from this network');
    debugLog('   - No firewall blocking the connection');
    return;
  }
  
  // Example authentication (DO NOT use real credentials in production code!)
  debugLog('\n2. Example authentication process...');
  debugLog('Note: This is just showing the API structure');
  
  const exampleCredentials = {
    username: 'your_username',
    password: 'your_password'
  };
  
  debugLog('Authentication request would include:');
  debugLog('- Basic Auth header with credentials');
  debugLog('- X-Create-Session: 1 header');
  debugLog('- GET request to /webui/login');
  
  debugLog('\nExpected Loytec response format:');
  debugLog(JSON.stringify({
    "loginState": 1,
    "pwdMaxLen": 64,
    "authFail": [],
    "selectOptions": ["admin"],
    "hiddenInput": {},
    "sessUser": "admin",
    "loggedIn": true,
    "csrfToken": "061yKyN9Ky9zVbvVbMv+LvWFCgIkGCM8POGAO6UWZYg="
  }, null, 2));
  
  debugLog('\n3. Enhanced features available:');
  debugLog('âœ“ Automatic session cookie detection (multiple formats)');
  debugLog('âœ“ CSRF token extraction and storage');
  debugLog('âœ“ Detailed error handling with Loytec-specific messages');
  debugLog('âœ“ Session validation with the Loytec server');
  debugLog('âœ“ Authenticated request helper for future API calls');
  
  debugLog('\n4. Configuration:');
  debugLog('Current Loytec server URL:', process.env.VITE_LOYTEC_BASE_URL || 'https://192.168.50.56');
  debugLog('To change server URL, update VITE_LOYTEC_BASE_URL in .env file');
}

// Run the test if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  debugLog('🔍 Loytec Authentication Test Script');
  debugLog('=====================================');
  testLoytecAuth().catch(debugError);
} else {
  // Browser environment
  window.testLoytecAuth = testLoytecAuth;
  debugLog('🔍 Loytec authentication test function available as window.testLoytecAuth()');
}

export { testLoytecAuth };
