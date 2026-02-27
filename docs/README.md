# Documentation Index

Welcome to the Bridges BIM Viewer documentation. This folder contains all technical documentation organized by category.

## 📁 Documentation Structure

### 🚀 [Getting Started](../README.md)
- Project overview and quick start guide
- Installation and setup instructions
- Basic usage examples

### 🔐 [Authentication](authentication/)
- [Loytec Integration Guide](authentication/loytec-integration.md) - Complete Loytec authentication setup
- [Development Auth Bypass](development/auth-bypass.md) - Skip authentication in development

### 🛠️ [Development](development/)
- [Development Environment](development/environment-setup.md) - Local development setup
- [Proxy Configuration](development/proxy-setup.md) - Fix common proxy issues
- [Authentication Bypass](development/auth-bypass.md) - Development authentication workflow

### 🏗️ [Deployment](deployment/)
- [On-Premises Setup](deployment/on-premises.md) - Deploy to Loytec devices
- [Security Configuration](deployment/security.md) - Production security settings

### ✨ [Features](features/)
- [Camera Controls](features/camera-controls.md) - Enhanced 3D navigation
- [BIM Model Viewer](features/bim-viewer.md) - Model loading and interaction

## 🔧 Quick Reference

### Development Commands
```bash
# Start both frontend and backend (recommended)
npm run start:dev

# Frontend only (may cause proxy errors)
npm run dev

# Backend only
npm run start:server

# Production build
npm run build
```

### Common Issues
- **Proxy Errors**: Use `npm run start:dev` instead of `npm run dev`
- **Authentication**: Enable bypass in development with `VITE_DEV_SKIP_AUTH=true`
- **Port Conflicts**: Backend uses 8001, frontend uses 5173/5174

## 📞 Support

For technical issues or questions, refer to the specific documentation sections above or check the troubleshooting guides in each category.