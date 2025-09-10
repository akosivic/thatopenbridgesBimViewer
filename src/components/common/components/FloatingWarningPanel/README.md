# Floating Warning Panel System

This system provides customizable floating warning icons positioned within the 3D BIM model space. The icons show environmental data (temperature, humidity) and can be configured through a user-friendly interface.

## Features

- **3D-positioned warning icons**: Icons are positioned within the 3D model space but rendered as HTML overlays
- **Customizable position**: Drag and drop in configuration mode or set precise coordinates
- **Editable content**: Modify title, temperature, and humidity values
- **Persistent configuration**: Settings are saved to localStorage (cross-platform compatible)
- **Configuration mode**: Toggle mode to show/hide configuration controls
- **Responsive design**: Adapts to different screen sizes
- **Dark mode support**: Automatically adapts to system preferences

## File Structure

```
src/components/common/components/FloatingWarningPanel/
├── FloatingWarningPanel.ts      # Main class implementation
├── FloatingWarningPanel.css     # Styles and animations
├── index.ts                     # Module exports
```

```
src/components/common/components/Toolbars/Sections/
├── WarningControls.ts           # Toolbar controls for warning panels
```

## Usage

### Basic Usage

The warning panel system is automatically initialized when the WorldViewer loads:

```typescript
// Initialization happens automatically in WorldViewer.tsx
const warningPanel = new FloatingWarningPanel(container, camera);
```

### Sample Configuration Auto-Loading

**✅ NEW: Automatic Sample Loading**
- On first run (when no configuration exists), the system automatically loads 6 sample warning panels
- Includes realistic data for: HVAC Zone, Server Room, Conference Room, Laboratory, Storage Area, and Emergency Exit
- Each sample has different positions, temperatures, and humidity values

### Reset to Sample Configuration

Use the toolbar to reset your configuration:
1. Go to the "Warnings" tab in the toolbar
2. Click the refresh (🔄) button "Load Sample Configuration"
3. Your current warnings will be replaced with the 6 sample panels
4. Perfect for testing or starting fresh with example data

### Configuration Mode

1. Click the settings (⚙️) button in the toolbar's "Warnings" tab
2. This enables configuration mode where you can:
   - Drag warning icons to reposition them
   - See configuration controls on each panel
   - Add new warning panels
   - Remove existing panels

### Adding New Warnings

Click the plus (+) button in the toolbar to add a new warning panel at the default position.

### Editing Warnings

1. Enable configuration mode
2. Click the ⚙️ button on any warning panel
3. Edit the title, temperature, humidity, and 3D position
4. Click "Save" to apply changes

## Configuration File Format

The system uses localStorage with the key `warning-config.json`. The data structure is:

```json
{
  "version": "1.0.0",
  "warnings": [
    {
      "id": "warning-1",
      "position": {
        "x": -5.0,
        "y": 2.0,
        "z": 0.0
      },
      "title": "Zone",
      "temperature": "XX.X°C",
      "humidity": "XX%",
      "isVisible": true,
      "isConfigMode": false
    }
  ]
}
```

## Platform Compatibility

### Storage Solution

The system uses **localStorage** instead of file system operations, making it compatible with:
- ✅ Windows (all versions)
- ✅ Linux (all distributions)
- ✅ macOS
- ✅ Web browsers
- ✅ Electron applications

### Alternative File-based Solution (if needed)

If you need file-based storage, you can modify the `loadConfiguration()` and `saveConfiguration()` methods to use:

**For Node.js environments:**
```typescript
import * as fs from 'fs';
import * as path from 'path';

// Save to JSON file
fs.writeFileSync('warning-config.json', JSON.stringify(data, null, 2));

// Load from JSON file  
const data = JSON.parse(fs.readFileSync('warning-config.json', 'utf8'));
```

**For cross-platform config directory:**
```typescript
// Windows: %APPDATA%/YourApp/warning-config.json
// Linux: ~/.config/YourApp/warning-config.json
// macOS: ~/Library/Application Support/YourApp/warning-config.json
```

## API Reference

### FloatingWarningPanel Class

#### Constructor
```typescript
constructor(container: HTMLElement, camera: THREE.Camera)
```

#### Methods

- `toggleConfigMode()`: Enable/disable configuration mode
- `addWarning(position?: THREE.Vector3)`: Add new warning panel
- `removeWarning(id: string)`: Remove warning panel
- `getWarnings()`: Get all warning configurations
- `loadSampleConfiguration()`: Load 6 sample warning panels
- `resetToSampleConfiguration()`: Reset to sample config and refresh UI
- `destroy()`: Clean up all warning panels

#### Events

The system automatically handles:
- Camera movement and view updates
- Window resize events
- Configuration persistence

## Styling

The system includes comprehensive CSS with:
- Smooth animations and transitions
- Hover effects
- Responsive design breakpoints
- Dark mode support
- Custom styling for configuration dialogs

### Customizing Appearance

Edit `FloatingWarningPanel.css` to modify:
- Colors and themes
- Icon sizes and shapes
- Animation speeds
- Typography
- Mobile responsiveness

## Development Notes

### 3D to 2D Projection

The system uses Three.js's built-in projection to convert 3D world coordinates to 2D screen coordinates:

```typescript
const vector = warning.position.clone();
vector.project(camera);

// Convert normalized coordinates to pixels
const x = (vector.x * 0.5 + 0.5) * containerWidth;
const y = (-vector.y * 0.5 + 0.5) * containerHeight;
```

### Performance Considerations

- Updates run at 60fps using `requestAnimationFrame`
- Only visible warnings are processed
- Minimal DOM manipulation
- Efficient event handling with event delegation

### Browser Compatibility

- Modern browsers (Chrome 80+, Firefox 75+, Safari 13+)
- ES2020+ features used
- Three.js r140+ required
- LocalStorage support required

## Troubleshooting

### Common Issues

1. **Icons not appearing**: Check that the container element exists and has proper dimensions
2. **Position not saving**: Verify localStorage is enabled and has sufficient space
3. **Performance issues**: Reduce the number of warning panels or check for console errors
4. **Styling issues**: Ensure CSS is properly imported and no conflicting styles exist

### Debug Mode

Enable debug mode by adding `?debug` to the URL. This will show additional console logging for:
- Warning panel initialization
- Configuration loading/saving
- Position updates
- Event handling
