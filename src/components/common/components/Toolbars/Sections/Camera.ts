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
      case 'forward': {
        // Copy mousewheel forward functionality exactly
        console.log('=== FORWARD BUTTON (copying mousewheel) ===');
        const positionBefore = camera.controls.getPosition(new THREE.Vector3());
        const controls = camera.controls as any;
        console.log('Position before:', positionBefore);
        console.log('Distance before:', controls.distance);
        
        // Simulate mousewheel forward (negative delta) by changing distance like mousewheel does
        if (controls.distance !== undefined) {
          const currentDistance = controls.distance;
          // Reduce distance to move camera closer (like mousewheel forward)
          // Use more aggressive reduction to allow getting much closer
          const newDistance = Math.max(0.0001, currentDistance * 0.95); // Much more aggressive, extremely low minimum
          console.log('CHANGING DISTANCE FROM', currentDistance, 'TO', newDistance);
          controls.distance = newDistance;
          
          // Force camera controls to update position based on new distance
          camera.controls.update(0);
          
          setTimeout(() => {
            console.log('Position after:', camera.controls.getPosition(new THREE.Vector3()));
            console.log('Distance after:', controls.distance);
            console.log('===============================');
          }, 10);
        } else {
          console.log('ERROR: controls.distance is undefined!');
        }
        break;
      }
        
      case 'backward': {
        // Copy mousewheel backward functionality exactly
        console.log('=== BACKWARD BUTTON (copying mousewheel) ===');
        const positionBefore = camera.controls.getPosition(new THREE.Vector3());
        const controls = camera.controls as any;
        console.log('Position before:', positionBefore);
        console.log('Distance before:', controls.distance);
        
        // Simulate mousewheel backward (positive delta) by changing distance like mousewheel does
        if (controls.distance !== undefined) {
          const currentDistance = controls.distance;
          // Increase distance to move camera farther (like mousewheel backward)
          // Use very small increase to match mousewheel behavior
          const newDistance = currentDistance * 1.001; // Very small change to match mousewheel
          console.log('CHANGING DISTANCE FROM', currentDistance, 'TO', newDistance);
          controls.distance = newDistance;
          
          // Force camera controls to update position based on new distance
          camera.controls.update(0);
          
          setTimeout(() => {
            console.log('Position after:', camera.controls.getPosition(new THREE.Vector3()));
            console.log('Distance after:', controls.distance);
            console.log('===============================');
          }, 10);
        } else {
          console.log('ERROR: controls.distance is undefined!');
        }
        break;
      }
        
      case 'left':
        // Strafe left (perpendicular to viewing direction in horizontal plane)
        // Perpendicular vector: rotate azimuth by -90° (subtract π/2)
        newPos.x -= Math.cos(camera.controls.azimuthAngle) * moveStep;
        newPos.z += Math.sin(camera.controls.azimuthAngle) * moveStep;
        break;
      case 'right':
        // Strafe right (perpendicular to viewing direction in horizontal plane)  
        // Perpendicular vector: rotate azimuth by +90° (add π/2)
        newPos.x += Math.cos(camera.controls.azimuthAngle) * moveStep;
        newPos.z -= Math.sin(camera.controls.azimuthAngle) * moveStep;
        break;
      case 'up':
        // Move up along Y-axis only
        newPos.y += moveStep;
        break;
      case 'down':
        // Move down along Y-axis only  
        newPos.y -= moveStep;
        break;
    }

    // Only update position for left/right/up/down movements
    // Forward/backward now use distance instead
    if (direction !== 'forward' && direction !== 'backward') {
      camera.controls.setPosition(newPos.x, newPos.y, newPos.z);
    }
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

    // Target coordinates from screenshot: Position: X: -1.29, Y: 0.34, Z: 1.14, Azimuth: 346.7°, Polar: 78.4°
    const targetPosition = new THREE.Vector3(-1.29, 0.34, 1.14);
    const targetAzimuth = 346.7 * Math.PI / 180;
    const targetPolar = 78.4 * Math.PI / 180;
    
    console.log('=== RESETTING TO SCREENSHOT VALUES ===');
    console.log('Target position:', targetPosition);
    console.log('Target azimuth:', 346.7, '° (', targetAzimuth, 'rad)');
    console.log('Target polar:', 78.4, '° (', targetPolar, 'rad)');
    
    // Calculate what target point would give us the desired position and angles
    const currentDistance = targetPosition.length(); // Distance from origin
    
    // Calculate the target point that would place the camera at our desired position
    // when looking with our desired angles
    const target = new THREE.Vector3(
      targetPosition.x - currentDistance * Math.sin(targetPolar) * Math.sin(targetAzimuth),
      targetPosition.y - currentDistance * Math.cos(targetPolar),
      targetPosition.z - currentDistance * Math.sin(targetPolar) * Math.cos(targetAzimuth)
    );
    
    console.log('Calculated target point:', target);
    console.log('Calculated distance:', currentDistance);
    
    // Set the target using object property access to avoid TypeScript errors
    const controls = camera.controls as any;
    if (controls.target && controls.target.set) {
      controls.target.set(target.x, target.y, target.z);
    }
    
    // Set distance if available
    if ('distance' in camera.controls) {
      controls.distance = currentDistance;
    }
    
    // Set angles
    camera.controls.azimuthAngle = targetAzimuth;
    camera.controls.polarAngle = targetPolar;
    
    // Set zoom to 1.00 as shown in screenshot
    if (camera.controls.camera) {
      camera.controls.camera.zoom = 1.00;
      camera.controls.camera.updateProjectionMatrix();
    }
    
    // Update the controls to apply all changes
    if ('update' in camera.controls && typeof controls.update === 'function') {
      controls.update(0);
    }
    
    // Check results after a delay
    setTimeout(() => {
      console.log('=== SCREENSHOT RESET RESULTS ===');
      console.log('Position:', camera.controls?.getPosition(new THREE.Vector3()));
      console.log('Azimuth:', (camera.controls?.azimuthAngle ?? 0) * 180 / Math.PI, '°');
      console.log('Polar:', (camera.controls?.polarAngle ?? 0) * 180 / Math.PI, '°');
      console.log('Zoom:', camera.controls?.camera?.zoom);
      console.log('Target:', controls.target);
      console.log('Distance:', controls.distance);
    }, 100);
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
