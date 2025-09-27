# Authentication Update - Server Proxy Implementation

## Overview

The login system has been updated to use a Node.js server proxy instead of direct Loytec device communication from the frontend. This approach is ideal for deployment on Loytec devices as it provides better security and centralized authentication management.

## Changes Made

### 1. Server-Side Authentication Endpoints (`server/server.js`)

Added the following new authentication endpoints:

#### Authentication Routes:
- `POST /ws/node/api/auth/login` - Authenticate user with Loytec device
- `POST /ws/node/api/auth/validate` - Validate existing session
- `POST /ws/node/api/auth/logout` - Terminate user session
- `GET /ws/node/api/auth/test-connection` - Test connection to Loytec device

#### Key Features:
- Server-side session management using in-memory store
- Secure session ID generation using crypto module
- Automatic session cleanup (24-hour expiration)
- Proxy communication with Loytec device
- Comprehensive error handling

### 2. Frontend Service Update (`src/services/loytecAuth.ts`)

Completely refactored the authentication service:

#### New Architecture:
- Calls local Node.js API endpoints instead of Loytec directly
- Maintains same interface for existing components
- Improved error handling and logging
- Session management via server proxy

#### Maintained Compatibility:
- Same method signatures for existing components
- No changes required to LoginForm or other UI components
- Backward compatible session handling

### 3. Configuration

#### Environment Variables:
- `LOYTEC_BASE_URL` - Loytec device URL (defaults to https://192.168.50.56)
- `PORT` - Server port (defaults to 8001)

#### No Additional Dependencies:
- Uses only existing Node.js built-in modules
- No additional npm packages required
- Compatible with Loytec device deployment requirements

## Benefits

### Security Improvements:
- User credentials never leave the server
- Centralized session management
- Reduced attack surface for client-side vulnerabilities

### Deployment Advantages:
- Single server deployment on Loytec device
- No CORS issues with client-side authentication
- Better control over Loytec device communication

### Maintainability:
- Centralized authentication logic
- Easier debugging and monitoring
- Consistent error handling

## Usage

### Starting the Server:
```bash
cd server
node server.js
```

### API Examples:

#### Login:
```bash
POST /ws/node/api/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

#### Response:
```json
{
  "success": true,
  "sessionId": "abc123...",
  "message": "Successfully authenticated as username (Login State: 2)",
  "username": "username",
  "loginState": 2
}
```

#### Test Connection:
```bash
GET /ws/node/api/auth/test-connection
```

#### Response:
```json
{
  "success": true,
  "connected": true,
  "status": 200,
  "statusText": "OK",
  "url": "https://192.168.50.56"
}
```

## Frontend Usage

No changes required to existing frontend code. The LoginForm component will automatically use the new server proxy:

```typescript
import loytecAuthService from '../services/loytecAuth';

const result = await loytecAuthService.authenticate({ 
  username: 'user', 
  password: 'pass' 
});
```

## Loytec Device Deployment

1. Deploy the Node.js application to the Loytec device
2. Set environment variable `LOYTEC_BASE_URL` to the device's URL
3. Start the server: `node server.js`
4. Frontend will automatically connect to local server

## Session Management

- Sessions expire after 24 hours
- In-memory session store (suitable for single device deployment)
- Automatic cleanup of expired sessions
- Secure session ID generation

## Troubleshooting

### Common Issues:

1. **Connection Error**: Ensure LOYTEC_BASE_URL is correctly set
2. **Authentication Failed**: Verify Loytec device is accessible
3. **Session Expired**: User needs to login again

### Logs:
Server logs all authentication attempts and errors for debugging.

## Future Enhancements

For production deployments, consider:
- Persistent session storage (Redis/Database)
- Rate limiting for login attempts
- Enhanced logging and monitoring
- SSL/TLS configuration