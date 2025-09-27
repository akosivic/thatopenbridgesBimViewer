# Loytec Authentication Integration

This document describes how the BIM Viewer has been updated to integrate with Loytec system authentication.

## Overview

The application now supports authentication through Loytec systems using their `/webui/login` endpoint. This allows users to leverage existing Loytec credentials to access the BIM Viewer application.

## Features

- **Configurable Loytec Server**: The Loytec server URL can be configured through environment variables
- **Session Management**: Proper session handling with validation and cleanup
- **User Interface**: Modern login form with connection testing and error handling
- **Remember Me**: Option to remember usernames for convenience
- **Logout Support**: Proper logout with session cleanup on both client and server
- **Multi-language Support**: Login interface available in English and Japanese

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Required: Loytec system base URL
VITE_LOYTEC_BASE_URL=http://192.168.50.56

# Optional: API timeout in milliseconds (default: 10000)
VITE_API_TIMEOUT=10000

# Optional: Development mode flag
VITE_DEV_MODE=true
```

### Deployment Configuration

For different deployment environments, you can:

1. **Development**: Use the `.env` file in the project root
2. **Production**: Set environment variables in your hosting environment
3. **Docker**: Pass environment variables through Docker compose or runtime

Example for different environments:

```bash
# Development
VITE_LOYTEC_BASE_URL=http://192.168.50.56

# Staging
VITE_LOYTEC_BASE_URL=http://staging-loytec.company.com

