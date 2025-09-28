# Bridges BIM Viewer

A modern web-based BIM viewer for bridge and building models with Loytec system integration.

## ✨ Key Features

- **3D Model Visualization**: View IFC models with advanced rendering
- **Loytec Integration**: Seamless authentication with Loytec devices  
- **Professional Navigation**: Perspective and orthographic viewing modes
- **Measurement Tools**: Distance, area, and volume measurements
- **Element Analysis**: Interactive property inspection and selection
- **On-Premises Ready**: Deploy on Loytec devices or local infrastructure

## 🚀 Quick Start

### Development Setup
```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Configure environment
cp .env.example .env
echo "VITE_DEV_SKIP_AUTH=true" >> .env

# Start both frontend and backend
npm run start:dev
```

### Production Deployment
```bash
# Build for production
npm run build

# Start production server  
npm run start
```

**Access the application**: http://localhost:8001/ws/node/bimviewer/

## 📁 Documentation

Complete documentation is available in the [`docs/`](docs/) folder:

- **🚀 [Getting Started](docs/README.md)** - Documentation index and overview
- **🔐 [Authentication](docs/authentication/)** - Loytec integration and security
- **🛠️ [Development](docs/development/)** - Local development setup and troubleshooting  
- **🏗️ [Deployment](docs/deployment/)** - On-premises deployment and security
- **✨ [Features](docs/features/)** - Camera controls and BIM viewer capabilities

## 🎯 Common Use Cases

### Skip Authentication in Development
```bash
# Enable auth bypass for faster development
VITE_DEV_SKIP_AUTH=true npm run start:dev
```

### Fix Proxy Errors
```bash
# Always use this command (not npm run dev)
npm run start:dev
```

### Deploy to Loytec Device
See [On-Premises Deployment Guide](docs/deployment/on-premises.md)

## 🔧 Available Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | 🚀 **Development** (frontend + backend) |
| `npm run dev` | Frontend only (may cause proxy errors) |
| `npm run build` | Production build |
| `npm run start` | Production server |

## 🏗️ Architecture

```
Frontend (React/Vite) ←→ Node.js Server ←→ Loytec Device
     ↓                      ↓                    ↓
  3D BIM Viewer         API Endpoints      Authentication
  ThatOpen Components   Data Integration   Session Management
```

## 🔍 Troubleshooting

### Proxy Connection Errors
**Problem**: `ECONNREFUSED` errors when loading  
**Solution**: Use `npm run start:dev` instead of `npm run dev`

### Authentication Issues  
**Development**: Enable bypass with `VITE_DEV_SKIP_AUTH=true`  
**Production**: Check Loytec device connectivity

### Model Loading Issues
**Check**: IFC file format and size  
**Solution**: See [BIM Viewer Documentation](docs/features/bim-viewer.md)

## 📞 Support

For detailed guides and troubleshooting:
1. Check the [Documentation](docs/) folder
2. Review specific feature guides  
3. Check browser console for error messages

## 🛡️ Security

- **Development**: Authentication bypass available (`VITE_DEV_SKIP_AUTH=true`)
- **Production**: Full Loytec authentication required
- **On-Premises**: Designed for secure deployment on Loytec devices

---

**Quick Links**: [Development Setup](docs/development/environment-setup.md) | [Loytec Integration](docs/authentication/loytec-integration.md) | [Deployment Guide](docs/deployment/on-premises.md)