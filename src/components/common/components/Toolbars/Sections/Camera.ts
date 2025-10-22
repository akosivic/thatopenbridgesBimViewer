import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import i18n from "../../../utils/i18n";
import { getCurrentProjection } from "./ProjectionControls";

// Global reference to FPS controls - will be set from WorldViewer
export let fpControls: PointerLockControls | null = null;
export const setFPControls = (controls: PointerLockControls | null) => {
  fpControls = controls;
};

// Movement speed control
let speedMultiplier = 1.0;
export const setMovementSpeedMultiplier = (multiplier: number) => {
  speedMultiplier = multiplier;
  console.log(`Movement speed multiplier set to: ${multiplier}`);
};

export const getMovementSpeedMultiplier = () => speedMultiplier;

// Listen for speed change events to update rotation speed
window.addEventListener('moveSpeedChange', (event: any) => {
  const { multiplier } = event.detail;
  speedMultiplier = multiplier;
  console.log(`Camera rotation speed multiplier updated to: ${multiplier}`);
});

export default (world: OBC.World) => {
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

  // FPS Camera movement controls
  const baseMoveStep = 1.0;

  const moveCamera = (direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down') => {
    if (!fpControls) {
      console.log('FPS controls not initialized');
      return;
    }

    const camera3js = world.camera.three;
    const currentPos = camera3js.position.clone();

    console.log(`=== FPS CAMERA MOVEMENT: ${direction.toUpperCase()} ===`);
    console.log('Current position:', currentPos);

    // Get current projection mode to determine movement behavior
    const currentProjection = getCurrentProjection();
    const isOrthographic = currentProjection === "Orthographic";

    // In orthographic mode: forward/backward should be zoom in/zoom out
    if (isOrthographic && (direction === 'forward' || direction === 'backward')) {
      if (!camera.controls?.camera) {
        console.log('Camera controls not available for zoom');
        return;
      }

      const currentZoom = camera.controls.camera.zoom;
      // Apply speed multiplier to zoom step
      const baseZoomStep = 0.1;
      const zoomStep = baseZoomStep * speedMultiplier;
      
      const newZoom = direction === 'forward' ?
        currentZoom + zoomStep :
        Math.max(0.001, currentZoom - zoomStep);

      camera.controls.camera.zoom = newZoom;
      camera.controls.camera.updateProjectionMatrix();

      console.log(`=== ORTHOGRAPHIC ZOOM: ${direction.toUpperCase()} ===`);
      console.log(`Using speed multiplier: ${speedMultiplier} (base step: ${baseZoomStep}, adjusted step: ${zoomStep})`);
      console.log('Zoom changed from', currentZoom, 'to', newZoom);
      return;
    }

    /*
     * FPS MOVEMENT SYSTEM:
     * 
     * Uses direct Three.js camera position manipulation with world-space vectors.
     * Movement is based on camera's current orientation (forward/right vectors).
     * 
     * DIRECTION VECTORS:
     * - Forward: Camera's negative Z direction in world space
     * - Right: Camera's positive X direction in world space  
     * - Up: World Y-axis (always vertical)
     * 
     * MOVEMENT CALCULATIONS:
     * - Get camera's world direction matrix
     * - Extract right/forward vectors from camera orientation
     * - Apply movement step in desired direction
     * - Update camera position directly
     */

    // Get camera's current orientation vectors
    const cameraMatrix = new THREE.Matrix4();
    camera3js.updateMatrixWorld();
    cameraMatrix.extractRotation(camera3js.matrixWorld);

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    // Extract direction vectors from camera matrix
    cameraMatrix.extractBasis(right, up, forward);
    forward.negate(); // Camera looks down negative Z

    const newPos = currentPos.clone();

    const currentMoveStep = baseMoveStep * speedMultiplier;
    
    switch (direction) {
      case 'forward':
        newPos.addScaledVector(forward, currentMoveStep);
        break;
      case 'backward':
        newPos.addScaledVector(forward, -currentMoveStep);
        break;
      case 'left':
        newPos.addScaledVector(right, -currentMoveStep);
        break;
      case 'right':
        newPos.addScaledVector(right, currentMoveStep);
        break;
      case 'up':
        newPos.y += currentMoveStep;
        break;
      case 'down':
        newPos.y -= currentMoveStep;
        break;
    }

    // Update camera position
    camera3js.position.copy(newPos);

    // Notify NaviCube of camera change
    window.dispatchEvent(new CustomEvent('cameraChanged', {
      detail: { source: 'fps-movement', position: camera3js.position }
    }));

    console.log('New position:', newPos);
    console.log('===================================');
  };

  // Get the model center for consistent rotation target (same as NaviCube)
  const getModelCenter = (): THREE.Vector3 => {
    if (world.meshes.size > 0) {
      const bbox = new THREE.Box3();
      world.meshes.forEach(mesh => {
        bbox.expandByObject(mesh);
      });
      if (!bbox.isEmpty()) {
        return bbox.getCenter(new THREE.Vector3());
      }
    }
    return new THREE.Vector3(0, 0, 0);
  };

  const rotateCamera = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (!fpControls) {
      console.log('FPS controls not initialized');
      return;
    }

    const camera3js = world.camera.three;
    
    // Get current projection mode to determine rotation style
    const currentProjection = getCurrentProjection();
    const isOrthographic = currentProjection === "Orthographic";

    if (isOrthographic) {
      // ORTHOGRAPHIC MODE: Use orbit-style rotation (like NaviCube)
      const target = getModelCenter();
      console.log(`=== ORBIT CAMERA ROTATION (ORTHOGRAPHIC): ${direction.toUpperCase()} ===`);
      console.log(`Using speed multiplier: ${speedMultiplier} (base step: 0.2, adjusted step: ${0.2 * speedMultiplier})`);

      /*
       * ORBIT ROTATION SYSTEM (NaviCube-style):
       * 
       * Positions camera around model center to show different sides.
       * Camera always looks at the model center after rotation.
       */

      // Calculate camera position relative to model center
      const relativePosition = camera3js.position.clone().sub(target);
      
      // Convert to spherical coordinates
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(relativePosition);
      
      // Apply rotation based on direction (like NaviCube)
      // Apply speed multiplier to rotation step
      const baseRotationStep = 0.2; // Base rotation step for button controls
      const rotationStep = baseRotationStep * speedMultiplier;
      
      switch (direction) {
        case 'left':
          spherical.theta -= rotationStep; // Orbit left (model appears to rotate right)
          break;
        case 'right':
          spherical.theta += rotationStep; // Orbit right (model appears to rotate left)
          break;
        case 'up':
          // Constrain phi to prevent flipping and limit bottom view (like NaviCube)
          const bottomLimit = Math.PI * 0.25; // ~45° - limit bottom view
          spherical.phi = Math.max(bottomLimit, spherical.phi - rotationStep); // Orbit up
          break;
        case 'down':
          // Constrain phi to prevent going too high
          const epsilon = 0.1;
          spherical.phi = Math.min(Math.PI - epsilon, spherical.phi + rotationStep); // Orbit down
          break;
      }
      
      // Normalize theta to prevent accumulation errors
      spherical.theta = spherical.theta % (2 * Math.PI);
      
      // Ensure radius stays consistent (maintain distance)
      if (spherical.radius <= 0) {
        spherical.radius = 10; // Fallback distance
      }
      
      // Convert back to Cartesian coordinates relative to model center
      const newPosition = new THREE.Vector3();
      newPosition.setFromSpherical(spherical);
      newPosition.add(target); // Add model center back to get world position
      
      // Update camera position
      camera3js.position.copy(newPosition);
      
      // Check if camera state preservation is active (during projection switching)
      const isCameraStateBeingPreserved = (window as any).isCameraStateBeingPreserved?.() || false;
      
      if (!isCameraStateBeingPreserved) {
        // Always look at the model center (like NaviCube)
        camera3js.lookAt(target);
      } else {
        console.log("🔒 Skipping lookAt during camera state preservation");
      }

      // Notify NaviCube of camera change
      window.dispatchEvent(new CustomEvent('cameraChanged', {
        detail: { source: 'orbit-rotation', rotation: camera3js.quaternion, position: camera3js.position }
      }));

      console.log('Orbit rotation:', {
        direction,
        theta: spherical.theta * 180 / Math.PI,
        phi: spherical.phi * 180 / Math.PI,
        position: camera3js.position,
        target: target,
        speedMultiplier: speedMultiplier,
        rotationStep: rotationStep
      });
    } else {
      // PERSPECTIVE MODE: Use FPS-style rotation (original behavior)
      console.log(`=== FPS CAMERA ROTATION (PERSPECTIVE): ${direction.toUpperCase()} ===`);
      console.log(`Using speed multiplier: ${speedMultiplier} (base step: 0.1, adjusted step: ${0.1 * speedMultiplier})`);

      /*
       * FPS ROTATION SYSTEM:
       * 
       * Uses Euler angles for direct camera rotation.
       * Rotation is applied relative to current camera orientation.
       * 
       * ROTATION AXES:
       * - Left/Right: Rotate around Y-axis (yaw)
       * - Up/Down: Rotate around X-axis (pitch)
       */

      const euler = new THREE.Euler().setFromQuaternion(camera3js.quaternion, 'YXZ');
      // Apply speed multiplier to rotation step
      const baseRotationStep = 0.1; // Base radians for FPS rotation
      const rotationStep = baseRotationStep * speedMultiplier;

      switch (direction) {
        case 'left':
          euler.y -= rotationStep; // Rotate left (counter-clockwise around Y)
          break;
        case 'right':
          euler.y += rotationStep; // Rotate right (clockwise around Y)
          break;
        case 'up':
          euler.x = Math.max(-Math.PI / 2 + 0.1, euler.x - rotationStep); // Look up (clamp to prevent flip)
          break;
        case 'down':
          euler.x = Math.min(Math.PI / 2 - 0.1, euler.x + rotationStep); // Look down (clamp to prevent flip)
          break;
      }

      // Apply rotation to camera
      camera3js.setRotationFromEuler(euler);

      // Notify NaviCube of camera change
      window.dispatchEvent(new CustomEvent('cameraChanged', {
        detail: { source: 'fps-rotation', rotation: camera3js.quaternion, position: camera3js.position }
      }));

      console.log('FPS rotation (degrees):', {
        x: euler.x * 180 / Math.PI,
        y: euler.y * 180 / Math.PI,
        z: euler.z * 180 / Math.PI,
        speedMultiplier: speedMultiplier,
        rotationStep: rotationStep
      });
    }
    
    console.log('===================================');
  };

  const zoomCamera = (direction: 'in' | 'out') => {
    if (!camera.controls?.camera) return;

    const currentZoom = camera.controls.camera.zoom;
    const zoomStep = 0.1;
    const newZoom = direction === 'in' ?
      currentZoom + zoomStep :
      Math.max(0.1, currentZoom - zoomStep);

    camera.controls.camera.zoom = newZoom;
    camera.controls.camera.updateProjectionMatrix();

    console.log(`=== FPS CAMERA ZOOM: ${direction.toUpperCase()} ===`);
    console.log('Zoom changed from', currentZoom, 'to', newZoom);
  };

  const resetCamera = async () => {
    if (!fpControls) {
      console.log('FPS controls not initialized');
      return;
    }

    console.log('=== RESETTING CAMERA TO DEFAULT ===');

    const camera3js = world.camera.three;

    // Get current projection mode to apply appropriate defaults
    try {
      const { getCurrentProjection } = await import('./ProjectionControls');
      const currentProjection = getCurrentProjection();
      
      if (currentProjection === "Perspective") {
        console.log('Applying perspective mode defaults with restrictions');
        // Reset to initial FPS position and orientation
        const defaultPosition = new THREE.Vector3(-1.29, 1.60, 1.14);
        const defaultLookAt = new THREE.Vector3(0, 1, 0);

        camera3js.position.copy(defaultPosition);
        // Check if camera state preservation is active before calling lookAt
        if (!(window as any).isCameraStateBeingPreserved || !(window as any).isCameraStateBeingPreserved()) {
          camera3js.lookAt(defaultLookAt);
        } else {
          console.log("🔒 Camera: Skipping lookAt during camera state preservation");
        }
        console.log('Perspective reset - Position:', defaultPosition, 'LookAt:', defaultLookAt);
      } else {
        console.log('Applying orthographic mode defaults - no restrictions');
        // Reset to orthographic-friendly defaults (allow free positioning)
        const defaultPosition = new THREE.Vector3(0, 5, 5); // Higher and more orthographic-appropriate
        const defaultLookAt = new THREE.Vector3(0, 0, 0);

        camera3js.position.copy(defaultPosition);
        // Check if camera state preservation is active before calling lookAt
        if (!(window as any).isCameraStateBeingPreserved || !(window as any).isCameraStateBeingPreserved()) {
          camera3js.lookAt(defaultLookAt);
        } else {
          console.log("🔒 Camera: Skipping lookAt during camera state preservation");
        }
        console.log('Orthographic reset - Position:', defaultPosition, 'LookAt:', defaultLookAt);
      }
    } catch (error) {
      console.warn('Could not determine projection mode, applying perspective defaults:', error);
      // Fallback to perspective defaults
      const defaultPosition = new THREE.Vector3(-1.29, 1.60, 1.14);
      const defaultLookAt = new THREE.Vector3(0, 1, 0);
      camera3js.position.copy(defaultPosition);
      // Check if camera state preservation is active before calling lookAt
      if (!(window as any).isCameraStateBeingPreserved || !(window as any).isCameraStateBeingPreserved()) {
        camera3js.lookAt(defaultLookAt);
      } else {
        console.log("🔒 Camera: Skipping lookAt during camera state preservation");
      }
    }

    // Reset zoom if available
    if (camera.controls?.camera) {
      camera.controls.camera.zoom = 1.0;
      camera.controls.camera.updateProjectionMatrix();
    }

    console.log('Camera reset completed');
    console.log('=====================================');
  };

  const toggleProjection = () => {
    if (camera instanceof OBC.OrthoPerspectiveCamera) {
      const current = camera.projection.current;
      camera.projection.set(current === "Perspective" ? "Orthographic" : "Perspective");
      console.log(`=== PROJECTION CHANGED TO: ${current === "Perspective" ? "Orthographic" : "Perspective"} ===`);
    }
  };

  // FPS preset functions
  const setTopView = () => {
    if (!fpControls) return;

    const camera3js = world.camera.three;
    const currentPos = camera3js.position.clone();

    // Move up and look down
    camera3js.position.set(currentPos.x, currentPos.y + 10, currentPos.z);
    // Check if camera state preservation is active before calling lookAt
    if (!(window as any).isCameraStateBeingPreserved || !(window as any).isCameraStateBeingPreserved()) {
      camera3js.lookAt(currentPos.x, currentPos.y, currentPos.z);
    } else {
      console.log("🔒 Camera: Skipping lookAt during camera state preservation");
    }

    console.log('=== FPS TOP VIEW SET ===');
    console.log('Position:', camera3js.position);
  };

  const setFrontView = () => {
    if (!fpControls) return;

    const camera3js = world.camera.three;
    const currentPos = camera3js.position.clone();

    // Look towards negative Z (front)
    // Check if camera state preservation is active before calling lookAt
    if (!(window as any).isCameraStateBeingPreserved || !(window as any).isCameraStateBeingPreserved()) {
      camera3js.lookAt(currentPos.x, currentPos.y, currentPos.z - 10);
    } else {
      console.log("🔒 Camera: Skipping lookAt during camera state preservation");
    }

    console.log('=== FPS FRONT VIEW SET ===');
  };

  const setSideView = () => {
    if (!fpControls) return;

    const camera3js = world.camera.three;
    const currentPos = camera3js.position.clone();

    // Look towards positive X (right side)
    // Check if camera state preservation is active before calling lookAt
    if (!(window as any).isCameraStateBeingPreserved || !(window as any).isCameraStateBeingPreserved()) {
      camera3js.lookAt(currentPos.x + 10, currentPos.y, currentPos.z);
    } else {
      console.log("🔒 Camera: Skipping lookAt during camera state preservation");
    }

    console.log('=== FPS SIDE VIEW SET ===');
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
            <bim-button icon="material-symbols:keyboard-arrow-left" @click=${() => moveCamera('left')} style="width: 30px; height: 30px;"></bim-button>
            <div></div>
            <bim-button icon="material-symbols:keyboard-arrow-down" @click=${() => moveCamera('backward')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:keyboard-arrow-right" @click=${() => moveCamera('right')} style="width: 30px; height: 30px;"></bim-button>            
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

        <!-- Zoom Controls -->
        <div style="display: flex; flex-direction: column; gap: 5px; margin: 10px 0; padding: 10px; border: 1px solid #333; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #ccc;">Zoom Controls</div>
          <div style="display: flex; gap: 5px;">
            <bim-button icon="material-symbols:zoom-in" @click=${() => zoomCamera('in')} style="width: 50%; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:zoom-out" @click=${() => zoomCamera('out')} style="width: 50%; height: 30px;"></bim-button>
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
