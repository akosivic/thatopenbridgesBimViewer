# Camera Controls & 3D Navigation

Enhanced camera system with projection-aware controls and intuitive navigation.

## Overview

The BIM Viewer features an advanced camera control system that adapts to different viewing modes and provides intuitive navigation for both casual users and professionals.

## Key Features

- **Dual Projection Modes**: Perspective and Orthographic viewing
- **Adaptive Controls**: Mode-specific keyboard and mouse bindings
- **Always-Accessible Settings**: Camera controls available in all modes
- **Professional Navigation**: CAD-style controls for technical users
- **User-Friendly Interface**: English default with clear visual feedback

## Projection Modes

### 🎯 Perspective Mode
- **Description**: Standard 3D view with realistic depth perception
- **Best For**: General exploration, presentations, conceptual viewing
- **Characteristics**: 
  - Objects appear smaller when distant
  - Natural depth perception
  - Ideal for architectural visualization

### 📐 Orthographic Mode  
- **Description**: Parallel projection without perspective distortion
- **Best For**: Technical drawings, measurements, precise analysis
- **Characteristics**:
  - Objects maintain consistent size regardless of distance
  - No perspective distortion
  - CAD-style technical viewing

## Camera Controls Interface

### Location & Access
- **Primary**: Bottom toolbar → "Camera Settings" tab
- **Visibility**: Always available (debug and production modes)
- **Toggle**: Click projection mode buttons to switch

### Visual Indicators
```
[Perspective] [Orthographic]    ← Mode Selection
     ●              ○           ← Active mode indicator
```

## Navigation Controls

### Universal Controls (All Modes)

| Action | Mouse | Keyboard | Description |
|--------|--------|-----------|-------------|
| **Orbit** | Left Drag | Arrow Keys | Rotate around model |
| **Pan** | Middle Drag | Shift + Arrows | Move view laterally |
| **Zoom** | Scroll | +/- | Zoom in/out |
| **Reset** | - | Home | Reset to default view |

### Perspective Mode Controls

| Action | Input | Description |
|--------|--------|-------------|
| **Smooth Orbit** | Left Mouse + Drag | Cinematic rotation around focal point |
| **Fly Navigation** | WASD + Mouse | FPS-style navigation |
| **Zoom to Cursor** | Scroll Wheel | Zoom toward mouse position |
| **Fast Pan** | Shift + Middle Drag | Quick lateral movement |

```typescript
// Perspective controls example
const perspectiveControls = {
  orbitSpeed: 1.0,
  zoomSpeed: 0.8,
  panSpeed: 1.2,
  enableDamping: true,
  dampingFactor: 0.1
};
```

### Orthographic Mode Controls

| Action | Input | Description |
|--------|--------|-------------|
| **Technical Pan** | Middle Mouse + Drag | Precise CAD-style panning |
| **Uniform Zoom** | Scroll Wheel | Consistent zoom without distortion |
| **Snap Orbit** | Left Mouse + Drag | Discrete rotation increments |
| **Measure Mode** | M Key | Enable measurement tools |

```typescript
// Orthographic controls example
const orthographicControls = {
  orbitSpeed: 0.7,
  zoomSpeed: 1.0,
  panSpeed: 1.0,
  snapToGrid: true,
  snapAngle: 15 // degrees
};
```

## Advanced Features

### Camera Presets

| Preset | Shortcut | Description |
|--------|----------|-------------|
| **Front View** | Numpad 1 | View from front elevation |
| **Right View** | Numpad 3 | View from right elevation |
| **Top View** | Numpad 7 | View from above (plan view) |
| **Isometric** | Numpad 0 | 3D isometric angle |

### View States

The camera system automatically saves and restores:
- **Last Position**: Resume previous viewing angle
- **Projection Mode**: Remember perspective/orthographic preference
- **Zoom Level**: Maintain appropriate scale
- **Focus Point**: Preserve area of interest

## User Experience Enhancements

### Language & Localization
- **Default Language**: English (changed from Japanese)
- **Multilingual Support**: Available for international teams
- **Context-Sensitive Help**: Mode-specific guidance

