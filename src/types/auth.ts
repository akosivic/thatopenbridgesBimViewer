// Authentication types for Loytec integration

export interface LoytecAuthConfig {
  baseUrl: string;
  endpoint: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoytecAuthResponse {
  loginState: number;
  pwdMaxLen: number;
  authFail: string[];
  selectOptions: string[];
  hiddenInput: Record<string, any>;
  sessUser: string;
  loggedIn: boolean;
  csrfToken?: string;
}

export interface AuthResponse {
  success: boolean;
  sessionId?: string;
  sessionCookie?: string;
  message?: string;
  error?: string;
  loytecResponse?: LoytecAuthResponse;
}

export interface UserProfile {
  username: string;
  isAuthenticated: boolean;
  sessionId?: string;
  roles?: string[];
  loginState?: number;
  csrfToken?: string;
}