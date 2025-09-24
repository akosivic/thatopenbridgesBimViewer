import * as OBC from "@thatopen/components";
import * as THREE from "three";

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

    // Create a simple DOM element without BUI
    const element = document.createElement('div');
    element.id = 'zoom-options-panel';
    element.className = 'zoom-options-panel';
    element.innerHTML = `
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
    const extentsBtn = element.querySelector('.zoom-extents');
    const fitBtn = element.querySelector('.zoom-fit');
    const centerBtn = element.querySelector('.zoom-center');
    const inBtn = element.querySelector('.zoom-in');
    const outBtn = element.querySelector('.zoom-out');

    if (extentsBtn) extentsBtn.addEventListener('click', zoomToExtents);
    if (fitBtn) fitBtn.addEventListener('click', zoomToFit);
    if (centerBtn) centerBtn.addEventListener('click', zoomToCenter);
    if (inBtn) inBtn.addEventListener('click', zoomIn);
    if (outBtn) outBtn.addEventListener('click', zoomOut);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .zoom-options-panel {
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            border: 3px solid rgba(255, 255, 255, 0.8);
            border-radius: 12px;
            padding: 16px;
            z-index: 100000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            min-width: 140px;
            max-width: 200px;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    `;

    document.head.appendChild(style);

    console.log('ZoomOptions component created (DOM version):', element);
    
    return element;
};