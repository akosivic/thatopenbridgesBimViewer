import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import i18n from "../../../utils/i18n";
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
        
        const newZoom = Math.max(0.01, Math.min(100, currentZoom + zoomDelta));
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
            
            // Trigger frustum update after zoom to prevent clipping
            if ((window as any).frustumManager) {
                (window as any).frustumManager.updateOrthographicFrustum();
            }
            
            return; // Exit early for orthographic up/down
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
        
        // Notify NaviCube of camera change
        window.dispatchEvent(new CustomEvent('cameraChanged', {
            detail: { source: 'camera-settings-movement', position: newPosition }
        }));
        
        console.log(`${currentProjection} mode - New position:`, newPosition);
    };

    // Rotation controls
    const rotationStep = 0.1; // radians for FPS rotation

    const rotateCamera = (direction: 'left' | 'right' | 'up' | 'down') => {
        if (!fpControls) {
            console.log('FPS controls not initialized');
            return;
        }

        const camera3js = world.camera.three;
        console.log(`=== FPS CAMERA ROTATION: ${direction.toUpperCase()} ===`);

        const euler = new THREE.Euler().setFromQuaternion(camera3js.quaternion, 'YXZ');
        
        // Get current projection mode to determine restrictions
        const currentProjection = getCurrentProjection();
        const isPerspective = currentProjection === "Perspective";

        switch (direction) {
            case 'left':
                euler.y -= rotationStep; // Rotate left (counter-clockwise around Y)
                break;
            case 'right':
                euler.y += rotationStep; // Rotate right (clockwise around Y)
                break;
            case 'up':
                if (isPerspective) {
                    // Perspective mode: Apply clamps to prevent flip
                    euler.x = Math.max(-Math.PI / 2 + 0.1, euler.x - rotationStep);
                } else {
                    // Orthographic mode: No restrictions, allow full rotation
                    euler.x -= rotationStep;
                }
                break;
            case 'down':
                if (isPerspective) {
                    // Perspective mode: Apply clamps to prevent flip
                    euler.x = Math.min(Math.PI / 2 - 0.1, euler.x + rotationStep);
                } else {
                    // Orthographic mode: No restrictions, allow full rotation
                    euler.x += rotationStep;
                }
                break;
        }

        // Apply rotation to camera
        camera3js.setRotationFromEuler(euler);

        // Notify NaviCube of camera change
        window.dispatchEvent(new CustomEvent('cameraChanged', {
            detail: { source: 'camera-settings-rotation', rotation: camera3js.quaternion, position: camera3js.position }
        }));

        console.log(`${currentProjection} mode - New rotation (degrees):`, {
            x: euler.x * 180 / Math.PI,
            y: euler.y * 180 / Math.PI,
            z: euler.z * 180 / Math.PI
        });
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
        // Initialize projection controls component
        const projectionControlsComponent = projectionControls(world);
        
        return BUI.html`
      <bim-toolbar-section label="${t('cameraSettings')}" icon="ph:camera-fill" style="pointer-events: auto">
        <!-- Projection Controls (Always visible) -->
        ${projectionControlsComponent}
        
        <!-- Horizontal Container for all control sections -->
        <div style="display: flex; gap: 10px; margin: 10px 0; align-items: flex-start;">
          
          <!-- Position Controls (Left) -->
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 10px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); flex: 1;">
            <div style="font-size: 12px; font-weight: bold; color: #ccc; text-align: center;">${t('positionControls')}</div>
            <!-- Horizontal Movement -->
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto auto; gap: 2px; align-items: center;">
              <div></div>
              <bim-button 
                icon="material-symbols:keyboard-arrow-up" 
                @mousedown=${() => startContinuousMovement('forward')} 
                @mouseup=${stopContinuousMovement}
                @mouseleave=${stopContinuousMovement}
                style="width: 30px; height: 30px;" 
                title="${t('moveForward')}">
              </bim-button>
              <div></div>
              <bim-button 
                icon="material-symbols:keyboard-arrow-left" 
                @mousedown=${() => startContinuousMovement('left')} 
                @mouseup=${stopContinuousMovement}
                @mouseleave=${stopContinuousMovement}
                style="width: 30px; height: 30px;" 
                title="${t('moveLeft')}">
              </bim-button>
              <bim-button 
                icon="material-symbols:keyboard-arrow-down" 
                @mousedown=${() => startContinuousMovement('backward')} 
                @mouseup=${stopContinuousMovement}
                @mouseleave=${stopContinuousMovement}
                style="width: 30px; height: 30px;" 
                title="${t('moveBackward')}">
              </bim-button>
              <bim-button 
                icon="material-symbols:keyboard-arrow-right" 
                @mousedown=${() => startContinuousMovement('right')} 
                @mouseup=${stopContinuousMovement}
                @mouseleave=${stopContinuousMovement}
                style="width: 30px; height: 30px;" 
                title="${t('moveRight')}"
              </bim-button>
            </div>
          </div>

          <!-- Movement Speed (Middle) -->
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 10px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); flex: 1;">
            <div style="font-size: 12px; font-weight: bold; color: #ccc; text-align: center;">${t('movementSpeed')}</div>
            <div style="display: flex; gap: 8px; justify-content: center;">
              <button 
                class="camera-speed-button"
                data-speed="1"
                onclick="window.setCameraSpeed(1)"
                title="${t('normalSpeed')}"
                style="
                  background: #6528d7;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  padding: 6px 12px;
                  font-weight: 600;
                  min-width: 40px;
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
                  border-radius: 4px;
                  padding: 6px 12px;
                  font-weight: 600;
                  min-width: 40px;
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
                  border-radius: 4px;
                  padding: 6px 12px;
                  font-weight: 600;
                  min-width: 40px;
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
              margin-top: 4px;
            " id="camera-speed-display">
              ${t('currentSpeed', { speed: 1 })}
            </div>
          </div>

          <!-- Rotation Controls (Right) -->
          <div style="display: flex; flex-direction: column; gap: 5px; padding: 10px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); flex: 1;">
            <div style="font-size: 12px; font-weight: bold; color: #ccc; text-align: center;">${t('rotationControls')}</div>
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto; gap: 2px; align-items: center;">
              <div></div>
              <bim-button 
                icon="material-symbols:keyboard-arrow-up" 
                @mousedown=${() => startContinuousRotation('down')} 
                @mouseup=${stopContinuousRotation}
                @mouseleave=${stopContinuousRotation}
                style="width: 30px; height: 30px;" 
                title="${t('lookUp')}">
              </bim-button>
              <div></div>
              
              <bim-button 
                icon="material-symbols:keyboard-arrow-left" 
                @mousedown=${() => startContinuousRotation('right')} 
                @mouseup=${stopContinuousRotation}
                @mouseleave=${stopContinuousRotation}
                style="width: 30px; height: 30px;" 
                title="${t('turnLeft')}">
              </bim-button>
              <bim-button 
                icon="material-symbols:keyboard-arrow-down" 
                @mousedown=${() => startContinuousRotation('up')} 
                @mouseup=${stopContinuousRotation}
                @mouseleave=${stopContinuousRotation}
                style="width: 30px; height: 30px;" 
                title="${t('lookDown')}">
              </bim-button>
              <bim-button 
                icon="material-symbols:keyboard-arrow-right" 
                @mousedown=${() => startContinuousRotation('left')} 
                @mouseup=${stopContinuousRotation}
                @mouseleave=${stopContinuousRotation}
                style="width: 30px; height: 30px;" 
                title="${t('turnRight')}">
              </bim-button>
            </div>
          </div>
          
        </div>
      </bim-toolbar-section>
    `;
    });

    return component;
};