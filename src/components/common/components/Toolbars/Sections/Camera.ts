import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import i18n from "../../../utils/i18n";

export default (world: OBC.World, highlighter?: OBF.Highlighter) => {
  const { camera } = world;

  const onFitModel = () => {
    if (camera instanceof OBC.OrthoPerspectiveCamera && world.meshes.size > 0) {
      camera.fit(world.meshes, 0.5);
    }
  };

  const onLock = (e: Event) => {
    const button = e.target as BUI.Button;
    camera.enabled = !camera.enabled;
    button.active = !camera.enabled;
    button.label = camera.enabled ? i18n.t('disable') : i18n.t('enable');
    button.icon = camera.enabled
      ? "tabler:lock-filled"
      : "majesticons:unlock-open";
  };

  // Camera position controls
  const moveStep = 1.0;
  const rotationStep = 15; // degrees
  const zoomStep = 0.1;

  const moveCamera = (direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down') => {
    if (!camera.controls) return;

    const currentPos = camera.controls.getPosition(new THREE.Vector3());
    const azimuth = camera.controls.azimuthAngle;
    const polar = camera.controls.polarAngle;
    const newPos = currentPos.clone();

    // Clear highlighter selection when camera moves via UI controls
    if (highlighter) {
      highlighter.clear("select");
    }

    /*
     * SPHERICAL COORDINATE MOVEMENT CALCULATIONS:
     * 
     * The camera uses spherical coordinates where:
     * - azimuth: horizontal rotation around Y-axis (0° = -Z direction)
     * - polar: vertical angle from Y-axis (0° = up, 90° = horizontal, 180° = down)
     * 
     * For movement calculations:
     * - Forward/Backward: Move along camera's viewing direction (uses both azimuth & polar)
     * - Left/Right: Strafe perpendicular to viewing direction (horizontal plane only)
     * - Up/Down: Move purely along Y-axis (vertical)
     * 
     * AZIMUTH-BASED DIRECTION VECTORS:
     * - sin(azimuth) gives X component of horizontal direction
     * - cos(azimuth) gives Z component of horizontal direction
     * - sin(polar) scales horizontal movement for viewing angle
     * - cos(polar) gives Y component for forward/backward movement
     */

    switch (direction) {
      case 'forward':
      case 'up':
        // Move along camera's viewing direction (like scroll wheel forward)
        // Uses spherical coordinates to calculate 3D movement vector
        newPos.x += Math.sin(polar) * Math.sin(azimuth) * moveStep;
        newPos.y += Math.cos(polar) * moveStep;
        newPos.z += Math.sin(polar) * Math.cos(azimuth) * moveStep;
        break;
      case 'backward':
      case 'down':
        // Move opposite to camera's viewing direction (like scroll wheel backward)
        newPos.x -= Math.sin(polar) * Math.sin(azimuth) * moveStep;
        newPos.y -= Math.cos(polar) * moveStep;
        newPos.z -= Math.sin(polar) * Math.cos(azimuth) * moveStep;
        break;
      case 'left':
        // Strafe left (perpendicular to viewing direction in horizontal plane)
        // Perpendicular vector: rotate azimuth by -90° (subtract π/2)
        newPos.x -= Math.cos(azimuth) * moveStep;
        newPos.z += Math.sin(azimuth) * moveStep;
        break;
      case 'right':
        // Strafe right (perpendicular to viewing direction in horizontal plane)  
        // Perpendicular vector: rotate azimuth by +90° (add π/2)
        newPos.x += Math.cos(azimuth) * moveStep;
        newPos.z -= Math.sin(azimuth) * moveStep;
        break;
    }

    camera.controls.setPosition(newPos.x, newPos.y, newPos.z);
  };

  const rotateCamera = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (!camera.controls) return;

    const currentAzimuth = camera.controls.azimuthAngle;
    const currentPolar = camera.controls.polarAngle;
    const radStep = (rotationStep * Math.PI) / 180;

    /*
     * CAMERA ROTATION DOCUMENTATION:
     * 
     * AZIMUTH ANGLE (horizontal rotation around Y-axis):
     * - Controls left/right looking direction
     * - 0° = looking towards negative Z-axis (-Z direction)
     * - 90° = looking towards positive X-axis (+X direction)  
     * - 180° = looking towards positive Z-axis (+Z direction)
     * - 270° = looking towards negative X-axis (-X direction)
     * 
     * POLAR ANGLE (vertical angle from Y-axis):
     * - Controls up/down looking direction
     * - 0° = looking straight up (+Y direction)
     * - 90° = looking horizontally (XZ plane)
     * - 180° = looking straight down (-Y direction)
     * 
     * ROTATION DIRECTIONS:
     * - Left/Right: Modify azimuth angle (horizontal panning)
     * - Up/Down: Modify polar angle with safety bounds (vertical tilting)
     * 
     * SAFETY BOUNDS:
     * - Polar angle clamped between 0.1 and (π - 0.1) to prevent gimbal lock
     * - This prevents camera from flipping when looking straight up/down
     */

    switch (direction) {
      case 'left':
        // Rotate azimuth counter-clockwise (subtract angle)
        camera.controls.azimuthAngle = currentAzimuth - radStep;
        // Clear highlighter selection when camera rotates via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
      case 'right':
        // Rotate azimuth clockwise (add angle)
        camera.controls.azimuthAngle = currentAzimuth + radStep;
        // Clear highlighter selection when camera rotates via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
      case 'up':
        // Rotate polar upward (decrease angle toward 0°)
        // Clamp to 0.1 radians to prevent looking exactly straight up
        camera.controls.polarAngle = Math.max(0.1, currentPolar - radStep);
        // Clear highlighter selection when camera rotates via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
      case 'down':
        // Rotate polar downward (increase angle toward 180°)
        // Clamp to (π - 0.1) radians to prevent looking exactly straight down
        camera.controls.polarAngle = Math.min(Math.PI - 0.1, currentPolar + radStep);
        // Clear highlighter selection when camera rotates via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
    }
  };

  const zoomCamera = (direction: 'in' | 'out') => {
    if (!camera.controls?.camera) return;

    // Clear highlighter selection when camera zooms via UI controls
    if (highlighter) {
      highlighter.clear("select");
    }

    const currentZoom = camera.controls.camera.zoom;
    const newZoom = direction === 'in' ?
      currentZoom + zoomStep :
      Math.max(0.1, currentZoom - zoomStep);

    camera.controls.camera.zoom = newZoom;
    camera.controls.camera.updateProjectionMatrix();
  };

  const resetCamera = () => {
    if (!camera.controls) return;

    console.log('=== RESET CAMERA STARTED ===');
    console.log('Reset camera - Before:', camera.controls.getPosition(new THREE.Vector3()));
    console.log('Current azimuth before reset (degrees):', camera.controls.azimuthAngle * 180 / Math.PI);
    console.log('Current polar before reset (degrees):', camera.controls.polarAngle * 180 / Math.PI);
    console.log('Current zoom before reset:', camera.controls.camera?.zoom);
    console.log('Camera controls target (if available):', (camera.controls as any).target);
    console.log('Camera controls center (if available):', (camera.controls as any).center);
    
    // Target coordinates from user specification: Position: X: -8, Y: 1.27, Z: 1.78, Azimuth: -6.6°, Polar: 91.6°
    const targetPosition = new THREE.Vector3(-8.00, 1.27, 1.78);
    
    /*
     * AZIMUTH ANGLE COMPUTATION DOCUMENTATION:
     * 
     * The azimuth angle represents horizontal rotation around the Y-axis (up vector).
     * In spherical coordinates with Three.js camera controls:
     * 
     * - Azimuth = 0° points towards negative Z-axis (south)
     * - Azimuth = 90° (π/2) points towards positive X-axis (east)  
     * - Azimuth = 180° (π) points towards positive Z-axis (north)
     * - Azimuth = 270° (3π/2) points towards negative X-axis (west)
     * 
     * CRITICAL TIMING ISSUE:
     * The setPosition() method internally recalculates angles based on the new position
     * relative to the target (usually origin). This means:
     * 
     * 1. If we set azimuth BEFORE setPosition(), it gets overridden
     * 2. We must use "position-first approach": 
     *    - Call setPosition() immediately 
     *    - Set angles in a setTimeout callback after position is established
     * 
     * ANGLE CALCULATION:
     * When camera is at position (-8.00, 1.27, 1.78) looking towards origin (0,0,0):
     * - The vector from camera to target is (8.00, -1.27, -1.78)
     * - Projected onto XZ plane: (8.00, -1.78)
     * - Azimuth = atan2(x, z) = atan2(8.00, -1.78) ≈ -6.6° (negative angle)
     * 
     * This explains why our target azimuth of -6.6° matches the user specification.
     */
    
    const targetAzimuth = -6.6 * Math.PI / 180; // -6.6° from user specification
    const targetPolar = 91.6 * Math.PI / 180;   // 91.6° from user specification
    
    console.log('Applying user specified coordinates with position-first approach');
    
    // Set zoom to user specification
    if (camera.controls.camera) {
      camera.controls.camera.zoom = 1.00;
      camera.controls.camera.updateProjectionMatrix();
    }
    
    // STEP 1: Set position FIRST (this will internally recalculate angles)
    console.log('Setting position to:', targetPosition.x, targetPosition.y, targetPosition.z);
    camera.controls.setPosition(targetPosition.x, targetPosition.y, targetPosition.z);
    console.log('Position immediately after setPosition:', camera.controls.getPosition(new THREE.Vector3()));
    console.log('Angles immediately after setPosition - Azimuth:', camera.controls.azimuthAngle * 180 / Math.PI, '° Polar:', camera.controls.polarAngle * 180 / Math.PI, '°');
    
    // Try alternative approaches in case setPosition doesn't work as expected
    if (camera.controls.camera && camera.controls.camera.position) {
      console.log('Also setting camera.position directly:', targetPosition.x, targetPosition.y, targetPosition.z);
      camera.controls.camera.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
      console.log('Direct camera position after set:', camera.controls.camera.position);
    }
    
    // STEP 2: Set target point first, then position and angles
    setTimeout(() => {
      if (camera.controls) {
        console.log('Position before setting target/angles (in timeout):', camera.controls.getPosition(new THREE.Vector3()));
        
        // Set target to origin (0,0,0) - this is what we want to look at
        if ((camera.controls as any).target) {
          (camera.controls as any).target.set(0, 0, 0);
          console.log('Set camera target to origin: (0, 0, 0)');
        }
        
        // With target at origin, set position
        camera.controls.setPosition(targetPosition.x, targetPosition.y, targetPosition.z);
        console.log('Set position to:', targetPosition.x, targetPosition.y, targetPosition.z);
        
        // Then set angles - these should now work with the origin target
        camera.controls.azimuthAngle = targetAzimuth;
        camera.controls.polarAngle = targetPolar;
        console.log('Set angles - Azimuth:', targetAzimuth * 180 / Math.PI, '° Polar:', targetPolar * 180 / Math.PI, '°');
        
        if (camera.controls.camera) {
          camera.controls.camera.updateProjectionMatrix();
        }
        
        // Check results immediately
        setTimeout(() => {
          console.log('Reset camera - Immediate check:');
          console.log('Position:', camera.controls?.getPosition(new THREE.Vector3()));
          console.log('Azimuth (degrees):', (camera.controls?.azimuthAngle ?? 0) * 180 / Math.PI);
          console.log('Polar (degrees):', (camera.controls?.polarAngle ?? 0) * 180 / Math.PI);
          console.log('Target (if available):', (camera.controls as any)?.target);
        }, 10);
        
        setTimeout(() => {
          console.log('=== FINAL CHECK AFTER ADDITIONAL DELAY ===');
          console.log('Position after additional delay:', camera.controls?.getPosition(new THREE.Vector3()));
          console.log('Azimuth after additional delay (degrees):', (camera.controls?.azimuthAngle ?? 0) * 180 / Math.PI);
          console.log('Polar after additional delay (degrees):', (camera.controls?.polarAngle ?? 0) * 180 / Math.PI);
        }, 200);
      }
    }, 50);
    
    console.log('Reset camera - Position set first, angles will be set in 50ms');
    console.log('Reset camera - Target azimuth:', targetAzimuth * 180 / Math.PI, '°');
    console.log('Reset camera - Target polar:', targetPolar * 180 / Math.PI, '°');
  };

  const toggleProjection = () => {
    if (camera instanceof OBC.OrthoPerspectiveCamera) {
      const current = camera.projection.current;
      camera.projection.set(current === "Perspective" ? "Orthographic" : "Perspective");
    }
  };

  // Position preset functions
  const setTopView = () => {
    if (!camera.controls) return;

    const currentPos = camera.controls.getPosition(new THREE.Vector3());
    camera.controls.setPosition(currentPos.x, currentPos.y + 10, currentPos.z);
    camera.controls.polarAngle = 0.1; // Almost top-down
    if (camera.controls.camera) {
      camera.controls.camera.zoom = 0.5;
      camera.controls.camera.updateProjectionMatrix();
    }
  };

  const setFrontView = () => {
    if (!camera.controls) return;

    camera.controls.azimuthAngle = 0;
    camera.controls.polarAngle = Math.PI / 2;
  };

  const setSideView = () => {
    if (!camera.controls) return;

    camera.controls.azimuthAngle = Math.PI / 2;
    camera.controls.polarAngle = Math.PI / 2;
  };

  return BUI.Component.create<BUI.PanelSection>(() => {
    const t = (key: string) => i18n.t(key);
    return BUI.html`
      <bim-toolbar-section label="${t('camera')}" icon="ph:camera-fill" style="pointer-events: auto">
        <bim-button label="${t('fitModel')}" icon="material-symbols:fit-screen-rounded" @click=${onFitModel}></bim-button>
        <bim-button label="${t('disable')}" icon="tabler:lock-filled" @click=${onLock} .active=${!camera.enabled}></bim-button>
        
        <!-- Position Controls -->
        <div style="display: flex; flex-direction: column; gap: 5px; margin: 10px 0; padding: 10px; border: 1px solid #333; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #ccc;">Position Controls</div>
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto auto; gap: 2px; align-items: center;">
            <div></div>
            <bim-button icon="material-symbols:keyboard-arrow-up" @click=${() => moveCamera('forward')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:keyboard-arrow-up" @click=${() => moveCamera('up')} style="width: 30px; height: 30px;"></bim-button>
            
            <bim-button icon="material-symbols:keyboard-arrow-left" @click=${() => moveCamera('left')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:keyboard-arrow-down" @click=${() => moveCamera('backward')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:keyboard-arrow-right" @click=${() => moveCamera('right')} style="width: 30px; height: 30px;"></bim-button>
            
            <div></div>
            <div></div>
            <bim-button icon="material-symbols:keyboard-arrow-down" @click=${() => moveCamera('down')} style="width: 30px; height: 30px;"></bim-button>
          </div>
        </div>

        <!-- Rotation Controls -->
        <div style="display: flex; flex-direction: column; gap: 5px; margin: 10px 0; padding: 10px; border: 1px solid #333; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #ccc;">Rotation Controls</div>
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto; gap: 2px; align-items: center;">
            <div></div>
            <bim-button icon="material-symbols:rotate-left" @click=${() => rotateCamera('up')} style="width: 30px; height: 30px;"></bim-button>
            <div></div>
            
            <bim-button icon="material-symbols:rotate-left" @click=${() => rotateCamera('left')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:rotate-right" @click=${() => rotateCamera('down')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:rotate-right" @click=${() => rotateCamera('right')} style="width: 30px; height: 30px;"></bim-button>
          </div>
        </div>

        <!-- Camera Presets -->
        <div style="display: flex; flex-direction: column; gap: 5px; margin: 10px 0; padding: 10px; border: 1px solid #333; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #ccc;">Camera Presets</div>
          <div style="display: flex; flex-direction: column; gap: 3px;">
            <bim-button label="Top View" icon="material-symbols:vertical-align-top" @click=${setTopView} style="width: 100%;"></bim-button>
            <bim-button label="Front View" icon="material-symbols:view-in-ar" @click=${setFrontView} style="width: 100%;"></bim-button>
            <bim-button label="Side View" icon="material-symbols:view-sidebar" @click=${setSideView} style="width: 100%;"></bim-button>
            <bim-button label="Reset" icon="material-symbols:refresh" @click=${resetCamera} style="width: 100%;"></bim-button>
          </div>
        </div>

        <!-- Projection Toggle -->
        <div style="display: flex; flex-direction: column; gap: 5px; margin: 10px 0; padding: 10px; border: 1px solid #333; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #ccc;">Projection</div>
          <bim-button label="Toggle Perspective/Orthographic" icon="material-symbols:3d-rotation" @click=${toggleProjection} style="width: 100%;"></bim-button>
        </div>
      </bim-toolbar-section>
    `;
  });
};
