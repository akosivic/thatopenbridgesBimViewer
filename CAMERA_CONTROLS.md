# Enhanced Camera Controls Documentation

## Overview

The BIM Viewer now includes enhanced camera controls with projection-aware keyboard and mouse bindings. This update provides:

- **English as Default Language**: Interface now starts in English instead of Japanese
- **Always-Visible Projection Controls**: Orthographic/Perspective toggle available in both debug and production modes
- **Mode-Specific Controls**: Different keyboard bindings for Orthographic vs Perspective modes
- **Enhanced User Experience**: Controls adapt automatically when switching between projection modes

## Projection Modes

### Perspective Mode
- **Description**: Standard 3D perspective view with depth perception
- **Use Case**: General navigation and visualization
- **Visual**: Objects appear smaller when further away

### Orthographic Mode  
- **Description**: CAD-style parallel projection without perspective distortion
- **Use Case**: Technical drawings, measurements, precise positioning
- **Visual**: Objects maintain consistent size regardless of distance

## Projection Controls

### Location
- Always visible at the bottom of the screen in the "Camera Settings" tab
- Available in both debug mode and production mode

### Interface
- Two buttons: "Perspective" and "Orthographic"  
- Active mode is highlighted in purple
- Current mode displayed below buttons
- Key bindings information shown for reference

### Switching Modes
- Click either "Perspective" or "Orthographic" button to switch
- Changes are instant and mode-specific controls activate immediately
- Current projection mode is logged to browser console

## Keyboard Controls

### Perspective Mode (FPS-style)
**Movement:**
- `W` / `↑` - Move forward
- `S` / `↓` - Move backward  
- `A` / `←` - Strafe left
- `D` / `→` - Strafe right
- `Q` - Move up (vertical)
- `E` - Move down (vertical)
- `Shift` - Sprint (2x speed)

**Rotation:**
- Mouse movement - Look around (hold mouse button)
- No keyboard rotation (mouse-look only)

**Zoom:**
- Mouse wheel - Zoom in/out

### Orthographic Mode (CAD-style)
**Panning:**
- `W` / `↑` - Pan up
- `S` / `↓` - Pan down
- `A` / `←` - Pan left  
- `D` / `→` - Pan right
- `Q` - Move up (vertical)
- `E` - Move down (vertical)

**Orbit Rotation:**
- `Ctrl + ←` - Orbit left
- `Ctrl + →` - Orbit right
- `Ctrl + ↑` - Orbit up
- `Ctrl + ↓` - Orbit down

**Zoom:**
- Mouse wheel - Zoom in/out
- `Ctrl + Mouse Wheel` - Alternative zoom

**Additional Controls:**
- Middle mouse button - Pan
- `Shift + Mouse Drag` - Alternative pan

## Debug Information

When debug mode is enabled, a position display shows:
- Current projection mode (Perspective/Orthographic)
- Camera position (X, Y, Z coordinates)
- Camera rotation (Horizontal/Vertical angles)
- FPS lock status
- Enhanced controls confirmation

## Technical Details

### Implementation
- Uses That Open Engine's `OrthoPerspectiveCamera` component
- Projection switching via `camera.projection.set(mode)`
- Enhanced keyboard controls with projection-aware bindings
- Real-time adaptation when switching modes

### Browser Compatibility
- Works in all modern browsers supporting ES6 modules
- WebGL-enabled browsers required
- Mouse and keyboard event handling

### Performance
- Minimal performance impact
- Efficient event handling with requestAnimationFrame
- Optimized for smooth 60fps operation

## Troubleshooting

### Controls Not Working
1. Ensure browser has focus on the viewer
2. Check that JavaScript is enabled
3. Verify no browser extensions are blocking keyboard events

### Mode Switch Issues  
1. Check browser console for errors
2. Ensure That Open Engine components loaded properly
3. Verify camera initialization completed

### Visual Issues
1. Check WebGL support in browser
2. Update graphics drivers if needed
3. Clear browser cache and reload

## Migration Notes

### From Previous Version
- Legacy keyboard controls automatically replaced
- Existing camera position preserved during projection switches
- No breaking changes to existing functionality

### Configuration
- No additional configuration required
- Default projection mode: Perspective
- All features enabled by default

## Future Enhancements

Planned improvements include:
- Custom key binding configuration
- Additional projection modes (isometric, etc.)
- Saved camera presets per projection mode  
- Touch/mobile controls for tablets
- Advanced orbit controls customization

---

For technical support or questions, check the browser console for debugging information and refer to That Open Engine documentation.