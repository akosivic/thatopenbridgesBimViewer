# Development Authentication Bypass

Skip authentication during local development while maintaining production security.

## Quick Enable

```bash
# Set in your .env file
VITE_DEV_SKIP_AUTH=true

# Restart development server
npm run start:dev
```

## How It Works

### Development Mode
- ✅ Automatic login as `dev-user`  
- ✅ Admin permissions granted
- ✅ No login form displayed
- ✅ Console warnings shown

### Production Mode
- 🔒 Bypass completely disabled
- 🔒 Normal authentication required
- 🔒 Environment variable ignored
- 🔒 Security enforced

## Console Messages

When bypass is active:
```
🚧 DEVELOPMENT MODE: Authentication bypass is ENABLED
⚠️  This bypass is automatically disabled in production builds
```

When bypass is disabled:
```
🔒 DEVELOPMENT MODE: Authentication bypass is DISABLED
```

## Security Features

| Feature | Development | Production |
|---------|-------------|------------|
| Auth bypass available | ✅ Yes | ❌ No |
| Environment check | ✅ Required | ❌ Ignored |
| Manual enable required | ✅ Yes | ❌ N/A |
| Console warnings | ✅ Yes | ❌ No |

## Configuration Options

### Enable Bypass
```bash
# .env
VITE_DEV_SKIP_AUTH=true
```

### Disable Bypass (Test Full Auth)
```bash
# .env
VITE_DEV_SKIP_AUTH=false
```

### Debug Mode
```bash
# .env  
VITE_DEBUG_AUTH=true
```

## Development User Profile

When bypass is enabled, you're automatically logged in as:

```javascript
{
  userId: 'dev-user',
  userRoles: ['authenticated', 'admin', 'developer'],
  identityProvider: 'development-bypass',
  userDetails: 'Development User (Auth Bypassed)'
}
```

## Troubleshooting

### Bypass Not Working

1. **Check Environment Variable**
   ```bash
   # Should be exactly 'true' (lowercase)
   VITE_DEV_SKIP_AUTH=true
   ```

2. **Verify Development Mode**
   ```bash
   # Use development command
   npm run start:dev
   # NOT production commands
   ```

3. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R
   - Clear local storage
   - Restart browser

4. **Check Console**
   - Look for bypass warning messages
   - Check for JavaScript errors

### Still Seeing Login Form

**Common Causes:**
- Environment variable is `false` or missing
- Running production build (`npm run build`)
- Browser cached old version
- JavaScript errors preventing bypass

**Solutions:**
1. Verify `.env` file contains `VITE_DEV_SKIP_AUTH=true`
2. Restart development server completely
3. Hard refresh browser (Ctrl+Shift+R)
4. Check browser console for errors

## Alternative Methods

### Command Line Override
```bash
# Windows PowerShell
$env:VITE_DEV_SKIP_AUTH="true"; npm run start:dev

# Windows CMD  
set VITE_DEV_SKIP_AUTH=true && npm run start:dev

# Linux/Mac
VITE_DEV_SKIP_AUTH=true npm run start:dev
```

### Development Environment File
Create `.env.development.local`:
```bash
# Development-specific settings
VITE_DEV_SKIP_AUTH=true
VITE_DEBUG_AUTH=true
```

This file is automatically loaded in development and ignored by git.

## When to Use

### ✅ Enable Bypass When:
- Developing new features
- Testing UI components
- Working on non-auth functionality
- Rapid prototyping
- API integration testing

### ❌ Disable Bypass When:
- Testing login flow
- Debugging authentication issues
- Testing session management
- Preparing for production
- Security testing

## Related Documentation

- [Environment Setup](environment-setup.md) - Complete development setup
- [Loytec Integration](../authentication/loytec-integration.md) - Full authentication system