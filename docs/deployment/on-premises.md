# On-Premises Deployment Guide

Deploy the BIM Viewer on Loytec devices or local infrastructure.

## Overview

The BIM Viewer has been converted from Azure Functions to a standalone Node.js/Express server, making it suitable for on-premises deployment on Loytec devices or local infrastructure.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │ ←→ │  Node.js Server │ ←→ │  Loytec Device  │
│   (Frontend)    │    │   (Backend)     │    │     (Auth)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        ↑                       ↑                       ↑
    Static Files           API Endpoints           Authentication
  - React App            - /ws/node/api/*         - Login/Logout
  - BIM Viewer           - Data Points            - Session Mgmt
  - 3D Components        - IFC Streaming          - User Validation
```

## Prerequisites

### System Requirements
- **Node.js**: 18.x or later
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: 500MB for application, additional space for IFC files
- **Network**: Access to Loytec devices for authentication

### Network Configuration
- **Backend Port**: 8001 (configurable via `PORT` environment variable)
- **Frontend**: Served by backend server in production
- **Loytec Access**: HTTPS connection to Loytec devices

## Installation

### 1. Download and Extract
```bash
# Extract release package
unzip bim-viewer-release.zip
cd bim-viewer
```

### 2. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 3. Build Frontend
```bash
# Create production build
npm run build
```

### 4. Configure Environment
```bash
# Create production configuration
cp .env.example .env

# Edit configuration
nano .env
```

Required settings:
```bash
# .env
VITE_LOYTEC_BASE_URL=https://your-loytec-device.local
LOYTEC_BASE_URL=https://your-loytec-device.local
VITE_API_TIMEOUT=10000
NODE_ENV=production
PORT=8001
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_LOYTEC_BASE_URL` | Loytec device URL (frontend) | - | ✅ Yes |
| `LOYTEC_BASE_URL` | Loytec device URL (backend) | - | ✅ Yes |
| `PORT` | Server port | 8001 | No |
| `NODE_ENV` | Environment mode | development | No |
| `VITE_API_TIMEOUT` | API timeout (ms) | 10000 | No |

### Server Configuration

The server automatically serves:
- **Static Files**: Production React build at `/ws/node/bimviewer/`
- **API Endpoints**: Backend API at `/ws/node/api/*`
- **IFC Files**: Model files from `server/ifc-files/`

## Deployment Methods

### Method 1: Direct Node.js (Recommended)

```bash
# Start production server
npm run start

# Server will be available at:
# http://localhost:8001/ws/node/bimviewer/
```

### Method 2: PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start server/server.js --name bim-viewer

# Configure auto-startup
pm2 startup
pm2 save
```

### Method 3: Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy application
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 8001

# Start server
CMD ["npm", "run", "start"]
```

Build and run:
```bash
# Build image
docker build -t bim-viewer .

# Run container
docker run -d -p 8001:8001 \
  -e LOYTEC_BASE_URL=https://your-loytec-device.local \
  --name bim-viewer \
  bim-viewer
```

## Loytec Device Integration

### Network Setup
1. **Connect to Network**: Ensure server can reach Loytec devices
2. **HTTPS Access**: Configure proper HTTPS certificates
3. **Firewall Rules**: Allow traffic on configured ports

### Authentication Integration
```bash
# Test Loytec connection
curl -k https://your-loytec-device.local/webui/login

# Verify from server
node -e "
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });
https.get('https://your-loytec-device.local/webui/login', { agent }, (res) => {
  console.log('Status:', res.statusCode);
}).on('error', (err) => {
  console.error('Error:', err.message);
});
"
```

## Security Configuration

### Production Security

```bash
# .env for production
NODE_ENV=production
VITE_DEV_SKIP_AUTH=false  # Ensure auth is required
LOYTEC_BASE_URL=https://secure-loytec-device.local
```

### HTTPS Setup

For production deployment with HTTPS:

```javascript
// server/server.js modifications
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(8001, () => {
  console.log('HTTPS Server running on port 8001');
});
```

### Reverse Proxy Setup

Using nginx as reverse proxy:

```nginx
# /etc/nginx/sites-available/bim-viewer
server {
    listen 80;
    server_name your-server.local;

    location /ws/node/bimviewer/ {
        proxy_pass http://localhost:8001/ws/node/bimviewer/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/node/api/ {
        proxy_pass http://localhost:8001/ws/node/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check server status
curl http://localhost:8001/ws/node/api/auth/test-connection

# Check application
curl http://localhost:8001/ws/node/bimviewer/
```

### Log Management
```bash
# View server logs (if using PM2)
pm2 logs bim-viewer

# Rotate logs
pm2 install pm2-logrotate
```

### Updates
```bash
# Update application
git pull origin main
npm install
cd server && npm install
npm run build
pm2 restart bim-viewer
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 8001
netstat -tlnp | grep :8001
lsof -i :8001

# Kill process
kill -9 <process-id>
```

#### Cannot Connect to Loytec
1. **Network Connectivity**: `ping loytec-device.local`
2. **HTTPS Certificate**: Check certificate validity
3. **Firewall**: Verify firewall rules
4. **DNS Resolution**: Ensure hostname resolves

#### Frontend Not Loading
1. **Build Status**: Verify `npm run build` completed
2. **Static Files**: Check `dist/` directory exists
3. **Server Logs**: Check for serving errors
4. **Browser Cache**: Hard refresh (Ctrl+Shift+R)

### Debug Mode

Enable detailed logging:
```bash
# Debug environment
NODE_ENV=development npm run start

# Enable debug logs
DEBUG=* npm run start
```

## Performance Optimization

### Production Optimizations
1. **Gzip Compression**: Enabled by default
2. **Static Caching**: Configure appropriate headers
3. **Resource Minification**: Handled by Vite build
4. **Memory Management**: Monitor Node.js memory usage

### IFC File Management
```bash
# Store large IFC files efficiently
server/ifc-files/
├── bim.ifc           # Main model
├── cache/            # Generated cache files
└── thumbnails/       # Model previews
```

## Backup and Recovery

### Backup Strategy
```bash
# Backup application
tar -czf bim-viewer-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=dist \
  .

# Backup IFC files
tar -czf ifc-backup-$(date +%Y%m%d).tar.gz server/ifc-files/
```

### Recovery Process
```bash
# Restore application
tar -xzf bim-viewer-backup-YYYYMMDD.tar.gz

# Reinstall and rebuild
npm install
cd server && npm install
cd .. && npm run build

# Restart services
pm2 restart bim-viewer
```

This guide provides everything needed for successful on-premises deployment of the BIM Viewer.