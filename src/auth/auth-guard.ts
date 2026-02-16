/**
 * Auth Guard for BimViewer
 * Checks authentication status and redirects to portal if not logged in
 * 
 * Set VITE_DEV_SKIP_AUTH=true in .env.development.local to bypass auth in development
 * Set VITE_HUB_URL in development to enable cross-origin SSO with bridges-hub
 */

// Hub URL for cross-origin SSO (development mode)
const HUB_URL = import.meta.env.VITE_HUB_URL || '';

// Portal and auth URLs - use absolute URLs in dev mode with hub URL
const PORTAL_URL = HUB_URL ? `${HUB_URL}/ws/node/` : '/ws/node/';
const AUTH_VALIDATE_URL = HUB_URL ? `${HUB_URL}/ws/node/auth/validate` : '/ws/node/auth/validate';

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
  // Store intended destination for after login (backup)
  sessionStorage.setItem('auth_redirect', currentUrl);
  
  // Pass returnUrl as query parameter to hub portal
  const portalLoginUrl = `${PORTAL_URL}?returnUrl=${encodeURIComponent(currentUrl)}`;
  console.log('[Auth] Redirecting to login:', portalLoginUrl);
  window.location.href = portalLoginUrl;
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
  return user || { username: 'unknown', loginTime: new Date().toISOString() };
}

/**
 * Logout and redirect to portal
 */
export async function logout(): Promise<void> {
  try {
    const logoutUrl = HUB_URL ? `${HUB_URL}/ws/node/auth/logout` : '/ws/node/auth/logout';
    await fetch(logoutUrl, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout failed:', error);
  }
  
  window.location.href = PORTAL_URL;
}

export default { checkAuth, redirectToLogin, initAuthGuard, logout };
