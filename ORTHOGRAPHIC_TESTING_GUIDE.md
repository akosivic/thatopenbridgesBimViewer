# Testing Guide: New Orthographic Controls

## 🚀 Access the Application
The development server is running at: **http://localhost:5173/ws/node/bimviewer/**

## 🎮 New Orthographic Mode Controls

### How to Test

#### 1. **Load a Model & Switch to Orthographic**
- Open the application and load any BIM model
- Click the **Orthographic** button in the camera settings
- You should see console messages about orthographic controls being initialized

#### 2. **Test Mouse Controls (Orthographic Mode Only)**

**🖱️ Left Mouse Button + Drag = Rotate Model 360°**
- Hold left mouse button and drag in any direction
- Model should rotate freely without any restrictions
- Can rotate upside down, sideways, any angle
- Camera always looks at model center
- Console should show "Orthographic rotation - free 360°" messages

**🖱️ Middle Mouse Button + Drag = Pan/Drag Model**
- Hold middle mouse button (wheel) and drag
- View should pan smoothly in the drag direction
- Cursor should change to "move" icon
- Console should show "Orthographic pan" messages

**🖱️ Mouse Wheel = Zoom In/Out**
- Roll mouse wheel up/down
- Should zoom in/out smoothly
- Console should show "Orthographic zoom" messages

#### 3. **Test Keyboard Controls (Orthographic Mode Only)**

**⬆️ Up Arrow Key = Zoom In**
- Press and hold Up arrow
- Should zoom into the model
- Console should show "Orthographic keyboard zoom" messages

**⬇️ Down Arrow Key = Zoom Out**
- Press and hold Down arrow  
- Should zoom out from the model
- Console should show "Orthographic keyboard zoom" messages

**⬅️ Left Arrow Key = Pan Left**
- Press and hold Left arrow
- View should pan to the left
- Console should show "Orthographic keyboard pan" messages

**➡️ Right Arrow Key = Pan Right**
- Press and hold Right arrow
- View should pan to the right
- Console should show "Orthographic keyboard pan" messages

**⌨️ WASD Keys = 3D Movement (Still Available)**
- W/S = Forward/backward movement through 3D space
- A/D = Left/right movement through 3D space
- Q/E = Up/down movement through 3D space

#### 4. **Test Perspective Mode (Should Be Unchanged)**
- Switch back to **Perspective** mode
- Left mouse should activate FPS pointer lock (cursor disappears)
- Arrow keys should move forward/back/left/right as before
- All original FPS controls should work exactly as before

#### 5. **Test Mode Switching**
- Switch between Perspective and Orthographic modes repeatedly
- Each mode should have its own distinct control behavior
- No control conflicts or interference
- Console should show mode-specific messages

## ✅ Expected Behavior

### 🎯 Success Indicators

**In Orthographic Mode:**
- Left mouse drag = smooth 360° model rotation
- Middle mouse drag = smooth panning
- Mouse wheel = zoom in/out
- Up/Down arrows = zoom in/out
- Left/Right arrows = pan left/right
- WASD still works for 3D movement
- Q/E still works for vertical movement

**In Perspective Mode:**
- All original FPS controls work unchanged
- Left mouse activates pointer lock
- Arrow keys move as before
- No interference from orthographic controls

**Console Messages:**
```
Orthographic mouse controls initialized
Orthographic rotation started
Orthographic rotation - free 360°: {theta: ..., phi: ..., position: ...}
Orthographic pan started
Orthographic pan: Vector3 {...}
Orthographic keyboard zoom: 1.5
Orthographic keyboard pan: Vector3 {...}
```

## ❌ Issues to Report

- Orthographic controls activating in perspective mode
- FPS controls interfering with orthographic mode
- Arrow keys not working properly in orthographic mode
- Mouse controls not responding in orthographic mode
- Control conflicts when switching modes
- Console errors or missing messages

## 🎮 Quick Test Sequence

1. **Load model** → Switch to **Orthographic**
2. **Left mouse drag** → Should rotate model 360°
3. **Middle mouse drag** → Should pan view
4. **Mouse wheel** → Should zoom in/out  
5. **Arrow keys** → Up/Down = zoom, Left/Right = pan
6. **Switch to Perspective** → Should revert to FPS controls
7. **Switch back to Orthographic** → Should re-enable CAD controls

If all these work correctly, the implementation is successful! 🎉

## 📍 Note
The key difference is that orthographic mode now behaves like professional CAD software (AutoCAD, Revit, etc.) while perspective mode maintains the architectural walkthrough experience.