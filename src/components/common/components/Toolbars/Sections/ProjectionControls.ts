import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import i18n from "../../../utils/i18n";

// Global reference to FPS controls and current projection mode
export let fpControls: PointerLockControls | null = null;
export let currentProjection: "Perspective" | "Orthographic" = "Perspective";

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

    const setProjectionMode = (mode: "Perspective" | "Orthographic") => {
        if (camera instanceof OBC.OrthoPerspectiveCamera && mode !== currentProjection) {
            const previousMode = currentProjection;
            camera.projection.set(mode);
            currentProjection = mode;
            
            // Apply mode-specific defaults when switching to orthographic
            if (mode === "Orthographic") {
                console.log("=== SWITCHING TO ORTHOGRAPHIC MODE ===");
                console.log("Applying default settings - removing all camera restrictions");
                
                // Reset camera to more appropriate orthographic defaults
                const camera3js = world.camera.three;
                
                // Set default orthographic position (remove Y lock)
                // Keep current X and Z, but allow Y to be freely adjustable
                const currentPos = camera3js.position.clone();
                console.log("Current position maintained:", currentPos);
                
                // Reset zoom to default for orthographic
                if (camera.controls?.camera) {
                    camera.controls.camera.zoom = 1.0;
                    camera.controls.camera.updateProjectionMatrix();
                    console.log("Zoom reset to 1.0 for orthographic mode");
                }
                
                // Reset rotation to a sensible default for orthographic (optional)
                // Uncomment the following lines if you want to reset rotation when switching to orthographic:
                camera3js.rotation.set(0, 0, 0);
                // console.log("Rotation reset to defaults for orthographic mode");
                
                console.log("Orthographic mode: All restrictions removed, default settings applied");
            } else if (mode === "Perspective") {
                console.log("=== SWITCHING TO PERSPECTIVE MODE ===");
                console.log("Applying perspective restrictions and settings");
                
                // Apply perspective-specific settings
                const camera3js = world.camera.three;
                
                // Lock Y position to eye level for perspective mode
                camera3js.position.y = 1.6;
                console.log("Y position locked to 1.6m (eye level) for perspective mode");
            }
            
            updateProjectionDisplay();
            dispatchProjectionChangeEvent();
            console.log(`=== PROJECTION SET TO: ${mode} (from ${previousMode}) ===`);
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

    return BUI.Component.create<BUI.PanelSection>(() => {
        const t = (key: string) => i18n.t(key);
        
        return BUI.html`
            <bim-toolbar-section label="${t('projectionMode')}" icon="material-symbols:3d-rotation" style="pointer-events: auto">
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