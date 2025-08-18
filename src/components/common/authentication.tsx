import { useEffect, useState } from 'react';

export const checkAuthStatus = async () => {
  // For on-premises deployment, we'll always return authenticated
  // You can modify this to implement your own authentication logic if needed
  const userDetails = {
    userId: 'local-user',
    userRoles: ['authenticated', 'contributor', 'owner', 'reader'],
    identityProvider: 'local',
    userDetails: 'Local User'
  };
  return { isAuthenticated: true, userDetails };
};

export const login = async (path: string) => {
  // For on-premises deployment, just redirect to the path
  // No authentication needed
  const currentPath = path || window.location.pathname;
  window.location.href = currentPath;
};

export const logout = async () => {
  // For on-premises deployment, just clear localStorage and refresh
  // No Azure logout needed
  localStorage.clear();
  window.location.href = '/';
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