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
        perspective: null as { position: THREE.Vector3 } | null,
        orthographic: null as { position: THREE.Vector3 } | null,
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

    // Helper function to determine optimal orthographic distance based on current view
    const calculateOrthographicDistance = (currentPosition: THREE.Vector3, target: THREE.Vector3): number => {
        const distance = currentPosition.distanceTo(target);
        
        // Get model size to determine appropriate distance
        if (world.meshes.size > 0) {
            const bbox = new THREE.Box3();
            world.meshes.forEach(mesh => {
                bbox.expandByObject(mesh);
            });
            
            if (!bbox.isEmpty()) {
                const size = bbox.getSize(new THREE.Vector3());
                const modelDiagonal = size.length();
                const suggestedDistance = Math.max(modelDiagonal * 1.5, 5); // 1.5x model diagonal or minimum 5 units
                console.log("Suggested orthographic distance based on model size:", suggestedDistance);
                return Math.max(distance, suggestedDistance);
            }
        }
        
        return Math.max(distance, 5); // Minimum distance of 5 units
    };

    const setProjectionMode = (mode: "Perspective" | "Orthographic") => {
        if (camera instanceof OBC.OrthoPerspectiveCamera && mode !== currentProjection) {
            const previousMode = currentProjection;
            const camera3js = world.camera.three;
            
            // Store current camera state before switching
            const currentPosition = camera3js.position.clone();
            const currentTarget = getCurrentCameraTarget(camera3js);
            
            // Save current position to memory (target is always calculated as current model center)
            if (previousMode === "Perspective") {
                cameraMemory.perspective = { position: currentPosition };
            } else {
                cameraMemory.orthographic = { position: currentPosition };
            }
            
            // Switch projection mode
            camera.projection.set(mode);
            currentProjection = mode;
            
            console.log(`=== SWITCHING TO ${mode.toUpperCase()} MODE ===`);
            
            // Apply mode-specific camera positioning
            if (mode === "Orthographic") {
                let newPosition: THREE.Vector3;
                
                // Always use current model center as target for consistent view
                const newTarget = currentTarget.clone();
                
                if (cameraMemory.orthographic && !cameraMemory.isFirstTimeOrthographic) {
                    // Restore previous orthographic position but use current model center as target
                    newPosition = cameraMemory.orthographic.position.clone();
                    console.log("Restoring previous orthographic position:", newPosition);
                    console.log("Using current model center as target:", newTarget);
                } else {
                    // First time orthographic: create seamless transition
                    // Preserve the viewing direction and target, but optimize distance for orthographic
                    const direction = currentPosition.clone().sub(newTarget).normalize();
                    const optimalDistance = calculateOrthographicDistance(currentPosition, newTarget);
                    newPosition = newTarget.clone().add(direction.multiplyScalar(optimalDistance));
                    
                    console.log("First time orthographic: seamless transition");
                    console.log("Preserving target:", newTarget);
                    console.log("Optimized position:", newPosition);
                    cameraMemory.isFirstTimeOrthographic = false;
                }
                
                // Apply position and ensure camera looks at model center
                camera3js.position.copy(newPosition);
                camera3js.lookAt(newTarget);
                console.log("Applied orthographic camera lookAt - target:", newTarget);
                console.log("Camera now looking from:", camera3js.position, "to:", newTarget);
                
                // Reset zoom to default for orthographic
                if (camera.controls?.camera) {
                    camera.controls.camera.zoom = 1.0;
                    camera.controls.camera.updateProjectionMatrix();
                    console.log("Zoom reset to 1.0 for orthographic mode");
                }
                
            } else if (mode === "Perspective") {
                let newPosition: THREE.Vector3;
                
                // Always use current model center as target for consistent view
                const newTarget = currentTarget.clone();
                
                if (cameraMemory.perspective && !cameraMemory.isFirstTimePerspective) {
                    // Restore previous perspective position but use current model center as target
                    newPosition = cameraMemory.perspective.position.clone();
                    console.log("Restoring previous perspective position:", newPosition);
                    console.log("Using current model center as target:", newTarget);
                } else {
                    // First time perspective or seamless transition: preserve viewing context
                    newPosition = currentPosition.clone();
                    
                    console.log("Seamless transition to perspective mode");
                    console.log("Preserving position:", newPosition);
                    console.log("Using current model center as target:", newTarget);
                    cameraMemory.isFirstTimePerspective = false;
                }
                
                // Apply position and ensure camera looks at model center
                camera3js.position.copy(newPosition);
                camera3js.lookAt(newTarget);
                console.log("Applied perspective camera lookAt - target:", newTarget);
                console.log("Camera now looking from:", camera3js.position, "to:", newTarget);
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