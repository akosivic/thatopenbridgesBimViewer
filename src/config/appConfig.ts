// Environment configuration for Loytec authentication

export interface AppConfig {
  loytecBaseUrl: string;
  isDevelopment: boolean;
  apiTimeout: number;
}

// Get configuration from environment variables or use defaults
export const getAppConfig = (): AppConfig => {
  return {
    loytecBaseUrl: import.meta.env.VITE_LOYTEC_BASE_URL || 'http://192.168.50.56',
    isDevelopment: import.meta.env.DEV || false,
    apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000', 10)
  };
};

// Validate configuration
export const validateConfig = (config: AppConfig): boolean => {
  if (!config.loytecBaseUrl) {
    console.error('VITE_LOYTEC_BASE_URL is not configured');
    return false;
  }
  
  try {
    new URL(config.loytecBaseUrl);
  } catch {
    console.error('VITE_LOYTEC_BASE_URL is not a valid URL');
    return false;
  }
  
  return true;
};