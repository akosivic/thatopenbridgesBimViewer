import * as OBC from "@thatopen/components";
import * as THREE from "three";

export default (world: OBC.World) => {
    const { camera } = world;

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

    // Create DOM element directly
    const panel = document.createElement('div');
    panel.id = 'zoom-options-panel';
    panel.className = 'zoom-options-panel';
    
    panel.innerHTML = `
        <div class="zoom-panel-content">
            <div class="zoom-title">Zoom Options</div>
            <div class="zoom-buttons">
                <button class="zoom-button zoom-extents" title="Zoom to Extents">
                    <span class="zoom-icon">📐</span>
                    <span class="zoom-label">Zoom to Extents</span>
                </button>
                <button class="zoom-button zoom-fit" title="Zoom to Fit">
                    <span class="zoom-icon">🎯</span>
                    <span class="zoom-label">Zoom to Fit</span>
                </button>
                <button class="zoom-button zoom-center" title="Zoom to Center">
                    <span class="zoom-icon">🎪</span>
                    <span class="zoom-label">Zoom to Center</span>
                </button>
                <div class="zoom-controls">
                    <button class="zoom-button zoom-in" title="Zoom In">
                        <span class="zoom-icon">➕</span>
                        <span class="zoom-label">Zoom In</span>
                    </button>
                    <button class="zoom-button zoom-out" title="Zoom Out">
                        <span class="zoom-icon">➖</span>
                        <span class="zoom-label">Zoom Out</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add event listeners
    panel.querySelector('.zoom-extents')?.addEventListener('click', zoomToExtents);
    panel.querySelector('.zoom-fit')?.addEventListener('click', zoomToFit);
    panel.querySelector('.zoom-center')?.addEventListener('click', zoomToCenter);
    panel.querySelector('.zoom-in')?.addEventListener('click', zoomIn);
    panel.querySelector('.zoom-out')?.addEventListener('click', zoomOut);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .zoom-options-panel {
            position: fixed;
            top: 50%;
            left: 20px;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 16px;
            z-index: 50000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            min-width: 140px;
            max-width: 200px;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
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
            gap: 8px;
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
            font-family: inherit;
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

        /* Mobile Styles */
        @media (max-width: 768px) {
            .zoom-options-panel {
                left: 10px;
                top: auto;
                bottom: 100px;
                transform: none;
                min-width: 150px;
                max-width: 180px;
                padding: 12px;
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

        /* Large desktop */
        @media (min-width: 1440px) {
            .zoom-options-panel {
                left: 30px;
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
    `;

    document.head.appendChild(style);

    return panel;
};