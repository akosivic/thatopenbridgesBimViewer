# Loytec Authentication Integration

This document describes the complete Loytec authentication system integration for the BIM Viewer.

## Overview

The BIM Viewer supports secure authentication through Loytec systems using a Node.js server proxy. This approach provides better security and centralized authentication management, ideal for deployment on Loytec devices.

## Architecture

```
Frontend (React) → Node.js Proxy → Loytec Device
                     ↓
                Session Store
```

## Server-Side Authentication Endpoints

### Authentication Routes

#### `POST /ws/node/api/auth/login`
Authenticate user with Loytec device credentials.

**Request:**
```json
{
  "username": "user123",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "sessionId": "generated-session-id",
  "loytecResponse": {
    "loginState": 2,
    "loggedIn": true,
    "sessUser": "user123",
    "csrfToken": "csrf-token"
  }
}
```

#### `POST /ws/node/api/auth/validate`
Validate existing session.

**Request:**
```json
{
  "sessionId": "existing-session-id"
}
```

#### `POST /ws/node/api/auth/logout`
Logout and cleanup session.

**Request:**
```json
{
  "sessionId": "session-to-logout"
}
```

#### `GET /ws/node/api/auth/test-connection`
Test connection to Loytec device.

## Frontend Integration

### Configuration

Set the Loytec server URL in your environment:

```bash
# .env
VITE_LOYTEC_BASE_URL=https://your-loytec-device.local
LOYTEC_BASE_URL=https://your-loytec-device.local
```

### Authentication Flow

1. **Login Form**: User enters Loytec credentials
2. **Server Proxy**: Credentials sent to Node.js server
3. **Loytec Request**: Server authenticates with Loytec device
4. **Session Creation**: Server creates local session
5. **Frontend Session**: Client stores session information

### Session Management

- **Session Storage**: Sessions stored in `sessionStorage`
- **Auto-validation**: Sessions validated on app startup
- **Remember Me**: Usernames can be remembered locally
- **Logout**: Complete cleanup of local and server sessions

## Security Features

### Development Mode
- **Authentication Bypass**: Can be enabled with `VITE_DEV_SKIP_AUTH=true`
- **Production Safe**: Bypass automatically disabled in production builds
- **Clear Warnings**: Console warnings when bypass is active

### Production Mode
- **HTTPS Enforcement**: Use HTTPS in production
- **Session Validation**: Regular session validation with Loytec
- **CSRF Protection**: CSRF token validation
- **Secure Storage**: Secure session storage practices

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_LOYTEC_BASE_URL` | Loytec device URL | `https://192.168.50.56` |
| `VITE_API_TIMEOUT` | API timeout (ms) | `10000` |
| `VITE_DEV_SKIP_AUTH` | Development auth bypass | `false` |

### Advanced Settings

The login form includes advanced settings to configure:
- Custom Loytec server URL
- Connection testing
- Debug information

## Troubleshooting

### Common Issues

#### Connection Errors
- **Symptoms**: "Connection failed" errors
- **Solution**: Check Loytec device URL and network connectivity
- **Debug**: Use test connection endpoint

#### Authentication Failures
- **Symptoms**: "Invalid credentials" errors
- **Solution**: Verify username/password with Loytec system
- **Debug**: Check Loytec device logs

#### Session Expiry
- **Symptoms**: Automatic logout
- **Solution**: Normal behavior - re-authenticate as needed
- **Debug**: Check session duration settings

### Debug Mode

Enable detailed authentication logging:

```bash
VITE_DEBUG_AUTH=true
```

## Migration Notes

### From Direct Frontend Authentication

If migrating from direct frontend authentication:

1. **Remove**: Direct Loytec API calls from frontend
2. **Update**: Authentication service to use proxy endpoints
3. **Configure**: Server-side Loytec connection
4. **Test**: All authentication flows

### Security Improvements

The proxy approach provides:
- **Credential Protection**: Loytec credentials never sent to browser
- **Session Management**: Centralized session handling
- **CORS Security**: Proper CORS configuration
- **Rate Limiting**: Server-side request throttling

## API Reference

### Authentication Service (`loytecAuth.ts`)

```typescript
interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
  loytecResponse?: any;
}

// Main authentication methods
authenticate(credentials: LoginCredentials): Promise<AuthResponse>
validateSession(sessionId: string): Promise<boolean>
logout(sessionId: string): Promise<void>
```

### Configuration Service (`appConfig.ts`)

```typescript
interface AppConfig {
  loytecBaseUrl: string;
  isDevelopment: boolean;
  apiTimeout: number;
  skipAuthInDev: boolean;
}

getAppConfig(): AppConfig
validateConfig(config: AppConfig): boolean
```

This integration provides a secure, scalable authentication system that works seamlessly with existing Loytec infrastructure.