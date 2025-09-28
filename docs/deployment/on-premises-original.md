# Bridges BIM Viewer - On-Premises Version

This is the on-premises version of the Bridges BIM Viewer that has been converted from Azure Functions to a standalone Node.js/Express server.

## Changes Made

### ✅ Completed Changes

1. **Converted from Azure Functions to Express.js Server**
   - Replaced Azure Functions with a standard Express.js server
   - All API endpoints (`getDataPoint`, `getAllDataPointKeys`, `getAllDatapoints`, `GetDpsMapKeys`) now work locally
   - Server runs on port 3000 by default

2. **Removed Authentication Dependencies**
   - Removed Azure Active Directory authentication
   - Updated authentication system to work without Azure
   - All routes are now publicly accessible

3. **Updated API Integration**
   - Switched from `dpsValuesApi` to `dataPointMapApi` as requested
   - Updated frontend to call local API endpoints
   - Configured Vite proxy for development

4. **Removed Azure Dependencies**
   - Removed `@azure/functions` package
   - Removed `azure-functions-core-tools`
   - Updated package.json to remove Azure-specific dependencies

## Architecture

```
Frontend (React/Vite) ←→ Express.js Server ←→ In-Memory Data Store
Port 5173 (dev)          Port 3000           (dataPointMap)
```

## Installation & Setup

1. **Install Dependencies**
   ```powershell
   # Install main project dependencies
   npm install
   
   # Install server dependencies
   cd server
   npm install
   cd ..
   ```

2. **Development Mode**
   ```powershell
   # Start both server and frontend
   npm run start:dev
   ```
   This will start:
   - Express server on http://localhost:3000
   - Vite dev server on http://localhost:5173

3. **Production Mode**
   ```powershell
   # Build and start production server
   npm run start
   ```

## API Endpoints

The server provides the following API endpoints:

- `GET /ws/node/api/getDataPoint?key={key}` - Get data point by key
- `GET /ws/node/api/getAllDataPointKeys` - Get all available keys
- `GET /ws/node/api/getAllDatapoints` - Get all data points
- `GET /ws/node/api/GetDpsMapKeys` - Get all data points (legacy endpoint)
- `GET /ws/node/api/streamIfc?blobName={filename}` - Stream IFC files (default: bim.ifc)

## IFC File Support

The server includes support for streaming IFC files:

- IFC files are stored in `server/ifc-files/` directory
- Default file: `bim.ifc` (a simple test bridge model)
- The frontend can load IFC files using the "Test IFC" button
- Supports custom IFC files by placing them in the `ifc-files` directory

## Data Structure

The server uses an in-memory data store with the following structure:

```javascript
const dataPointMap = {
  "M1": [
    { "727413": "Favorites.Light.Lounge.01.ST" },
    { "727441": "Favorites.Light.Lounge.02.ST" },
    // ... more entries
  ],
  "M2": [
    // ... entries for M2
  ],
  // ... more keys
};
```

## File Structure

```
├── server/
│   ├── package.json          # Server dependencies
│   ├── server.js             # Express.js server
│   └── ifc-files/            # IFC model files
│       └── bim.ifc           # Default test bridge model
├── src/                      # Frontend React app
├── api/                      # Legacy Azure Functions (disabled)
├── package.json              # Main project dependencies
├── vite.config.ts           # Vite configuration with proxy
└── README-OnPremises.md     # This file
```

## Key Files Modified

1. **Authentication System**
   - `src/components/common/authentication.tsx` - Removed Azure AD auth
   - `src/components/common/AuthGuard.tsx` - Updated for local auth

2. **API Integration**
   - `src/components/common/components/Panels/ProjectInformation.ts` - Updated API calls
   - `vite.config.ts` - Added proxy configuration

3. **Server Configuration**
   - `server/server.js` - New Express.js server
   - `server/package.json` - Server dependencies

4. **Build Configuration**
   - `package.json` - Updated scripts and removed Azure dependencies

## Testing

1. **Test API Directly**
   ```
   http://localhost:3000/api/GetDpsMapKeys
   http://localhost:3000/api/getDataPoint?key=M1
   ```

2. **Test Through Frontend Proxy**
   ```
   http://localhost:5173/api/GetDpsMapKeys
   http://localhost:5173/api/getDataPoint?key=M1
   ```

3. **Test Full Application**
   ```
   http://localhost:5173
   ```

## Security Considerations

- The application now runs without authentication
- All API endpoints are publicly accessible
- Consider adding authentication middleware if needed for production
- The server includes basic security headers via Helmet.js

## Future Enhancements

If you need to add authentication back:

1. **Simple Authentication**
   - Add middleware to check API keys or tokens
   - Implement session-based authentication

2. **Database Integration**
   - Replace in-memory data store with database
   - Add persistent storage for data points

3. **Configuration**
   - Add environment variables for configuration
   - Make API endpoints configurable

## Troubleshooting

1. **Port Conflicts**
   - Change ports in `server/server.js` (default: 3000)
   - Update proxy in `vite.config.ts` if server port changes

2. **API Connection Issues**
   - Check if server is running on port 3000
   - Verify proxy configuration in `vite.config.ts`
   - Check browser network tab for CORS issues

3. **Build Issues**
   - Clear node_modules and reinstall dependencies
   - Check for TypeScript errors: `npm run lint`
