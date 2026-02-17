import { useEffect, useState } from 'react';
import { getAppConfig } from '../../config/appConfig';
import { debugWarn } from "../../utils/debugLogger";

export const checkAuthStatus = async (): Promise<{
  isAuthenticated: boolean;
  userDetails: { userId: string; userRoles: Array<string>; identityProvider: string; userDetails: string } | null;
}> => {
  const config = getAppConfig();
  
  // Only bypass authentication in development mode when explicitly enabled
  // This provides a secure way to disable auth for local development
  if (config.isDevelopment && config.skipAuthInDev) {
    debugWarn('ðŸš§ DEVELOPMENT MODE: Bypassing authentication for local development');
    debugWarn('âš ï¸  This bypass is automatically disabled in production builds');
    return {
      isAuthenticated: true,
      userDetails: {
        userId: 'dev-user',
        userRoles: ['authenticated', 'admin', 'developer'],
        identityProvider: 'development-bypass',
        userDetails: 'Development User (Auth Bypassed)'
      }
    };
  }

  // Trust hub SSO: If this code is running, the user is already authenticated
  // The auth-guard.ts validates authentication via hub's /ws/node/auth/validate
  // Hub gateway protects all routes with bridges_session cookie
  // No need for separate session validation here
  return {
    isAuthenticated: true,
    userDetails: {
      userId: 'hub-authenticated-user',
      userRoles: ['authenticated', 'user'],
      identityProvider: 'bridges-hub-sso',
      userDetails: 'Authenticated via Bridges Hub SSO'
    }
  };
};

export const login = async (_sessionId: string, _username: string, _authResponse?: any): Promise<void> => {
  // Login is now handled by Bridges Hub SSO
  // This function is kept for backward compatibility but does nothing
  debugWarn('Login called - authentication is now handled by Bridges Hub SSO');
};

export const logout = async (): Promise<void> => {
  // Clear all local storage
  sessionStorage.clear();
  localStorage.clear();
  
  // Redirect to hub's logout endpoint
  // This will invalidate the bridges_session cookie and redirect to login
  window.location.href = '/ws/node/logout';
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    userDetails: { userId: string; userRoles: Array<string>; identityProvider: string; userDetails: string } | null;
    isLoading: boolean;
  }>({
    isAuthenticated: false,
    userDetails: null,
    isLoading: true
  });

  const checkAuth = async () => {
    try {
      const result = await checkAuthStatus();
      setAuthState({
        isAuthenticated: result.isAuthenticated,
        userDetails: result.userDetails,
        isLoading: false
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        userDetails: null,
        isLoading: false
      });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return { ...authState, refreshAuth: checkAuth };
};
