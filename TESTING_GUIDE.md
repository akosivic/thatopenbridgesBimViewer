# Testing Guide: Orthographic Mode Freedom

## Quick Test Instructions

### 🚀 Access the Application
The development server is running at: **http://localhost:5173/ws/node/bimviewer/**

### 🔧 How to Test the Changes

#### 1. **Load a BIM Model**
- Open the application in your browser
- Load any IFC/BIM model using the import functionality

#### 2. **Test Perspective Mode (Should Behave as Before)**
- Ensure you're in **Perspective** mode (check the projection buttons)
- Try moving around with WASD keys or arrow keys
- **Expected**: Y-axis should still lock to 1.6m (eye level)
- **Expected**: Looking up/down should be limited (no flipping)
- **Expected**: All existing restrictions should work as before

#### 3. **Switch to Orthographic Mode**
- Click the **Orthographic** button in the camera settings
- **Expected**: Console should log "SWITCHING TO ORTHOGRAPHIC MODE"
- **Expected**: "Applying default settings - removing all camera restrictions"

#### 4. **Test Orthographic Freedom**

**Movement Tests:**
- Use WASD or arrow keys to move in all directions
- Use Q/E keys to move up and down
- **Expected**: Camera should move freely in ALL directions
- **Expected**: No Y-axis restrictions (can go below ground level)
- **Expected**: Console logs should show "no restrictions"

**Rotation Tests:**
- Use the rotation controls (mouse look or rotation buttons)
- Try looking straight up and down, and beyond
- **Expected**: No rotation limits or clamps
- **Expected**: Can rotate in full 360° in all axes

**Mouse Wheel Tests:**
- Use mouse wheel to move forward/backward
- **Expected**: Y position should change freely, not locked to 1.6m
- **Expected**: Console should show "Orthographic mode: No Y-axis restrictions applied"

#### 5. **Test Mode Switching**
- Switch back and forth between Perspective and Orthographic modes
- **Expected**: 
  - Perspective → Orthographic: Removes all restrictions
  - Orthographic → Perspective: Applies Y=1.6m lock and rotation limits

#### 6. **Test Reset Function**
- Press the reset camera button in different modes
- **Expected**:
  - Perspective reset: Position (-1.29, 1.60, 1.14) - eye level
  - Orthographic reset: Position (0, 5, 5) - elevated technical view

### 🔍 Debug Mode (Optional)
Add `?debug` to the URL to see detailed position/rotation information:
`http://localhost:5173/ws/node/bimviewer/?debug`

This will show a debug panel with real-time camera information.

### ✅ Expected Console Messages

**When switching to Orthographic:**
```
=== SWITCHING TO ORTHOGRAPHIC MODE ===
Applying default settings - removing all camera restrictions
Orthographic mode: All restrictions removed, default settings applied
```

**When moving in Orthographic:**
```
Orthographic movement (no restrictions): Vector3 {x: ..., y: ..., z: ...}
Orthographic mode - New position: Vector3 {x: ..., y: ..., z: ...}
```

**When switching back to Perspective:**
```
=== SWITCHING TO PERSPECTIVE MODE ===
Applying perspective restrictions and settings
Y position locked to 1.6m (eye level) for perspective mode
```

### 🐛 What to Look For

**✅ Success Indicators:**
- Camera moves freely in all directions in orthographic mode
- Y-axis is not locked to 1.6m in orthographic mode
- Rotation has no artificial limits in orthographic mode
- Console logs show projection mode and restriction status
- Perspective mode still maintains all original restrictions

**❌ Issues to Report:**
- Y-axis still locked in orthographic mode
- Rotation still clamped in orthographic mode
- Console shows restrictions being applied in orthographic mode
- Perspective mode loses its restrictions

### 📝 Test Checklist

- [ ] Perspective mode maintains Y=1.6m lock
- [ ] Perspective mode maintains rotation clamps
- [ ] Orthographic mode allows Y movement below/above 1.6m
- [ ] Orthographic mode allows full rotation (straight up/down and beyond)
- [ ] Mode switching triggers appropriate console messages
- [ ] Reset button works differently in each mode
- [ ] Mouse wheel respects projection mode
- [ ] Manual movement buttons respect projection mode

If all checkboxes pass, the implementation is working correctly! 🎉