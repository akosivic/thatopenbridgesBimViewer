// Loytec Authentication Service

import { LoginCredentials, AuthResponse, LoytecAuthConfig, LoytecAuthResponse } from '../types/auth';
import { getAppConfig } from '../config/appConfig';

class LoytecAuthService {
  private config: LoytecAuthConfig;

  constructor() {
    const appConfig = getAppConfig();
    this.config = {
      baseUrl: appConfig.loytecBaseUrl,
      endpoint: '/webui/login'
    };
  }

  /**
   * Authenticate with Loytec system using the /webui/login endpoint
   */
  async authenticate(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const url = `${this.config.baseUrl}${this.config.endpoint}`;
      
      // Prepare Basic Auth header
      const authString = btoa(`${credentials.username}:${credentials.password}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'X-Create-Session': '1',
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies for session management
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      // Parse response data
      const loytecResponse: LoytecAuthResponse = await response.json();
      
      // Validate the response structure and authentication status
      if (typeof loytecResponse.loggedIn !== 'boolean') {
        throw new Error('Invalid response format from Loytec server');
      }
      
      // Strict authentication check: MUST have loginState = 2 AND loggedIn = true
      if (loytecResponse.loginState !== 2 || !loytecResponse.loggedIn) {
        // Authentication failed - strict requirements not met
        const errorMessage = loytecResponse.authFail?.length > 0 
          ? loytecResponse.authFail.join(', ')
          : `Authentication failed - Required: loginState=2 and loggedIn=true. Got: loginState=${loytecResponse.loginState}, loggedIn=${loytecResponse.loggedIn}`;
        
        return {
          success: false,
          error: errorMessage,
          loytecResponse
        };
      }
      
      // Extract session information from response headers
      const sessionCookie = response.headers.get('set-cookie');
      const sessionId = this.extractSessionId(sessionCookie) || this.generateSessionId();

      return {
        success: true,
        sessionId,
        sessionCookie: sessionCookie || undefined,
        message: `Successfully authenticated as ${loytecResponse.sessUser} (Login State: ${loytecResponse.loginState})`,
        loytecResponse
      };

    } catch (error) {
      console.error('Loytec authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Test connection to Loytec system
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}/webui/`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok || response.status === 401; // 401 is expected without auth
    } catch {
      return false;
    }
  }

  /**
   * Extract session ID from cookie header
   */
  private extractSessionId(cookieHeader: string | null): string | undefined {
    if (!cookieHeader) return undefined;
    
    // Try multiple common session cookie patterns
    const patterns = [
      /sessionid=([^;]+)/i,
      /session=([^;]+)/i,
      /JSESSIONID=([^;]+)/i,
      /sid=([^;]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = cookieHeader.match(pattern);
      if (match) return match[1];
    }
    
    return undefined;
  }

  /**
   * Generate a fallback session ID when none is provided
   */
  private generateSessionId(): string {
    return `loytec_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate current session
   */
  async validateSession(sessionId?: string): Promise<boolean> {
    if (!sessionId) return false;
    
    try {
      // Try to validate session by calling the login endpoint without credentials
      // This should return current session status
      const url = `${this.config.baseUrl}/webui/login`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cookie': `sessionid=${sessionId}`
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        try {
          const data = await response.json();
          // If we get a valid response with loggedIn status, use it
          return data.loggedIn === true;
        } catch {
          // If JSON parsing fails, assume session is valid if response was OK
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Logout from Loytec system
   */
  async logout(sessionId?: string): Promise<void> {
    if (!sessionId) return;
    
    try {
      const url = `${this.config.baseUrl}/webui/logout`;
      await fetch(url, {
        method: 'GET',
        headers: {
          'Cookie': `sessionid=${sessionId}`
        }
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
   * Make an authenticated request to Loytec system
   */
  async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const sessionId = sessionStorage.getItem('loytec_session_id');
    const csrfToken = this.getCsrfToken();
    
    if (!sessionId) {
      throw new Error('No active session');
    }

    const headers = new Headers(options.headers);
    headers.set('Cookie', `sessionid=${sessionId}`);
    
    if (csrfToken && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')) {
      headers.set('X-CSRFToken', csrfToken);
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`;
    
    return fetch(url, {
      ...options,
      headers
    });
  }
}

export default new LoytecAuthService();