# Proxy Issue Fix - Development Setup Guide

## ✅ Issue Resolved

The proxy errors (`ECONNREFUSED`) occurred because the backend server wasn't running while the frontend was trying to proxy API requests to `http://localhost:8001`.

## 🚀 Solution

**Use the concurrent development script:**

```bash
npm run start:dev
```

This command starts both:
- **Backend Server** on port 8001 (handles API requests)  
- **Frontend Server** on port 5173/5174 (with proxy to backend)

## 📋 Available Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | ❌ Frontend only (causes proxy errors) |
| `npm run start:server` | Backend only |
| `npm run start:dev` | ✅ **Both servers** (recommended for development) |
| `npm run build` | Production build |
| `npm run start` | Production mode (build + serve) |

## 🔧 Current Configuration

### Backend Server (server/server.js)
- **Port**: 8001
- **API Endpoints**: `/ws/node/api/*`
- **Status**: ✅ Running

### Frontend Proxy (vite.config.ts)
- **Target**: `http://localhost:8001`
- **Proxied Paths**: `/ws/node/api/*`
- **Status**: ✅ Configured

## 🌐 Development URLs

- **Frontend**: http://localhost:5174/ws/node/bimviewer/
- **Backend API**: http://localhost:8001/ws/node/api/
- **Auth Bypass**: ✅ Enabled in development

## 🔍 API Endpoints Available

The backend server provides these endpoints:
- `POST /ws/node/api/auth/login`
- `GET /ws/node/api/GetDpsMapKeys` 
- `GET /ws/node/api/streamIfc`
- `GET /ws/node/api/getAllDataPointKeys`
- And more...

## 🛠️ Troubleshooting

If you still see proxy errors:

1. **Check if backend is running:**
   ```bash
   curl http://localhost:8001/ws/node/api/auth/test-connection
   ```

2. **Restart development servers:**
   ```bash
   # Stop current processes (Ctrl+C)
   npm run start:dev
   ```

3. **Check port availability:**
   ```bash
   netstat -an | findstr :8001
   ```

## 💡 Pro Tip

Always use `npm run start:dev` for development to avoid proxy issues. This ensures both frontend and backend are running together.