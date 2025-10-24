import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import i18n from "../../../utils/i18n";
// Projection controls restored
import projectionControls from "./ProjectionControls";
import { getCurrentProjection } from "./ProjectionControls";

// Global reference to FPS controls - will be set from WorldViewer
export let fpControls: PointerLockControls | null = null;
export const setFPControls = (controls: PointerLockControls | null) => {
    fpControls = controls;
};

// Global variables to track speed
let baseSpeed = 5.0; // Default base speed from WorldViewer
let currentMultiplier = 1; // Current speed multiplier

// Function to set the base speed from WorldViewer
export const setBaseSpeed = (speed: number) => {
    baseSpeed = speed;
    console.log(`Base speed set to: ${speed}`);
};

// Function to get current effective speed
export const getCurrentSpeed = () => baseSpeed * currentMultiplier;

export default (world: OBC.World) => {

    // Variables for continuous movement
    let movementInterval: number | null = null;
    let rotationInterval: number | null = null;
    const movementIntervalMs = 50; // 20 FPS for smooth movement

    // Calculate movement step to match keyboard movement speed
    // Keyboard: moveDistance = moveSpeed * 0.016 (per frame at 60fps)
    // Button: should move same distance per button interval (50ms)
    // So: button movement = (moveSpeed * 0.016) * (50ms / 16.67ms) = moveSpeed * 0.048
    const getMovementStep = () => {
        // Get the base speed (5.0) and multiply by current multiplier, then by interval ratio
        const keyboardFrameDistance = baseSpeed * 0.016; // Per keyboard frame
        const buttonIntervalRatio = movementIntervalMs / 16.67; // Our interval vs keyboard frame time
        return keyboardFrameDistance * buttonIntervalRatio * currentMultiplier;
    };

    // Helper functions for continuous movement
    const startContinuousMovement = (direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down') => {
        stopContinuousMovement();
        moveCamera(direction); // Move immediately
        movementInterval = window.setInterval(() => {
            moveCamera(direction);
        }, movementIntervalMs);
    };

    const stopContinuousMovement = () => {
        if (movementInterval) {
            clearInterval(movementInterval);
            movementInterval = null;
        }
    };

    const startContinuousRotation = (direction: 'left' | 'right' | 'up' | 'down') => {
        stopContinuousRotation();
        rotateCamera(direction); // Rotate immediately
        rotationInterval = window.setInterval(() => {
            rotateCamera(direction);
        }, movementIntervalMs);
    };

    const stopContinuousRotation = () => {
        if (rotationInterval) {
            clearInterval(rotationInterval);
            rotationInterval = null;
        }
    };

    // Global event listeners to stop continuous movement/rotation when mouse is released anywhere
    const stopAllContinuous = () => {
        stopContinuousMovement();
        stopContinuousRotation();
    };

    // Add global mouse up listener to ensure movement stops even if mouse is released outside button
    document.addEventListener('mouseup', stopAllContinuous);
    document.addEventListener('dragend', stopAllContinuous);

    // Cleanup function (though this component may not be unmounted)
    const cleanup = () => {
        document.removeEventListener('mouseup', stopAllContinuous);
        document.removeEventListener('dragend', stopAllContinuous);
        stopAllContinuous();
    };

    // Store cleanup function for potential future use
    (window as any).cleanupCameraControls = cleanup;

    // Helper function copied from EnhancedKeyboardControls.ts
    const zoomOrthographicCamera = (direction: number) => {
        if (!world?.camera || !(world.camera instanceof OBC.OrthoPerspectiveCamera)) return;

        // Get current speed multiplier from camera settings
        const currentSpeed = getCurrentSpeed();
        const speedMultiplier = currentSpeed / baseSpeed; // Normalize against base speed

        // Apply speed to zoom
        const baseZoomSpeed = 0.1;
        const adjustedZoomSpeed = baseZoomSpeed * speedMultiplier;

        const currentZoom = (world.camera.three as THREE.OrthographicCamera).zoom || 1;
        const zoomDelta = direction * adjustedZoomSpeed;

        const newZoom = Math.max(0.001, Math.min(100, currentZoom + zoomDelta)); // Reduced from 0.01 to 0.001
        (world.camera.three as THREE.OrthographicCamera).zoom = newZoom;
        world.camera.three.updateProjectionMatrix();

        console.log('Orthographic UI zoom (speed x' + speedMultiplier.toFixed(1) + '):', newZoom);
    };

    const moveCamera = (direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down') => {
        if (!fpControls) {
            console.log('FPS controls not initialized');
            return;
        }

        const camera3js = world.camera.three;
        const currentPos = camera3js.position.clone();

        console.log(`=== UI CAMERA MOVEMENT: ${direction.toUpperCase()} ===`);
        console.log('Current position:', currentPos);

        // Get current projection mode to determine movement behavior
        const currentProjection = getCurrentProjection();
        const isPerspective = currentProjection === "Perspective";
        const isOrthographic = currentProjection === "Orthographic";

        let newPosition = currentPos.clone();

        // For up/down movement in orthographic mode, use zoom behavior like arrow keys
        if (isOrthographic && (direction === 'up' || direction === 'down')) {
            // Copy exact implementation from EnhancedKeyboardControls.ts arrow key behavior
            // In orthographic mode: Up arrow = zoom in, Down arrow = zoom out

            if (direction === 'up') {
                // Exact copy: zoomOrthographicCamera(1); // Zoom in
                zoomOrthographicCamera(1);
                console.log('Orthographic UP button - Zoom IN (like up arrow)');
            } else {
                // Exact copy: zoomOrthographicCamera(-1); // Zoom out  
                zoomOrthographicCamera(-1);
                console.log('Orthographic DOWN button - Zoom OUT (like down arrow)');
            }

            // DISABLED: Frustum manager updates removed - using static clipping planes
            // Trigger frustum update after zoom to prevent clipping
            // if ((window as any).frustumManager) {
            //     (window as any).frustumManager.updateOrthographicFrustum();
            // }

            return; // Exit early for orthographic up/down
        }

        // For forward/backward movement in orthographic mode, use zoom behavior
        if (isOrthographic && (direction === 'forward' || direction === 'backward')) {
            // Forward = zoom in, Backward = zoom out (like the zoom buttons)

            if (direction === 'forward') {
                zoomOrthographicCamera(1); // Zoom in
                console.log('Orthographic FORWARD button - Zoom IN (like zoom in button)');
            } else {
                zoomOrthographicCamera(-1); // Zoom out
                console.log('Orthographic BACKWARD button - Zoom OUT (like zoom out button)');
            }

            return; // Exit early for orthographic forward/backward
        }

        // For all other movements, use the existing logic
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);

        camera3js.getWorldDirection(forward);
        forward.normalize();
        right.crossVectors(forward, up).normalize();

        // Calculate movement amount to match keyboard movement speed
        const movementAmount = getMovementStep();

        switch (direction) {
            case 'forward':
                newPosition.add(forward.multiplyScalar(movementAmount));
                break;
            case 'backward':
                newPosition.add(forward.multiplyScalar(-movementAmount));
                break;
            case 'left':
                newPosition.add(right.multiplyScalar(-movementAmount));
                break;
            case 'right':
                newPosition.add(right.multiplyScalar(movementAmount));
                break;
            case 'up':
                newPosition.y += movementAmount;
                break;
            case 'down':
                newPosition.y -= movementAmount;
                break;
        }

        // Apply restrictions only in perspective mode
        if (isPerspective) {
            // Only clamp Y position for explicit up/down movement, not for horizontal movement
            // This allows the WorldViewer Y lock (1.6m) to work for horizontal movement
            if (direction === 'up' || direction === 'down') {
                newPosition.y = Math.max(0.1, newPosition.y);
            }
        }
        // In orthographic mode: No restrictions, allow free movement in all directions

        camera3js.position.copy(newPosition);

        // Get current projection mode for NaviCube filtering
        const projectionMode = camera3js.type === 'OrthographicCamera' ? 'orthographic' : 'perspective';

        // Notify NaviCube of camera change with movement type information
        window.dispatchEvent(new CustomEvent('cameraChanged', {
            detail: {
                source: 'camera-settings-movement',
                position: newPosition,
                movementType: 'position-movement', // This is position movement (left/right/up/down/forward/backward)
                projectionMode: projectionMode      // Include projection mode for filtering
            }
        }));

        console.log(`${currentProjection} mode - New position:`, newPosition);
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

    // Rotation controls - Mode-specific behavior
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
            console.log(`Using speed multiplier: ${currentMultiplier} (base step: 0.2, adjusted step: ${0.2 * currentMultiplier})`);

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
            const rotationStep = baseRotationStep * currentMultiplier;

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

            // Notify NaviCube of camera change with rotation movement type
            window.dispatchEvent(new CustomEvent('cameraChanged', {
                detail: {
                    source: 'camera-settings-orbit-rotation',
                    rotation: camera3js.quaternion,
                    position: camera3js.position,
                    movementType: 'rotation-movement', // This is rotation movement (orbit controls)
                    projectionMode: currentProjection
                }
            }));

            console.log('Orbit rotation:', {
                direction,
                theta: spherical.theta * 180 / Math.PI,
                phi: spherical.phi * 180 / Math.PI,
                position: camera3js.position,
                target: target,
                speedMultiplier: currentMultiplier,
                rotationStep: rotationStep
            });
        } else {
            // PERSPECTIVE MODE: Use FPS-style rotation (original behavior)
            console.log(`=== FPS CAMERA ROTATION (PERSPECTIVE): ${direction.toUpperCase()} ===`);
            console.log(`Using speed multiplier: ${currentMultiplier} (base step: 0.1, adjusted step: ${0.1 * currentMultiplier})`);

            /*
             * FPS ROTATION SYSTEM:
             * 
             * Uses Euler angles for direct camera rotation.
             * Rotation is applied relative to current camera orientation.
             */

            const euler = new THREE.Euler().setFromQuaternion(camera3js.quaternion, 'YXZ');
            // Apply speed multiplier to rotation step  
            const baseRotationStep = 0.1; // Base radians for FPS rotation
            const rotationStep = baseRotationStep * currentMultiplier;

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

            // Notify NaviCube of camera change with rotation movement type
            window.dispatchEvent(new CustomEvent('cameraChanged', {
                detail: {
                    source: 'camera-settings-fps-rotation',
                    rotation: camera3js.quaternion,
                    position: camera3js.position,
                    movementType: 'rotation-movement', // FPS rotation changes view direction
                    projectionMode: currentProjection
                }
            }));

            console.log('FPS rotation (degrees):', {
                x: euler.x * 180 / Math.PI,
                y: euler.y * 180 / Math.PI,
                z: euler.z * 180 / Math.PI,
                speedMultiplier: currentMultiplier,
                rotationStep: rotationStep
            });
        }
    };


    // Speed control functions
    const setSpeed = (multiplier: number) => {
        console.log(`🎯 Setting movement speed multiplier to: x${multiplier}`);
        currentMultiplier = multiplier;
        const effectiveSpeed = getCurrentSpeed();

        // Dispatch custom event to update WorldViewer moveSpeed
        const speedChangeEvent = new CustomEvent('moveSpeedChange', {
            detail: {
                multiplier: multiplier,
                baseSpeed: baseSpeed,
                effectiveSpeed: effectiveSpeed
            }
        });
        window.dispatchEvent(speedChangeEvent);

        // Update button states
        const speedButtons = document.querySelectorAll('.camera-speed-button');
        speedButtons.forEach((button: any) => {
            const buttonSpeed = parseInt(button.dataset.speed);
            if (buttonSpeed === multiplier) {
                button.style.background = '#6528d7';
            } else {
                button.style.background = 'rgba(255, 255, 255, 0.2)';
            }
        });

        // Update display with a small delay to ensure DOM is ready
        setTimeout(() => {
            const display = document.getElementById('camera-speed-display');
            if (display) {
                display.textContent = `Current: x${multiplier}`;
                console.log(`Updated display to: Current: x${multiplier}`);
            } else {
                console.warn('camera-speed-display element not found');
            }
        }, 10);
    };

    // Set up global function for speed control access
    (window as any).setCameraSpeed = setSpeed;

    // Initialize display to show current speed when component loads
    const initializeSpeedDisplay = () => {
        setTimeout(() => {
            const display = document.getElementById('camera-speed-display');
            if (display) {
                display.textContent = `Current: x${currentMultiplier}`;
                console.log(`Initialized speed display to: Current: x${currentMultiplier}`);
            }
        }, 50); // Slightly longer delay to ensure DOM is fully rendered
    };

    const component = BUI.Component.create<BUI.PanelSection>(() => {
        const t = (key: string, options?: any) => i18n.t(key, options);

        // Call initialization after component is rendered
        setTimeout(initializeSpeedDisplay, 100);
        // Projection controls restored
        // Initialize projection controls component
        const projectionControlsComponent = projectionControls(world);

        return BUI.html`
      <bim-toolbar-section label="${t('cameraSettings')}" icon="ph:camera-fill" style="pointer-events: auto">
        
        <!-- Grid Container for all control sections -->
        <div style="
          display: grid; 
          grid-template-columns: repeat(4, 1fr); 
          gap: 10px; 
          margin: 10px 0; 
          align-items: stretch;
          min-height: 120px;
        ">
          <!-- Projection Controls Section -->
          ${projectionControlsComponent}
          <!-- Position Controls -->
          <div style="
            display: flex; 
            flex-direction: column; 
            gap: 8px; 
            padding: 12px; 
            border: 1px solid rgba(255, 255, 255, 0.2); 
            border-radius: 6px; 
            background: rgba(0, 0, 0, 0.6); 
            backdrop-filter: blur(4px);
            min-height: 120px;
            justify-content: space-between;
          ">
            <div style="font-size: 12px; font-weight: bold; color: #ccc; text-align: center;">${t('positionControls')}</div>
            <!-- Movement Grid -->
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto auto; gap: 3px; align-items: center; flex: 1; align-content: center;">
              <div></div>
              <bim-button 
                icon="material-symbols:keyboard-arrow-up" 
                @mousedown=${() => startContinuousMovement('forward')} 
                @mouseup=${stopContinuousMovement}
                @mouseleave=${stopContinuousMovement}
                style="width: 32px; height: 32px;" 
                title="${t('moveForward')}">
              </bim-button>
              <div></div>
              <bim-button 
                icon="material-symbols:keyboard-arrow-left" 
                @mousedown=${() => startContinuousMovement('left')} 
                @mouseup=${stopContinuousMovement}
                @mouseleave=${stopContinuousMovement}
                style="width: 32px; height: 32px;" 
                title="${t('moveLeft')}">
              </bim-button>
              <bim-button 
                icon="material-symbols:keyboard-arrow-down" 
                @mousedown=${() => startContinuousMovement('backward')} 
                @mouseup=${stopContinuousMovement}
                @mouseleave=${stopContinuousMovement}
                style="width: 32px; height: 32px;" 
                title="${t('moveBackward')}">
              </bim-button>
              <bim-button 
                icon="material-symbols:keyboard-arrow-right" 
                @mousedown=${() => startContinuousMovement('right')} 
                @mouseup=${stopContinuousMovement}
                @mouseleave=${stopContinuousMovement}
                style="width: 32px; height: 32px;" 
                title="${t('moveRight')}"
              </bim-button>
            </div>
          </div>

          <!-- Movement Speed -->
          <div style="
            display: flex; 
            flex-direction: column; 
            gap: 8px; 
            padding: 12px; 
            border: 1px solid rgba(255, 255, 255, 0.2); 
            border-radius: 6px; 
            background: rgba(0, 0, 0, 0.6); 
            backdrop-filter: blur(4px);
            min-height: 120px;
            justify-content: space-between;
          ">
            <div style="font-size: 12px; font-weight: bold; color: #ccc; text-align: center;">${t('movementSpeed')}</div>
            <div style="display: flex; gap: 6px; justify-content: center; flex: 1; align-items: center;">
              <button 
                class="camera-speed-button"
                data-speed="1"
                onclick="window.setCameraSpeed(1)"
                title="${t('normalSpeed')}"
                style="
                  background: #6528d7;
                  color: white;
                  border: none;
                  border-radius: 6px;
                  padding: 8px 12px;
                  font-weight: 600;
                  min-width: 42px;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  font-size: 11px;
                ">
                x1
              </button>
              <button 
                class="camera-speed-button"
                data-speed="2"
                onclick="window.setCameraSpeed(2)"
                title="${t('doubleSpeed')}"
                style="
                  background: rgba(255, 255, 255, 0.2);
                  color: white;
                  border: none;
                  border-radius: 6px;
                  padding: 8px 12px;
                  font-weight: 600;
                  min-width: 42px;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  font-size: 11px;
                ">
                x2
              </button>
              <button 
                class="camera-speed-button"
                data-speed="3"
                onclick="window.setCameraSpeed(3)"
                title="${t('tripleSpeed')}"
                style="
                  background: rgba(255, 255, 255, 0.2);
                  color: white;
                  border: none;
                  border-radius: 6px;
                  padding: 8px 12px;
                  font-weight: 600;
                  min-width: 42px;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  font-size: 11px;
                ">
                x3
              </button>
            </div>
            <div style="
              font-size: 10px;
              color: rgba(255, 255, 255, 0.7);
              text-align: center;
            " id="camera-speed-display">
              ${t('currentSpeed', { speed: 1 })}
            </div>
          </div>

          <!-- Rotation Controls -->
          <div style="
            display: flex; 
            flex-direction: column; 
            gap: 8px; 
            padding: 12px; 
            border: 1px solid rgba(255, 255, 255, 0.2); 
            border-radius: 6px; 
            background: rgba(0, 0, 0, 0.6); 
            backdrop-filter: blur(4px);
            min-height: 120px;
            justify-content: space-between;
          ">
            <div style="font-size: 12px; font-weight: bold; color: #ccc; text-align: center;">${t('rotationControls')}</div>
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto; gap: 3px; align-items: center; flex: 1; align-content: center;">
              <div></div>
              <bim-button 
                icon="material-symbols:keyboard-arrow-up" 
                @mousedown=${() => startContinuousRotation('down')} 
                @mouseup=${stopContinuousRotation}
                @mouseleave=${stopContinuousRotation}
                style="width: 32px; height: 32px;" 
                title="${t('lookUp')}">
              </bim-button>
              <div></div>
              
              <bim-button 
                icon="material-symbols:keyboard-arrow-left" 
                @mousedown=${() => startContinuousRotation('right')} 
                @mouseup=${stopContinuousRotation}
                @mouseleave=${stopContinuousRotation}
                style="width: 32px; height: 32px;" 
                title="${t('turnLeft')}">
              </bim-button>
              <bim-button 
                icon="material-symbols:keyboard-arrow-down" 
                @mousedown=${() => startContinuousRotation('up')} 
                @mouseup=${stopContinuousRotation}
                @mouseleave=${stopContinuousRotation}
                style="width: 32px; height: 32px;" 
                title="${t('lookDown')}">
              </bim-button>
              <bim-button 
                icon="material-symbols:keyboard-arrow-right" 
                @mousedown=${() => startContinuousRotation('left')} 
                @mouseup=${stopContinuousRotation}
                @mouseleave=${stopContinuousRotation}
                style="width: 32px; height: 32px;" 
                title="${t('turnRight')}">
              </bim-button>
            </div>
          </div>
          
        </div>
        
        <style>
          .camera-speed-button.active {
            background: #6528d7 !important;
            transform: scale(1.05);
          }
          .camera-speed-button:hover {
            background: rgba(255, 255, 255, 0.3) !important;
            transform: scale(1.02);
          }
          .camera-speed-button.active:hover {
            background: #7c3aed !important;
          }
          bim-button:hover {
            transform: scale(1.05);
            transition: transform 0.2s ease;
          }
        </style>

        
      </bim-toolbar-section>
    `;
    });

    return component;
};