### Visual Feedback
- **Mode Indicators**: Clear visual state of current projection
- **Control Hints**: On-screen guidance for new users
- **Smooth Transitions**: Animated mode switching
- **Status Display**: Current camera position and orientation

## Implementation Details

### Camera Configuration

```typescript
// Camera system configuration
interface CameraConfig {
  // Projection settings
  projectionMode: 'perspective' | 'orthographic';
  
  // Perspective settings
  fov: number;              // Field of view (degrees)
  near: number;             // Near clipping plane
  far: number;              // Far clipping plane
  
  // Orthographic settings
  left: number;             // Left boundary
  right: number;            // Right boundary
  top: number;              // Top boundary
  bottom: number;           // Bottom boundary
  
  // Control settings
  enableOrbit: boolean;
  enablePan: boolean;
  enableZoom: boolean;
  enableDamping: boolean;
}
```

### Event Handling

```typescript
// Mode-specific event handlers
const handleProjectionChange = (mode: 'perspective' | 'orthographic') => {
  // Update camera projection
  camera.updateProjection(mode);
  
  // Switch control scheme
  controls.updateForMode(mode);
  
  // Save user preference
  localStorage.setItem('camera_projection', mode);
  
  // Update UI indicators
  updateProjectionIndicators(mode);
};
```

## Performance Optimization

### Rendering Efficiency
- **Frustum Culling**: Only render visible objects
- **LOD System**: Level-of-detail for distant objects
- **Adaptive Quality**: Adjust rendering quality based on movement

### Control Responsiveness
- **Input Debouncing**: Smooth control response
- **Frame Rate Adaptation**: Adjust update rates for performance
- **Gesture Recognition**: Optimize for touch devices

## Troubleshooting

### Common Issues

#### Controls Not Responding
- **Check**: Ensure camera system is initialized
- **Solution**: Refresh page or reset camera position
- **Debug**: Open browser console for error messages

#### Projection Mode Stuck
- **Symptoms**: Unable to switch between perspective/orthographic
- **Solution**: Clear browser cache and localStorage
- **Prevention**: Regular browser updates

#### Performance Issues
- **Symptoms**: Laggy camera movement
- **Causes**: Large models, multiple viewports, insufficient GPU
- **Solutions**:
  - Reduce model complexity
  - Close other browser tabs
  - Lower rendering quality settings

### Debug Information

Access camera debug info:
```typescript
// Console commands for debugging
console.log('Camera position:', camera.position);
console.log('Camera rotation:', camera.rotation);
console.log('Projection mode:', camera.projection);
console.log('Control state:', controls.getState());
```

## Customization

### User Preferences

```typescript
// Customizable camera settings
interface UserCameraPreferences {
  defaultProjection: 'perspective' | 'orthographic';
  orbitSpeed: number;
  panSpeed: number;
  zoomSpeed: number;
  invertControls: boolean;
  snapToAngles: boolean;
  showGrid: boolean;
}
```

### Developer Options

For advanced users and developers:
- **Custom Control Schemes**: Define new navigation patterns
- **Scripted Cameras**: Automated camera movements
- **Multi-Viewport**: Split-screen viewing modes
- **VR Integration**: Virtual reality camera controls

## API Reference

### Camera Methods

```typescript
// Main camera control methods
interface CameraController {
  setProjection(mode: 'perspective' | 'orthographic'): void;
  setPosition(x: number, y: number, z: number): void;
  lookAt(x: number, y: number, z: number): void;
  fitToModel(model: Object3D): void;
  saveState(): CameraState;
  restoreState(state: CameraState): void;
  resetToDefault(): void;
}
```

### Events

```typescript
// Camera-related events
interface CameraEvents {
  'projection-changed': (mode: string) => void;
  'position-changed': (position: Vector3) => void;
  'view-reset': () => void;
  'zoom-changed': (zoom: number) => void;
}
```

This camera system provides professional-grade 3D navigation while remaining accessible to users of all experience levels.