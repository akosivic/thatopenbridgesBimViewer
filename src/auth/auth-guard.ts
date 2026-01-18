/**
 * Auth Guard for BimViewer
 * Checks authentication status and redirects to portal if not logged in
 * 
 * Set VITE_DEV_SKIP_AUTH=true in .env.development.local to bypass auth in development
 */

const PORTAL_URL = '/ws/node/';
const AUTH_VALIDATE_URL = '/ws/node/auth/validate';

// Check for dev mode auth bypass
const DEV_SKIP_AUTH = import.meta.env.VITE_DEV_SKIP_AUTH === 'true';

interface AuthUser {
  username: string;
  loginTime: string;
}

interface AuthResult {
  authenticated: boolean;
  user?: AuthUser;
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<AuthResult> {
  // Dev mode bypass
  if (DEV_SKIP_AUTH) {
    console.log('[Auth] DEV MODE: Skipping authentication');
    return { 
      authenticated: true, 
      user: { username: 'dev-user', loginTime: new Date().toISOString() } 
    };
  }

  try {
    const response = await fetch(AUTH_VALIDATE_URL, {
      method: 'GET',
      credentials: 'include', // Include cookies
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { authenticated: true, user: data.user };
    }
    
    return { authenticated: false };
  } catch (error) {
    console.error('Auth check failed:', error);
    return { authenticated: false };
  }
}

/**
 * Redirect to portal login
 * Preserves the intended destination in the URL
 */
export function redirectToLogin(): void {
  const currentUrl = window.location.href;
  // Store intended destination for after login
  sessionStorage.setItem('auth_redirect', currentUrl);
  window.location.href = PORTAL_URL;
}

/**
 * Initialize auth guard
 * Call this at application startup to ensure user is authenticated
 * @returns User object if authenticated, null if redirecting
 */
export async function initAuthGuard(): Promise<AuthUser | null> {
  const { authenticated, user } = await checkAuth();
  
  if (!authenticated) {
    console.log('Not authenticated, redirecting to portal...');
    redirectToLogin();
    return null;
  }
  
  console.log('Authenticated as:', user?.username);
  return user || null;
}

/**
 * Logout and redirect to portal
 */
export async function logout(): Promise<void> {
  try {
    await fetch('/ws/node/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout failed:', error);
  }
  
  window.location.href = PORTAL_URL;
}

export default { checkAuth, redirectToLogin, initAuthGuard, logout };
