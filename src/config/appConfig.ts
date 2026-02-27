// Environment configuration for Loytec authentication

import { debugLog, debugWarn, debugError } from "../utils/debugLogger";

export interface AppConfig {
  loytecBaseUrl: string;
  isDevelopment: boolean;
  apiTimeout: number;
  skipAuthInDev: boolean;
}

// Get configuration from environment variables or use defaults
export const getAppConfig = (): AppConfig => {
  // Only allow auth bypass in development mode for security
  const isDevelopment = import.meta.env.DEV || false;
  const skipAuthInDev = isDevelopment && import.meta.env.VITE_DEV_SKIP_AUTH === 'true';
  
  // Log security status
  if (isDevelopment && skipAuthInDev) {
    debugWarn('🚧 DEVELOPMENT MODE: Authentication bypass is ENABLED');
  } else if (isDevelopment && !skipAuthInDev) {
    debugLog('🔒 DEVELOPMENT MODE: Authentication bypass is DISABLED');
  }
  
  return {
    loytecBaseUrl: import.meta.env.VITE_LOYTEC_BASE_URL || 'https://192.168.50.56',
    isDevelopment,
    apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000', 10),
    skipAuthInDev
  };
};

// Validate configuration
export const validateConfig = (config: AppConfig): boolean => {
  if (!config.loytecBaseUrl) {
    debugError('VITE_LOYTEC_BASE_URL is not configured');
    return false;
  }
  
  try {
    new URL(config.loytecBaseUrl);
  } catch {
    debugError('VITE_LOYTEC_BASE_URL is not a valid URL');
    return false;
  }
  
  return true;
};
