# Development Environment Setup

Complete guide for setting up and working with the BIM Viewer in development mode.

## Quick Start

### 1. Install Dependencies
```bash
npm install
cd server && npm install
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Enable development features
echo "VITE_DEV_SKIP_AUTH=true" >> .env
```

### 3. Start Development Servers
```bash
# Start both frontend and backend (recommended)
npm run start:dev
```

### 4. Access Application
- **Frontend**: http://localhost:5173/ws/node/bimviewer/
- **Backend API**: http://localhost:8001/ws/node/api/

## Development Commands

| Command | Purpose | Use Case |
|---------|---------|----------|
| `npm run start:dev` | ✅ Both servers | **Recommended for development** |
| `npm run dev` | Frontend only | ❌ Causes proxy errors |
| `npm run start:server` | Backend only | API testing |
| `npm run build` | Production build | Deployment prep |

## Environment Configuration

### Core Settings

```bash
# .env
VITE_LOYTEC_BASE_URL=https://192.168.50.69
VITE_API_TIMEOUT=10000
VITE_DEV_MODE=true
```

### Development Features

```bash
# Enable authentication bypass (development only)
VITE_DEV_SKIP_AUTH=true

# Enable debug logging
VITE_DEBUG_AUTH=true
```

## Port Configuration

| Service | Default Port | Purpose |
|---------|-------------|---------|
| Frontend (Vite) | 5173 | Development server |
| Backend (Node.js) | 8001 | API server |
| Alternative Frontend | 5174 | If 5173 is in use |

## Development Workflow

### Standard Development Flow

1. **Start Servers**: `npm run start:dev`
2. **Code Changes**: Edit source files
3. **Hot Reload**: Changes automatically reflected
4. **API Testing**: Backend API available at localhost:8001

### Working with Authentication

#### Skip Authentication (Recommended)
```bash
# Enable bypass in .env
VITE_DEV_SKIP_AUTH=true

# Restart servers
npm run start:dev
```

Benefits:
- ✅ No login required
- ✅ Automatic dev user login
- ✅ Full admin permissions
- ✅ Faster development cycle

#### Test Authentication Flow
```bash
# Disable bypass in .env
VITE_DEV_SKIP_AUTH=false

# Restart servers
npm run start:dev
```

Use for:
- 🔍 Testing login UI
- 🔍 Authentication error handling
- 🔍 Session management

## Troubleshooting

### Common Issues

#### 1. Proxy Errors (ECONNREFUSED)

**Symptoms:**
```
[vite] http proxy error: /ws/node/api/GetDpsMapKeys
AggregateError [ECONNREFUSED]
```

**Solution:**
```bash
# Use the combined command instead of npm run dev
npm run start:dev
```

**Why:** Frontend needs backend server running to proxy API requests.

#### 2. Port Already in Use

**Symptoms:**
```
Port 5173 is in use, trying another one...
```

**Solution:**
- Vite automatically finds next available port
- Check console for actual port (usually 5174)
- Or kill existing process: `netstat -ano | findstr :5173`

#### 3. Authentication Bypass Not Working

**Symptoms:**
- Login form still appears in development

**Checklist:**
```bash
# 1. Check environment variable
echo $VITE_DEV_SKIP_AUTH  # Should be 'true'

# 2. Verify development mode
npm run dev  # Should show Vite dev server

# 3. Check console warnings
# Should see: "🚧 DEVELOPMENT MODE: Authentication bypass is ENABLED"

# 4. Clear browser cache and restart
```

#### 4. API Endpoints Not Working

**Symptoms:**
- 404 errors on `/ws/node/api/*` endpoints

**Solution:**
1. Verify backend server is running (check terminal output)
2. Confirm backend is on port 8001
3. Test directly: http://localhost:8001/ws/node/api/auth/test-connection

### Debug Tools

#### Check Server Status
```bash
# Test backend connection
curl http://localhost:8001/ws/node/api/auth/test-connection

# Check if ports are in use
netstat -an | findstr ":8001"
netstat -an | findstr ":5173"
```

#### View Logs
```bash
# Frontend logs
# Check browser console for Vite logs

# Backend logs  
# Check terminal running npm run start:dev
```

#### Network Debugging
```bash
# Test proxy manually
curl -X POST http://localhost:5173/ws/node/api/auth/test-connection
```

## IDE Configuration

### VS Code Settings

Recommended `.vscode/settings.json`:
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Extensions

Recommended VS Code extensions:
- ES7+ React/Redux/React-Native snippets
- TypeScript Hero
- Prettier - Code formatter
- ESLint
- Auto Rename Tag

## Performance Tips

### Development Server Performance

1. **Use SSD**: Store project on SSD for faster builds
2. **Exclude node_modules**: Ensure antivirus excludes `node_modules`
3. **Close Unused Apps**: Free up system resources
4. **Use Latest Node.js**: Keep Node.js updated

### Hot Reload Optimization

```javascript
// vite.config.ts
export default defineConfig({
  server: {
    hmr: {
      overlay: false  // Disable error overlay if needed
    }
  }
});
```

## Security in Development

### Authentication Bypass Security

- ✅ **Development Only**: Automatically disabled in production
- ✅ **Explicit Opt-in**: Must set `VITE_DEV_SKIP_AUTH=true`
- ✅ **Clear Warnings**: Console shows when active
- ✅ **Build Safety**: Stripped from production builds

### TLS in Development

Development server disables TLS verification:
```javascript
// server/server.js
if (process.env.NODE_ENV !== 'production') {
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
}
```

This is normal and safe for local development.

## Next Steps

- **Production Deployment**: See [Deployment Guide](../deployment/on-premises.md)
- **Authentication Setup**: See [Loytec Integration](../authentication/loytec-integration.md)
- **Feature Development**: See [Features Documentation](../features/)