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

// Orthographic mode: CAD-style controls (similar to AutoCAD, Revit)
const orthographicBindings: KeyBindings = {
    forward: ["ArrowUp", "KeyW"],
    backward: ["ArrowDown", "KeyS"],
    left: ["ArrowLeft", "KeyA"], 
    right: ["ArrowRight", "KeyD"],
    up: ["KeyQ"],
    down: ["KeyE"],
    rotateLeft: ["Ctrl + Arrow Left"],
    rotateRight: ["Ctrl + Arrow Right"],
    rotateUp: ["Ctrl + Arrow Up"],
    rotateDown: ["Ctrl + Arrow Down"],
    zoom: ["Mouse Wheel", "Ctrl + Mouse Wheel"],
    pan: ["Middle Mouse Button", "Shift + Mouse Drag"]
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
            camera.projection.set(mode);
            currentProjection = mode;
            updateProjectionDisplay();
            dispatchProjectionChangeEvent();
            console.log(`=== PROJECTION SET TO: ${mode} ===`);
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

                <!-- Key Bindings Info -->
                <div style="display: flex; flex-direction: column; gap: 8px; margin: 10px 0; padding: 10px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; background: rgba(0, 0, 0, 0.3);">
                    <div style="font-size: 11px; font-weight: bold; color: #aaa; text-align: center;">Key Bindings</div>
                    <div style="font-size: 9px; color: rgba(255, 255, 255, 0.6); line-height: 1.3;">
                        <div><strong>Perspective:</strong> WASD/Arrows (move), Mouse (look)</div>
                        <div><strong>Orthographic:</strong> WASD/Arrows (pan), Ctrl+Arrows (orbit)</div>
                        <div><strong>Both:</strong> Q/E (up/down), Wheel (zoom)</div>
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