# Production
VITE_LOYTEC_BASE_URL=http://loytec.company.com
```

## Routing Structure

The application uses React Router to handle navigation and authentication:

### Routes

- **`/ws/node/bimviewer/`** - Login screen (shows login form if not authenticated, redirects to WorldViewer if authenticated)
- **`/ws/node/bimviewer/worldviewer`** - Protected BIM Viewer interface (requires authentication)

### Route Protection

- **Login Route**: Automatically redirects authenticated users to the WorldViewer
- **WorldViewer Route**: Automatically redirects unauthenticated users to the login screen
- **Session Validation**: Both routes check session validity on load

## How It Works

### Authentication Flow

1. **User Access**: User navigates to `/ws/node/bimviewer/` and sees the login screen
2. **Connection Test**: The form automatically tests connectivity to the configured Loytec server
3. **Credential Submission**: User enters username and password in the login form
4. **Loytec Authentication**: The system sends a GET request to `/webui/login` with:
   - Basic Authentication header
   - Custom `X-Create-Session: 1` header
5. **Session Storage**: On success, the session ID is stored locally
6. **Redirect**: User is redirected to the BIM Viewer interface at `/ws/node/bimviewer/worldviewer`
7. **Route Protection**: The WorldViewer route checks authentication and redirects to login if not authenticated

### API Integration

The authentication service (`src/services/loytecAuth.ts`) handles:

- **Connection Testing**: Validates connectivity to the Loytec server
- **Authentication**: Sends proper authentication requests with Basic Auth and X-Create-Session header
- **Response Parsing**: Processes the Loytec JSON response format
- **Session Validation**: Verifies active sessions using multiple cookie patterns
- **Error Handling**: Interprets Loytec-specific error responses
- **CSRF Token Management**: Extracts and stores CSRF tokens for subsequent requests
- **Logout**: Properly terminates sessions on both client and server

### Session Management

- Sessions are stored in `sessionStorage` for security
- Session validation occurs on app startup using Loytec's session validation
- Invalid sessions are automatically cleared
- Logout properly cleans up both local and server sessions
- CSRF tokens are stored separately and available for authenticated requests
- Username is extracted from Loytec's `sessUser` field for accuracy
- Multiple session cookie formats are supported (sessionid, JSESSIONID, etc.)

## File Structure

### New Components

- `src/components/LoginForm.tsx` - Main login interface
- `src/components/UserMenu.tsx` - User menu with logout functionality
- `src/services/loytecAuth.ts` - Loytec authentication service
- `src/types/auth.ts` - TypeScript interfaces for authentication
- `src/config/appConfig.ts` - Configuration management

### Modified Components

- `src/components/common/authentication.tsx` - Updated to use Loytec authentication
- `src/components/LoginButtonComponent.tsx` - Updated to use new login form
- `src/components/HeaderComponent.tsx` - Added user menu for authenticated users
- `src/i18n.ts` - Added authentication-related translations

## Security Features

- **Session Validation**: Sessions are validated with the Loytec server
- **Automatic Cleanup**: Invalid sessions are automatically removed
- **Secure Storage**: Sessions use `sessionStorage` (cleared when browser closes)
- **Connection Testing**: Validates server connectivity before authentication
- **Error Handling**: Comprehensive error handling and user feedback

## Usage

### For End Users

1. Navigate to `/ws/node/bimviewer/` in your browser
2. The login screen will automatically appear
3. Wait for connection verification (green = success, red = connection issues)
4. Enter your Loytec username and password
5. Optionally check "Remember Me" to save your username
6. Click "Login" to authenticate
7. You'll be automatically redirected to the BIM Viewer interface

### For Developers

To customize the authentication:

1. **Change Server URL**: Update `VITE_LOYTEC_BASE_URL` in `.env`
2. **Modify Timeout**: Adjust `VITE_API_TIMEOUT` if needed
3. **Customize UI**: Edit `src/components/LoginForm.tsx`
4. **Add Features**: Extend `src/services/loytecAuth.ts`

## Troubleshooting

### Common Issues

1. **Connection Failed**: 
   - Verify the Loytec server URL is correct
   - Check network connectivity
   - Ensure the Loytec server is accessible from your network

2. **Login Failed**:
   - Verify username and password are correct
   - Check if the account is active in the Loytec system
   - Review browser console for detailed error messages

3. **Session Issues**:
   - Clear browser storage (sessionStorage and localStorage)
   - Refresh the page
   - Try logging out and back in

### Debug Mode

To enable additional debugging:

1. Set `VITE_DEV_MODE=true` in your `.env` file
2. Open browser developer tools
3. Check the console for detailed authentication logs

## Migration Notes

This update replaces the previous local authentication system. Key changes:

- Authentication now requires a valid Loytec server
- User sessions are managed through Loytec's session system
- Local user profiles are replaced with Loytec user information

## Enhanced Response Handling

Based on the Loytec response format you provided, the authentication system now includes:

### Response Validation

The system validates the Loytec response structure and checks multiple authentication indicators:

- `loggedIn`: Primary boolean indicator of authentication success
- `loginState`: Numeric state (1 = successful, other values = failed states)
- `authFail`: Array containing specific failure reasons if authentication fails
- `sessUser`: The actual authenticated username from the Loytec system

### Error Handling

The enhanced error handling provides specific feedback based on Loytec's response:

- **Authentication failures**: Shows specific failure reasons from `authFail` array
- **Login state errors**: Reports non-successful login states with codes
- **Connection issues**: Distinguishes between network and authentication problems
- **Invalid responses**: Validates response structure before processing

### Session Information

The system extracts and manages comprehensive session data:

- **Session ID**: Extracted from multiple cookie formats (sessionid, JSESSIONID, etc.)
- **CSRF Token**: Automatically extracted and stored for authenticated requests
- **User Identity**: Uses `sessUser` from Loytec for accurate username display
- **Fallback Sessions**: Generates fallback session IDs when cookies aren't available

### Future API Usage

The service provides a helper method for making authenticated requests:

```javascript
// Example: Making an authenticated request to Loytec
const response = await loytecAuthService.makeAuthenticatedRequest('/api/some-endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

## Future Enhancements

Potential improvements for future versions:

- **Multiple Auth Providers**: Support for additional authentication systems
- **Role-Based Access**: Integration with Loytec user roles and permissions using `selectOptions`
- **Single Sign-On**: Enhanced SSO capabilities with token refresh
- **Advanced Session Management**: Automatic session refresh using CSRF tokens
- **User Preferences**: Store and sync user preferences with Loytec system
- **Audit Logging**: Track authentication events and user activities

## Testing

A test script is available to verify the authentication setup:

```bash
# Test authentication connectivity
node src/test-loytec-auth.js
```

Or in the browser console:
```javascript
// Test the authentication system
window.testLoytecAuth();
```

## API Reference

### Loytec Authentication Endpoint

```
GET /webui/login
Authorization: Basic <base64(username:password)>
X-Create-Session: 1
```

**Response**: JSON object with authentication result and session information.

**Sample Response:**
```json
{
  "loginState": 1,
  "pwdMaxLen": 64,
  "authFail": [],
  "selectOptions": ["admin"],
  "hiddenInput": {},
  "sessUser": "admin",
  "loggedIn": true,
  "csrfToken": "061yKyN9Ky9zVbvVbMv+LvWFCgIkGCM8POGAO6UWZYg="
}
```

**Response Fields:**
- `loginState`: Authentication state (1 = successful, other values = failed)
- `loggedIn`: Boolean indicating if authentication was successful
- `sessUser`: The actual username from the Loytec system
- `authFail`: Array of authentication failure reasons (empty if successful)
- `csrfToken`: CSRF token for subsequent requests
- `pwdMaxLen`: Maximum password length allowed
- `selectOptions`: Available user options
- `hiddenInput`: Additional hidden form data

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_LOYTEC_BASE_URL` | Yes | - | Base URL of the Loytec server |
| `VITE_API_TIMEOUT` | No | 10000 | API timeout in milliseconds |
| `VITE_DEV_MODE` | No | false | Enable development mode |