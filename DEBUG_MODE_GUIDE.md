# Debug Mode Usage Guide

The BIM Viewer application now includes a comprehensive debug mode system that controls when debug messages are displayed in the console.

## How to Enable Debug Mode

Add the `debug` parameter to the URL when loading the application:

```
http://localhost:3000/?debug
```

Or if there are other parameters:

```
http://localhost:3000/?someParam=value&debug
```

## What Debug Mode Controls

When debug mode is **enabled** (`?debug` in URL):
- All debug messages are shown in the console
- Detailed camera movement information
- WebGL context and resource management logs
- Model loading and processing status
- User interaction feedback
- Performance and optimization messages
- Test file outputs

When debug mode is **disabled** (default):
- Only critical errors are shown
- Clean console output for production use
- Better performance (no debug overhead)

## Files Updated with Debug Mode Support

### Main Application Files
- `src/components/common/WorldViewer.tsx` - Main BIM viewer component
- `src/utils/debugLogger.ts` - Debug utility functions

### Test Files
- `test_camera_up_vector_fix.js`
- `test_orthographic_forward_backward.js`
- `test_mouse_wheel_zoom_fix.js`
- `test_model_flip_fix.js`
- `test_detailed_camera_debugging.js`
- `test_comprehensive_debugging.js`
- `src/test-loytec-auth.js`

## Debug Utility Functions

The debug system provides these functions:

```typescript
// TypeScript files (import from debugLogger.ts)
import { debugLog, debugWarn, debugError, isDebugMode } from '../utils/debugLogger';

debugLog('This only shows in debug mode');
debugWarn('Warning message in debug mode');
debugError('Error message (always shown, but with debug prefix in debug mode)');

if (isDebugMode()) {
  // Code that only runs in debug mode
}
```

```javascript
// JavaScript test files (inline utility)
const isDebugMode = () => typeof window !== 'undefined' && window.location?.search?.toLowerCase().includes('debug') || false;
const debugLog = (...args) => isDebugMode() && console.log(...args);

debugLog('This only shows in debug mode');
```

## Benefits

1. **Clean Production Logs**: Users see only essential information
2. **Developer Friendly**: Easy debugging with detailed information when needed
3. **Performance**: No debug overhead in production
4. **Consistent**: All debug messages controlled by a single parameter
5. **Flexible**: Works in both browser and Node.js environments

## Usage Examples

### For Development
```
http://localhost:3000/?debug
```
→ See all debug messages, camera movements, WebGL logs, etc.

### For Production/Demo
```
http://localhost:3000/
```
→ Clean console, only critical messages

### For Testing Specific Features
```
http://localhost:3000/?debug&cameraTest
```
→ Debug mode + any other test parameters you need