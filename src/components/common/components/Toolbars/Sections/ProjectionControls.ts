import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import i18n from "../../../utils/i18n";

// Global reference to FPS controls and current projection mode
export let fpControls: PointerLockControls | null = null;
export let currentProjection: "Perspective" | "Orthographic" = "Orthographic";

export const setFPControls = (controls: PointerLockControls | null) => {
    fpControls = controls;
};

export const getCurrentProjection = () => currentProjection;

// Different key bindings for different modes
interface KeyBindings {
    forward: string[];
    backward: string[];
    left: string[];
    right: string[];
    up: string[];
    down: string[];
    rotateLeft: string[];
    rotateRight: string[];
    rotateUp: string[];
    rotateDown: string[];
    zoom: string[];
    pan: string[];
    // New orthographic-specific bindings
    zoomIn?: string[];
    zoomOut?: string[];
    panLeft?: string[];
    panRight?: string[];
    rotate?: string[];
}

// Perspective mode: First-person style controls
const perspectiveBindings: KeyBindings = {
    forward: ["ArrowUp", "KeyW"],
    backward: ["ArrowDown", "KeyS"], 
    left: ["ArrowLeft", "KeyA"],
    right: ["ArrowRight", "KeyD"],
    up: ["KeyQ"],
    down: ["KeyE"],
    rotateLeft: ["Mouse Move Left"],
    rotateRight: ["Mouse Move Right"],
    rotateUp: ["Mouse Move Up"],
    rotateDown: ["Mouse Move Down"],
    zoom: ["Mouse Wheel"],
    pan: ["Middle Mouse Button"]
};

// Orthographic mode: New CAD-style controls with mouse integration
const orthographicBindings: KeyBindings = {
    forward: ["KeyW"],
    backward: ["KeyS"],
    left: ["KeyA"], 
    right: ["KeyD"],
    up: ["KeyQ"],
    down: ["KeyE"],
    zoomIn: ["ArrowUp"],
    zoomOut: ["ArrowDown"],
    panLeft: ["ArrowLeft"],
    panRight: ["ArrowRight"],
    rotateLeft: ["Ctrl + Arrow Left"],
    rotateRight: ["Ctrl + Arrow Right"],
    rotateUp: ["Ctrl + Arrow Up"],
    rotateDown: ["Ctrl + Arrow Down"],
    zoom: ["Mouse Wheel"],
    pan: ["Middle Mouse Button"],
    rotate: ["Left Mouse Button"]
};

