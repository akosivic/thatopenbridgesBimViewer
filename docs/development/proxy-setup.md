# Proxy Configuration & Troubleshooting

Fix common proxy issues and understand the development server setup.

## Overview

The BIM Viewer uses Vite's proxy feature to forward API requests from the frontend to the Node.js backend server during development.

```
Frontend (5173) → Vite Proxy → Backend (8001)
     ↓                           ↓
Browser Request              API Response
/ws/node/api/*    →    localhost:8001/ws/node/api/*
```

## Quick Fix for Proxy Errors

### ❌ Problem: ECONNREFUSED Errors
```
[vite] http proxy error: /ws/node/api/GetDpsMapKeys
AggregateError [ECONNREFUSED]
```

### ✅ Solution: Start Both Servers
```bash
# Instead of this (frontend only):
npm run dev

# Use this (frontend + backend):
npm run start:dev
```

## Proxy Configuration

### Current Setup (`vite.config.ts`)
```typescript
server: {
  proxy: {
    '/ws/node/api': {
      target: 'http://localhost:8001',
      changeOrigin: true,
      secure: false,
      configure: (proxy) => {
        proxy.on('error', (err) => {
          console.error('⚠️ Proxy error - backend server not running');
        });
      },
    },
  }
}
```

### How It Works
1. **Frontend Request**: Browser requests `/ws/node/api/something`
2. **Vite Intercepts**: Vite dev server catches the request
3. **Proxy Forward**: Request forwarded to `http://localhost:8001/ws/node/api/something`
4. **Backend Response**: Node.js server responds
5. **Return to Frontend**: Response sent back to browser

## Server Configuration

### Backend Server (`server/server.js`)
```javascript
const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Available Endpoints
```
POST /ws/node/api/auth/login
POST /ws/node/api/auth/validate  
POST /ws/node/api/auth/logout
GET  /ws/node/api/auth/test-connection
GET  /ws/node/api/GetDpsMapKeys
GET  /ws/node/api/streamIfc
GET  /ws/node/api/getAllDataPointKeys
```

## Development Commands

| Command | Frontend | Backend | Use Case |
|---------|----------|---------|----------|
| `npm run start:dev` | ✅ Port 5173 | ✅ Port 8001 | **Recommended** |
| `npm run dev` | ✅ Port 5173 | ❌ Not running | ❌ Causes proxy errors |
| `npm run start:server` | ❌ Not running | ✅ Port 8001 | API testing only |

## Troubleshooting Guide

### 1. ECONNREFUSED Errors

**Symptoms:**
```
7:18:57 PM [vite] http proxy error: /ws/node/api/GetDpsMapKeys
AggregateError [ECONNREFUSED]
```

**Root Cause:** Backend server not running on port 8001

**Solutions:**
```bash
# Option 1: Start both servers (recommended)
npm run start:dev

# Option 2: Start backend separately
# Terminal 1:
npm run start:server
# Terminal 2:  
npm run dev
```

### 2. Port Already in Use

**Symptoms:**
```
Port 8001 is already in use
```

**Find Process:**
```bash
# Windows
netstat -ano | findstr :8001

# Kill process (replace PID)
taskkill /PID <process-id> /F
```

**Alternative:** Use different port
```bash
# Set custom port
PORT=8002 npm run start:server
```

### 3. Wrong Target URL

**Symptoms:**
- Proxy connects but gets wrong responses
- API endpoints return HTML instead of JSON

**Check Configuration:**
```typescript
// vite.config.ts
proxy: {
  '/ws/node/api': {
    target: 'http://localhost:8001',  // ← Verify this port
    changeOrigin: true,
    secure: false,
  }
}
```

### 4. CORS Issues

**Symptoms:**
```
Access to fetch at 'http://localhost:8001/...' blocked by CORS policy
```

**Solution:** The proxy handles CORS. If you see CORS errors:
1. Ensure you're using the proxy (requests to relative URLs)
2. Backend CORS is configured in `server.js`

```javascript
// server/server.js
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
```

## Testing Proxy Setup

### 1. Check Backend Direct Access
```bash
# Test backend directly
curl http://localhost:8001/ws/node/api/auth/test-connection
```

### 2. Check Frontend Proxy
```bash
# Test through proxy
curl http://localhost:5173/ws/node/api/auth/test-connection
```

### 3. Browser Developer Tools
1. Open Network tab
2. Make API request from frontend
3. Check if request goes to `localhost:5173` (proxied) or `localhost:8001` (direct)

## Advanced Configuration

### Custom Proxy Settings

```typescript
// vite.config.ts
server: {
  proxy: {
    '/ws/node/api': {
      target: 'http://localhost:8001',
      changeOrigin: true,
      secure: false,
      // Custom headers
      headers: {
        'X-Forwarded-Proto': 'http'
      },
      // Request transformation
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq, req, res) => {
          console.log('Proxying:', req.method, req.url);
        });
      }
    }
  }
}
```

### Multiple Proxy Targets

```typescript
server: {
  proxy: {
    '/ws/node/api': {
      target: 'http://localhost:8001',
      changeOrigin: true,
    },
    '/ws/node/static': {
      target: 'http://localhost:8002',
      changeOrigin: true,
    }
  }
}
```

## Production vs Development

### Development
- ✅ Vite proxy handles API requests
- ✅ Hot module replacement works
- ✅ CORS handled automatically

### Production
- ❌ No Vite proxy
- ✅ Static files served by backend
- ✅ Same origin requests (no CORS issues)

## Performance Tips

### Reduce Proxy Logs
```typescript
configure: (proxy) => {
  // Remove verbose logging in development
  proxy.on('proxyReq', () => {}); // Empty handler
}
```

### Handle Slow APIs
```typescript
proxy: {
  '/ws/node/api': {
    target: 'http://localhost:8001',
    timeout: 30000,  // 30 second timeout
    changeOrigin: true,
  }
}
```

## Common Patterns

### API Request in Frontend
```typescript
// ✅ Good: Use relative URLs (will be proxied)
const response = await fetch('/ws/node/api/auth/login', {
  method: 'POST',
  body: JSON.stringify(credentials)
});

// ❌ Bad: Direct backend URLs (bypass proxy)
const response = await fetch('http://localhost:8001/ws/node/api/auth/login');
```

### Environment-based Proxy
```typescript
// vite.config.ts
const target = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8001'
  : 'https://production-api.com';

export default defineConfig({
  server: {
    proxy: {
      '/ws/node/api': { target }
    }
  }
});
```

This proxy setup ensures smooth development while maintaining production compatibility.