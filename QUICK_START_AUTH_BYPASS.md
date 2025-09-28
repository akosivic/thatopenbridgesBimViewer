# Development Authentication Bypass - Quick Start Guide

## ✅ Authentication Bypass is Now ENABLED

The development authentication bypass has been enabled in your `.env` file. When you run the application in development mode, you will automatically bypass the login process.

## How It Works

1. **In Development Mode** (`npm run dev`):
   - Authentication is automatically bypassed
   - You'll see console warnings indicating bypass is active
   - Direct access to the application without login

2. **In Production Mode** (`npm run build` & `npm run preview`):
   - Authentication bypass is completely disabled
   - Normal login process is enforced
   - Secure production behavior

## Current Configuration

```env
VITE_DEV_SKIP_AUTH=true  # Enabled in .env
```

## Console Messages

When auth bypass is active, you'll see:
```
🚧 DEVELOPMENT MODE: Bypassing authentication for local development
⚠️  This bypass is automatically disabled in production builds
```

## To Disable Auth Bypass

If you want to test the full authentication flow in development, simply change:

```env
VITE_DEV_SKIP_AUTH=false
```

And restart the development server.

## Security Notes

- ✅ **Safe**: Only works in development mode
- ✅ **Automatic**: Disabled in production builds
- ✅ **Explicit**: Must be manually enabled via env var
- ✅ **Visible**: Clear console warnings when active

## Development Server

Your app is now running at: http://localhost:5173/ws/node/bimviewer/

The authentication will be automatically bypassed, and you'll be logged in as a development user with full permissions.