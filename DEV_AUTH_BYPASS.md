# Development Authentication Bypass

This application includes a **secure** way to bypass authentication during local development while ensuring it's **automatically disabled in production**.

## 🔒 Security Features

- **Development-only**: Only works when `NODE_ENV` is `development` or when using `npm run dev`
- **Production-safe**: Automatically disabled in production builds (`npm run build`)
- **Explicit opt-in**: Must be manually enabled via environment variable
- **Clear logging**: Shows warnings when bypass is active

## 🚀 How to Use

### Option 1: Modify .env file (Temporary)
```bash
# In your .env file, change:
VITE_DEV_SKIP_AUTH=true

# Then restart your dev server:
npm run dev
```

### Option 2: Use development environment file (Recommended)
```bash
# Copy the development template:
cp .env.development.local .env

# Then restart your dev server:
npm run dev
```

### Option 3: Command line override
```bash
# Set environment variable for single session:
$env:VITE_DEV_SKIP_AUTH="true"; npm run dev
```

## 🛡️ Security Guarantees

### ✅ What's Secure:
- **Production builds ignore** the `VITE_DEV_SKIP_AUTH` variable completely
- **Only works in development mode** (`import.meta.env.DEV === true`)
- **Clear console warnings** when bypass is active
- **No network vulnerabilities** - purely client-side development aid

### ❌ What's Disabled in Production:
- All bypass logic is stripped from production builds
- Environment variables are not available in production
- Authentication is always enforced in deployed applications

## 📋 Console Messages

When bypass is **enabled** in development:
```
🚧 DEVELOPMENT MODE: Authentication bypass is ENABLED
🚧 DEVELOPMENT MODE: Bypassing authentication for local development
⚠️  This bypass is automatically disabled in production builds
```

When bypass is **disabled** in development:
```
🔒 DEVELOPMENT MODE: Authentication bypass is DISABLED
```

## 🔄 Switching Back to Authentication

Simply change in `.env`:
```bash
VITE_DEV_SKIP_AUTH=false
```

Or delete the line entirely, then restart your development server.

## 📁 File Structure

- `.env` - Main environment file (committed to git)
- `.env.development.local` - Development bypass template (ignored by git)
- Both files are safe to modify locally for development needs

Remember: **Production deployments will always require proper authentication regardless of these settings.**