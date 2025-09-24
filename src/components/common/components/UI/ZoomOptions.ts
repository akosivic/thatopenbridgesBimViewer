import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import i18n from "../../utils/i18n";

export default (world: OBC.World) => {
    const { camera } = world;

    console.log('ZoomOptions component being created...');

    // Zoom functions
    const zoomToExtents = () => {
        if (camera instanceof OBC.OrthoPerspectiveCamera && world.meshes.size > 0) {
            camera.fit(world.meshes, 0.8);
            console.log('Zoomed to extents');
        }
    };

    const zoomToFit = () => {
        if (camera instanceof OBC.OrthoPerspectiveCamera && world.meshes.size > 0) {
            camera.fit(world.meshes, 0.5);
            console.log('Zoomed to fit');
        }
    };

    const zoomToCenter = () => {
        if (world.meshes.size > 0) {
            const bbox = new THREE.Box3();
            world.meshes.forEach(mesh => {
                bbox.expandByObject(mesh);
            });
            
            if (!bbox.isEmpty()) {
                const center = bbox.getCenter(new THREE.Vector3());
                world.camera.three.lookAt(center);
                console.log('Camera centered on model');
            }
        }
    };

    const zoomIn = () => {
        if (world.camera instanceof OBC.OrthoPerspectiveCamera && world.camera.three.type === 'OrthographicCamera') {
            const orthoCam = world.camera.three as THREE.OrthographicCamera;
            const currentZoom = orthoCam.zoom || 1;
            const newZoom = Math.min(5, currentZoom * 1.2);
            orthoCam.zoom = newZoom;
            orthoCam.updateProjectionMatrix();
            console.log('Zoomed in:', newZoom);
        }
    };

    const zoomOut = () => {
        if (world.camera instanceof OBC.OrthoPerspectiveCamera && world.camera.three.type === 'OrthographicCamera') {
            const orthoCam = world.camera.three as THREE.OrthographicCamera;
            const currentZoom = orthoCam.zoom || 1;
            const newZoom = Math.max(0.1, currentZoom * 0.8);
            orthoCam.zoom = newZoom;
            orthoCam.updateProjectionMatrix();
            console.log('Zoomed out:', newZoom);
        }
    };

    return BUI.Component.create<HTMLElement>(() => {
        const t = (key: string) => i18n.t(key);
        
        return BUI.html`
            <div id="zoom-options-panel" class="zoom-options-panel">
                <div class="zoom-panel-content">
                    <div class="zoom-title">${t('zoomOptions')}</div>
                    <div class="zoom-buttons">
                        <button 
                            class="zoom-button zoom-extents"
                            @click=${zoomToExtents}
                            title="${t('zoomToExtents')}"
                        >
                            <span class="zoom-icon">📐</span>
                            <span class="zoom-label">${t('zoomToExtents')}</span>
                        </button>
                        
                        <button 
                            class="zoom-button zoom-fit"
                            @click=${zoomToFit}
                            title="${t('zoomToFit')}"
                        >
                            <span class="zoom-icon">🎯</span>
                            <span class="zoom-label">${t('zoomToFit')}</span>
                        </button>
                        
                        <button 
                            class="zoom-button zoom-center"
                            @click=${zoomToCenter}
                            title="${t('zoomToCenter')}"
                        >
                            <span class="zoom-icon">🎪</span>
                            <span class="zoom-label">${t('zoomToCenter')}</span>
                        </button>
                        
                        <div class="zoom-controls">
                            <button 
                                class="zoom-button zoom-in"
                                @click=${zoomIn}
                                title="${t('zoomIn')}"
                            >
                                <span class="zoom-icon">➕</span>
                                <span class="zoom-label">${t('zoomIn')}</span>
                            </button>
                            
                            <button 
                                class="zoom-button zoom-out"
                                @click=${zoomOut}
                                title="${t('zoomOut')}"
                            >
                                <span class="zoom-icon">➖</span>
                                <span class="zoom-label">${t('zoomOut')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .zoom-options-panel {
                    position: fixed;
                    top: 50%;
                    right: 20px;
                    transform: translateY(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    padding: 16px;
                    z-index: 50000;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    min-width: 140px;
                    max-width: 200px;
                }

                .zoom-panel-content {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .zoom-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #ffffff;
                    text-align: center;
                    margin-bottom: 4px;
                    opacity: 0.9;
                }

                .zoom-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .zoom-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .zoom-button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 12px;
                    font-weight: 500;
                    min-height: 40px;
                    white-space: nowrap;
                }

                .zoom-button:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.3);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .zoom-button:active {
                    transform: translateY(0);
                    background: rgba(255, 255, 255, 0.25);
                }

                .zoom-icon {
                    font-size: 16px;
                    flex-shrink: 0;
                }

                .zoom-label {
                    flex: 1;
                    text-align: left;
                }

                .zoom-controls .zoom-button {
                    flex: 1;
                    justify-content: center;
                }

                .zoom-controls .zoom-label {
                    text-align: center;
                }

                /* Tablet Styles (768px to 1024px) */
                @media (max-width: 1024px) and (min-width: 768px) {
                    .zoom-options-panel {
                        right: 16px;
                        min-width: 120px;
                        max-width: 160px;
                        padding: 14px;
                    }

                    .zoom-title {
                        font-size: 13px;
                    }

                    .zoom-button {
                        padding: 8px 10px;
                        font-size: 11px;
                        min-height: 36px;
                    }

                    .zoom-icon {
                        font-size: 14px;
                    }
                }

                /* Mobile Styles (up to 767px) */
                @media (max-width: 767px) {
                    .zoom-options-panel {
                        position: fixed;
                        top: auto;
                        bottom: 20px;
                        right: 20px;
                        left: auto;
                        transform: none;
                        min-width: 100px;
                        max-width: 120px;
                        padding: 12px;
                    }

                    .zoom-title {
                        font-size: 12px;
                        margin-bottom: 6px;
                    }

                    .zoom-button {
                        padding: 6px 8px;
                        font-size: 10px;
                        min-height: 32px;
                        gap: 6px;
                    }

                    .zoom-icon {
                        font-size: 12px;
                    }

                    .zoom-label {
                        display: none; /* Hide labels on mobile for space */
                    }

                    .zoom-controls {
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                    }

                    .zoom-controls .zoom-button {
                        padding: 6px;
                        min-width: 36px;
                    }
                }

                /* Very small mobile devices (up to 480px) */
                @media (max-width: 480px) {
                    .zoom-options-panel {
                        bottom: 80px; /* Move up to avoid conflicts with bottom tabs */
                        right: 10px;
                        min-width: 80px;
                        max-width: 100px;
                        padding: 10px;
                    }

                    .zoom-buttons {
                        gap: 6px;
                    }

                    .zoom-button {
                        padding: 4px 6px;
                        min-height: 28px;
                        border-radius: 6px;
                    }

                    .zoom-icon {
                        font-size: 10px;
                    }

                    .zoom-controls {
                        gap: 4px;
                    }

                    .zoom-controls .zoom-button {
                        min-width: 28px;
                        padding: 4px;
                    }
                }

                /* Large desktop screens */
                @media (min-width: 1440px) {
                    .zoom-options-panel {
                        right: 30px;
                        min-width: 160px;
                        max-width: 220px;
                        padding: 18px;
                    }

                    .zoom-title {
                        font-size: 15px;
                    }

                    .zoom-button {
                        padding: 12px 14px;
                        font-size: 13px;
                        min-height: 44px;
                    }

                    .zoom-icon {
                        font-size: 18px;
                    }
                }

                /* Landscape mobile orientation */
                @media (max-width: 767px) and (orientation: landscape) {
                    .zoom-options-panel {
                        top: 50%;
                        right: 10px;
                        bottom: auto;
                        transform: translateY(-50%);
                    }
                }

                /* High DPI displays */
                @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
                    .zoom-options-panel {
                        border-width: 0.5px;
                    }
                }
            </style>
        `;
        console.log('ZoomOptions BUI component created and returning element');
    });
    console.log('ZoomOptions component finished creation');
};