import { useEffect, useState } from 'react';
import { getAppConfig } from '../../config/appConfig';
import { debugWarn } from "../../utils/debugLogger";

type AuthDetails = {
  userId: string;
  userRoles: Array<string>;
  identityProvider: string;
  userDetails: string;
};

type RuntimeUser = {
  username?: string;
  fullName?: string;
  roles?: Array<string>;
};

const HUB_VALIDATE_URL = '/ws/node/validate';

const mapUserToAuthDetails = (user: RuntimeUser, identityProvider: string): AuthDetails | null => {
  if (!user?.username) {
    return null;
  }

  return {
    userId: user.username,
    userRoles: user.roles && user.roles.length > 0 ? user.roles : ['authenticated', 'user'],
    identityProvider,
    userDetails: user.fullName || user.username
  };
};

const getRuntimeUser = (): RuntimeUser | null => {
  const runtimeUser = (window as any).currentUser as RuntimeUser | undefined;
  return runtimeUser?.username ? runtimeUser : null;
};

export const checkAuthStatus = async (): Promise<{
  isAuthenticated: boolean;
  userDetails: AuthDetails | null;
}> => {
  const config = getAppConfig();
  
  // Only bypass authentication in development mode when explicitly enabled
  // This provides a secure way to disable auth for local development
  if (config.isDevelopment && config.skipAuthInDev) {
    debugWarn('DEVELOPMENT MODE: Bypassing authentication for local development');
    debugWarn('This bypass is automatically disabled in production builds');
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

  const runtimeUser = getRuntimeUser();
  if (runtimeUser) {
    return {
      isAuthenticated: true,
      userDetails: mapUserToAuthDetails(runtimeUser, 'bridges-hub-sso')
    };
  }

  try {
    const response = await fetch(HUB_VALIDATE_URL, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        isAuthenticated: false,
        userDetails: null
      };
    }

    const data = await response.json();
    const userDetails = mapUserToAuthDetails(data?.user || {}, 'bridges-hub-sso');

    if (!userDetails) {
      return {
        isAuthenticated: false,
        userDetails: null
      };
    }

    (window as any).currentUser = {
      username: userDetails.userId,
      fullName: userDetails.userDetails,
      roles: userDetails.userRoles
    };

    return {
      isAuthenticated: true,
      userDetails
    };
  } catch {
    return {
      isAuthenticated: false,
      userDetails: null
    };
  }
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
    userDetails: AuthDetails | null;
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
