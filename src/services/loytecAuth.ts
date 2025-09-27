// Loytec Authentication Service - Server Proxy Implementation

import { LoginCredentials, AuthResponse } from '../types/auth';

class LoytecAuthService {
  private apiBaseUrl: string;

  constructor() {
    // Use local server API endpoints
    this.apiBaseUrl = '/ws/node/api/auth';
  }

  /**
   * Authenticate with Loytec system via Node.js server proxy
   */
  async authenticate(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(credentials)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Server authentication error:', result);
        return {
          success: false,
          error: result.error || `Server error: ${response.status} ${response.statusText}`
        };
      }

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Authentication failed',
          loytecResponse: result.loytecResponse
        };
      }

      // Authentication successful
      console.log('Authentication successful via server proxy');
      return {
        success: true,
        sessionId: result.sessionId,
        message: result.message,
        loytecResponse: {
          sessUser: result.username,
          loginState: result.loginState,
          loggedIn: true,
          pwdMaxLen: 0,
          authFail: [],
          selectOptions: [],
          hiddenInput: []
        }
      };

    } catch (error) {
      console.error('Authentication service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed - network error'
      };
    }
  }

  /**
   * Test connection to Loytec system via server proxy
   */
  async testConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.apiBaseUrl}/test-connection`, {
        method: 'GET',
        signal: controller.signal,
        credentials: 'same-origin'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.success && result.connected;
      
    } catch (error) {
      console.error('Connection test error:', error);
      return false;
    }
  }

  /**
   * Validate current session via server proxy
   */
  async validateSession(sessionId?: string): Promise<boolean> {
    if (!sessionId) return false;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.success === true;

    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Logout from system via server proxy
   */
  async logout(sessionId?: string): Promise<void> {
    if (!sessionId) return;
    
    try {
      await fetch(`${this.apiBaseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ sessionId })
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Get CSRF token for authenticated requests
   */
  getCsrfToken(): string | null {
    return sessionStorage.getItem('loytec_csrf_token');
  }

  /**
   * Make an authenticated request to the server API
   */
  async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const sessionId = sessionStorage.getItem('loytec_session_id');
    
    if (!sessionId) {
      throw new Error('No active session');
    }

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('X-Session-ID', sessionId);

    const url = endpoint.startsWith('/ws/node/api/') ? endpoint : `/ws/node/api${endpoint}`;
    
    return fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin'
    });
  }
}

export default new LoytecAuthService();