export default (world: OBC.World) => {
    const { camera } = world;

    const updateProjectionDisplay = () => {
        const buttons = document.querySelectorAll('.projection-mode-button');
        buttons.forEach(button => {
            const isPerspective = button.getAttribute('data-mode') === 'Perspective';
            if (isPerspective) {
                button.classList.toggle('active', currentProjection === 'Perspective');
            } else {
                button.classList.toggle('active', currentProjection === 'Orthographic');
            }
        });

        // Update current mode display
        const modeDisplay = document.getElementById('current-projection-mode');
        if (modeDisplay) {
            const t = (key: string) => i18n.t(key);
            modeDisplay.textContent = t(currentProjection.toLowerCase());
        }
    };

    const dispatchProjectionChangeEvent = () => {
        const event = new CustomEvent('projectionChanged', { 
            detail: { 
                mode: currentProjection,
                perspectiveBindings: currentProjection === "Perspective" ? perspectiveBindings : null,
                orthographicBindings: currentProjection === "Orthographic" ? orthographicBindings : null
            }
        });
        window.dispatchEvent(event);
    };

    // Camera position memory for seamless transitions (only store position, always use current model center as target)
    const cameraMemory = {
        perspective: null as { position: THREE.Vector3; up: THREE.Vector3; quaternion: THREE.Quaternion } | null,
        orthographic: null as { position: THREE.Vector3; up: THREE.Vector3; quaternion: THREE.Quaternion } | null,
        isFirstTimeOrthographic: true,
        isFirstTimePerspective: true
    };

    // Helper function to get current camera target (where camera is looking)
    const getCurrentCameraTarget = (camera: THREE.Camera): THREE.Vector3 => {
        // Use model center as the target for more consistent view switching
        if (world.meshes.size > 0) {
            const bbox = new THREE.Box3();
            world.meshes.forEach(mesh => {
                bbox.expandByObject(mesh);
            });
            
            if (!bbox.isEmpty()) {
                const modelCenter = bbox.getCenter(new THREE.Vector3());
                console.log("Using model center as camera target:", modelCenter);
                return modelCenter;
            }
        }
        
        // Fallback: use camera direction with reasonable distance
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        const distance = 10; // Reasonable distance for target calculation
        const fallbackTarget = camera.position.clone().add(direction.multiplyScalar(distance));
        console.log("Using fallback camera target:", fallbackTarget);
        return fallbackTarget;
    };

    const setProjectionMode = (mode: "Perspective" | "Orthographic") => {
        if (camera instanceof OBC.OrthoPerspectiveCamera && mode !== currentProjection) {
            const previousMode = currentProjection;
            const camera3js = world.camera.three;
            
            // Store current camera state before switching (ENHANCED DEBUGGING)
            const currentPosition = camera3js.position.clone();
            const currentUp = camera3js.up.clone();
            const currentQuaternion = camera3js.quaternion.clone();
            const currentTarget = getCurrentCameraTarget(camera3js);
            
            // Get current camera direction for debugging
            const currentDirection = new THREE.Vector3();
            camera3js.getWorldDirection(currentDirection);
            
            console.log("=== COMPREHENSIVE CAMERA STATE DEBUGGING ===");
            console.log(`BEFORE SWITCHING: ${previousMode} → ${mode}`);
            console.log("Current camera position:", currentPosition);
            console.log("Current camera up vector:", currentUp);
            console.log("Current camera quaternion:", currentQuaternion);
            console.log("Current camera direction:", currentDirection);
            console.log("Current target (model center):", currentTarget);
            console.log("Distance to target:", currentPosition.distanceTo(currentTarget));
            
            // Save current position to memory (target is always calculated as current model center)
            if (previousMode === "Perspective") {
                cameraMemory.perspective = { 
                    position: currentPosition,
                    up: currentUp.clone(),
                    quaternion: currentQuaternion.clone()
                };
                console.log("Saved perspective camera state to memory");
            } else {
                cameraMemory.orthographic = { 
                    position: currentPosition,
                    up: currentUp.clone(),
                    quaternion: currentQuaternion.clone()
                };
                console.log("Saved orthographic camera state to memory");
            }
            
            // Switch projection mode
            camera.projection.set(mode);
            currentProjection = mode;
            
            console.log(`=== SWITCHING TO ${mode.toUpperCase()} MODE ===`);
            
            // Apply mode-specific camera positioning
            if (mode === "Orthographic") {
                
                // Always use current model center as target for consistent view
                const newTarget = currentTarget.clone();
                
                if (cameraMemory.orthographic && !cameraMemory.isFirstTimeOrthographic) {
                    // Restore complete previous orthographic camera state
                    console.log("Restoring complete orthographic camera state");
                    camera3js.position.copy(cameraMemory.orthographic.position);
                    camera3js.up.copy(cameraMemory.orthographic.up);
                    camera3js.quaternion.copy(cameraMemory.orthographic.quaternion);
                    camera3js.updateMatrixWorld();
                    console.log("Complete camera state restored - no orientation override");
                } else {
                    // First time orthographic: preserve complete current camera state
                    console.log("First time orthographic: preserving complete camera orientation");
                    console.log("Preserving current position and rotation without lookAt override");
                    // Don't call lookAt - preserve the current camera transformation completely
                    cameraMemory.isFirstTimeOrthographic = false;
                }
                
                // DETAILED POST-SWITCH DEBUGGING FOR ORTHOGRAPHIC
                const newDirection = new THREE.Vector3();
                camera3js.getWorldDirection(newDirection);
                const newUp = camera3js.up.clone();
                const newQuaternion = camera3js.quaternion.clone();
                const toTarget = newTarget.clone().sub(camera3js.position).normalize();
                const directionDotProduct = newDirection.dot(toTarget);
                
                console.log("=== AFTER ORTHOGRAPHIC SWITCH ===");
                console.log("Orthographic camera state restored - Option 2: Auto-correct enabled");
                console.log("Camera now at:", camera3js.position, "with preserved orientation");
                console.log("New camera direction:", newDirection);
                console.log("New camera up vector:", newUp);
                console.log("New camera quaternion:", newQuaternion);
                console.log("Direction to target:", toTarget);
                console.log("Camera direction dot product with target direction:", directionDotProduct);
                console.log("Is camera looking toward target?", directionDotProduct > 0);
                
                if (directionDotProduct < 0) {
                    console.warn("⚠️  WARNING: Camera appears to be looking AWAY from target!");
                    console.warn("Dot product:", directionDotProduct, "- Auto-correcting to face model center (Option 2)");
                    
                    console.log("🔧 Auto-correcting camera to look toward model center...");
                    camera3js.lookAt(newTarget);
                    camera3js.updateMatrixWorld();
                    
                    const correctedDirection = new THREE.Vector3();
                    camera3js.getWorldDirection(correctedDirection);
                    const correctedDotProduct = correctedDirection.dot(toTarget);
                    console.log("✅ Corrected camera direction:", correctedDirection);
                    console.log("✅ Corrected dot product:", correctedDotProduct);
                    console.log("✅ Camera now facing model center");
                }
                
                // Reset zoom to default for orthographic
                if (camera.controls?.camera) {
                    camera.controls.camera.zoom = 1.0;
                    camera.controls.camera.updateProjectionMatrix();
                    console.log("Zoom reset to 1.0 for orthographic mode");
                }
                
            } else if (mode === "Perspective") {
                
                // Always use current model center as target for consistent view
                const newTarget = currentTarget.clone();
                
                if (cameraMemory.perspective && !cameraMemory.isFirstTimePerspective) {
                    // Restore complete previous perspective camera state
                    console.log("Restoring complete perspective camera state");
                    camera3js.position.copy(cameraMemory.perspective.position);
                    camera3js.up.copy(cameraMemory.perspective.up);
                    camera3js.quaternion.copy(cameraMemory.perspective.quaternion);
                    camera3js.updateMatrixWorld();
                    console.log("Complete camera state restored - no orientation override");
                } else {
                    // First time perspective: preserve complete current camera state
                    console.log("Seamless transition to perspective mode");
                    console.log("Preserving complete camera orientation without lookAt override");
                    // Don't call lookAt - preserve the current camera transformation completely
                    cameraMemory.isFirstTimePerspective = false;
                }
                
                // DETAILED POST-SWITCH DEBUGGING FOR PERSPECTIVE
                const newDirection = new THREE.Vector3();
                camera3js.getWorldDirection(newDirection);
                const newUp = camera3js.up.clone();
                const newQuaternion = camera3js.quaternion.clone();
                const toTarget = newTarget.clone().sub(camera3js.position).normalize();
                const directionDotProduct = newDirection.dot(toTarget);
                
                console.log("=== AFTER PERSPECTIVE SWITCH ===");
                console.log("Perspective camera state restored - Option 2: Auto-correct enabled");
                console.log("Camera now at:", camera3js.position, "with preserved orientation");
                console.log("New camera direction:", newDirection);
                console.log("New camera up vector:", newUp);
                console.log("New camera quaternion:", newQuaternion);
                console.log("Direction to target:", toTarget);
                console.log("Camera direction dot product with target direction:", directionDotProduct);
                console.log("Is camera looking toward target?", directionDotProduct > 0);
                
                if (directionDotProduct < 0) {
                    console.warn("⚠️  WARNING: Camera appears to be looking AWAY from target!");
                    console.warn("Dot product:", directionDotProduct, "- Auto-correcting to face model center (Option 2)");
                    
                    console.log("🔧 Auto-correcting camera to look toward model center...");
                    camera3js.lookAt(newTarget);
                    camera3js.updateMatrixWorld();
                    
                    const correctedDirection = new THREE.Vector3();
                    camera3js.getWorldDirection(correctedDirection);
                    const correctedDotProduct = correctedDirection.dot(toTarget);
                    console.log("✅ Corrected camera direction:", correctedDirection);
                    console.log("✅ Corrected dot product:", correctedDotProduct);
                    console.log("✅ Camera now facing model center");
                }
            }
            
            // Update NaviCube to reflect current view (without forcing specific orientations)
            setTimeout(() => {
                // Dispatch camera change event to update NaviCube naturally
                window.dispatchEvent(new CustomEvent('cameraChanged', {
                    detail: { 
                        source: 'projection-switch', 
                        position: camera3js.position, 
                        rotation: camera3js.quaternion 
                    }
                }));
            }, 100);
            
            updateProjectionDisplay();
            dispatchProjectionChangeEvent();
            console.log(`=== PROJECTION SET TO: ${mode} (from ${previousMode}) ===`);
            console.log("Camera position preserved:", camera3js.position);
        }
    };

    // Initialize projection display after component creation
    setTimeout(() => {
        updateProjectionDisplay();
        // Initialize with current projection mode
        if (camera instanceof OBC.OrthoPerspectiveCamera) {
            currentProjection = camera.projection.current as "Perspective" | "Orthographic";
            updateProjectionDisplay();
        }
    }, 100);

    // Make functions globally accessible for debugging
    (window as any).setProjectionMode = setProjectionMode;
    (window as any).getCurrentProjection = getCurrentProjection;
    (window as any).getProjectionBindings = () => ({
        current: currentProjection,
        perspective: perspectiveBindings,
        orthographic: orthographicBindings
    });
    
    // Expose camera memory for debugging and testing
    (window as any).getCameraMemory = () => cameraMemory;
    (window as any).resetCameraMemory = () => {
        cameraMemory.perspective = null;
        cameraMemory.orthographic = null;
        cameraMemory.isFirstTimeOrthographic = true;
        cameraMemory.isFirstTimePerspective = true;
        console.log("Camera memory reset");
    };

    return BUI.Component.create<BUI.PanelSection>(() => {
        const t = (key: string) => i18n.t(key);
        
        return BUI.html`
            <bim-toolbar-section  style="pointer-events: auto">
                <!-- Current Mode Display -->
                <div style="display: flex; flex-direction: column; gap: 8px; margin: 10px 0; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);">
                    <div style="font-size: 12px; font-weight: bold; color: #ccc; text-align: center;">${t('projection')}</div>
                    <div style="display: flex; gap: 6px;">
                        <button 
                            class="projection-mode-button"
                            data-mode="Perspective"
                            onclick="window.setProjectionMode('Perspective')"
                            title="${t('switchToPerspective')}"
                            style="
                                flex: 1;
                                background: rgba(255, 255, 255, 0.2);
                                color: white;
                                border: none;
                                border-radius: 4px;
                                padding: 8px 12px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                font-size: 11px;
                            ">
                            ${t('perspective')}
                        </button>
                        <button 
                            class="projection-mode-button"
                            data-mode="Orthographic"
                            onclick="window.setProjectionMode('Orthographic')"
                            title="${t('switchToOrthographic')}"
                            style="
                                flex: 1;
                                background: rgba(255, 255, 255, 0.2);
                                color: white;
                                border: none;
                                border-radius: 4px;
                                padding: 8px 12px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                font-size: 11px;
                            ">
                            ${t('orthographic')}
                        </button>
                    </div>
                    <div style="
                        font-size: 10px;
                        color: rgba(255, 255, 255, 0.7);
                        text-align: center;
                        margin-top: 4px;
                    " id="current-projection-mode">
                        ${t(currentProjection.toLowerCase())}
                    </div>
                </div>

                <style>
                    .projection-mode-button.active {
                        background: #6528d7 !important;
                        transform: scale(1.05);
                    }
                    .projection-mode-button:hover {
                        background: rgba(255, 255, 255, 0.3) !important;
                        transform: scale(1.02);
                    }
                    .projection-mode-button.active:hover {
                        background: #7c3aed !important;
                    }
                </style>
            </bim-toolbar-section>
        `;
    });
};