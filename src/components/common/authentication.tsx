import { useEffect, useState } from 'react';
import loytecAuthService from '../../services/loytecAuth';
import { UserProfile } from '../../types/auth';
import { getAppConfig } from '../../config/appConfig';

// Storage keys for session management
const SESSION_STORAGE_KEY = 'loytec_session_id';
const USER_STORAGE_KEY = 'loytec_user_profile';

export const checkAuthStatus = async (): Promise<{
  isAuthenticated: boolean;
  userDetails: { userId: string; userRoles: Array<string>; identityProvider: string; userDetails: string } | null;
}> => {
  const config = getAppConfig();
  
  // Only bypass authentication in development mode when explicitly enabled
  // This provides a secure way to disable auth for local development
  if (config.isDevelopment && config.skipAuthInDev) {
    console.warn('🚧 DEVELOPMENT MODE: Bypassing authentication for local development');
    console.warn('⚠️  This bypass is automatically disabled in production builds');
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

  const sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  const userProfile = sessionStorage.getItem(USER_STORAGE_KEY);
  
  if (!sessionId || !userProfile) {
    return { isAuthenticated: false, userDetails: null };
  }

  try {
    // Validate the session with Loytec
    const isValid = await loytecAuthService.validateSession(sessionId);
    
    if (isValid) {
      const user = JSON.parse(userProfile) as UserProfile;
      return {
        isAuthenticated: true,
        userDetails: {
          userId: user.username,
          userRoles: user.roles || ['authenticated', 'user'],
          identityProvider: 'loytec',
          userDetails: user.username
        }
      };
    } else {
      // Session is invalid, clear storage
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      return { isAuthenticated: false, userDetails: null };
    }
  } catch (error) {
    console.error('Auth status check failed:', error);
    // Clear storage on error
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    return { isAuthenticated: false, userDetails: null };
  }
};

export const login = async (sessionId: string, username: string, authResponse?: any): Promise<void> => {
  const userProfile: UserProfile = {
    username,
    isAuthenticated: true,
    sessionId,
    roles: ['authenticated', 'user'],
    loginState: authResponse?.loytecResponse?.loginState,
    csrfToken: authResponse?.loytecResponse?.csrfToken
  };

  // Store session information
  sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
  
  // Store CSRF token separately for easy access
  if (userProfile.csrfToken) {
    sessionStorage.setItem('loytec_csrf_token', userProfile.csrfToken);
  }
};

export const logout = async (): Promise<void> => {
  const sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  
  try {
    // Logout from Loytec system if we have a session
    if (sessionId) {
      await loytecAuthService.logout(sessionId);
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage regardless of logout success
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem('loytec_csrf_token');
    localStorage.clear(); // Clear any other stored data
    
    // Redirect to login page
    window.location.href = '/ws/node/bimviewer/';
  }
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