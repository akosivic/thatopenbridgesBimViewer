/**
 * Shared logging utilities for Azure Functions
 */

// Helper function to log messages based on environment
function logMessage(context, message) {
  if (!process.env.AZURE_FUNCTIONS_ENVIRONMENT) {
    context.log(message);
  } else {
    console.log(message);
  }
}

// Helper function to log errors based on environment
function logError(context, message, error) {
  if (!process.env.AZURE_FUNCTIONS_ENVIRONMENT) {
    context.log.error(message, error);
  } else {
    console.error(message, error);
  }
}

module.exports = {
  logMessage,
  logError
};