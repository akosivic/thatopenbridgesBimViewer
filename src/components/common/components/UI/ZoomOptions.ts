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
                // Calculate model center and size
                const center = bbox.getCenter(new THREE.Vector3());
                const size = bbox.getSize(new THREE.Vector3());
                const maxDimension = Math.max(size.x, size.y, size.z);
                
                // Get current camera and determine projection mode
                const camera3js = world.camera.three;
                const isOrthographic = camera3js.type === 'OrthographicCamera';
                
                if (isOrthographic) {
                    // Orthographic mode: Adobe-style behavior
                    // 1. Position camera above/in front of model center at optimal distance
                    const optimalDistance = maxDimension * 1.5;
                    
                    // Get current camera direction or use default top-front view
                    const currentDirection = new THREE.Vector3();
                    camera3js.getWorldDirection(currentDirection);
                    
                    // If camera is too close to horizontal, use top-front view
                    if (Math.abs(currentDirection.y) < 0.3) {
                        currentDirection.set(0.3, -0.7, 0.3).normalize(); // Top-front-right view
                    }
                    
                    // Position camera at optimal distance in opposite direction of view
                    const newPosition = center.clone().sub(currentDirection.clone().multiplyScalar(optimalDistance));
                    
                    // Animate camera to new position
                    animateCameraTransition(camera3js, newPosition, center, () => {
                        // Set appropriate zoom level for orthographic
                        if (world.camera instanceof OBC.OrthoPerspectiveCamera) {
                            const orthoCam = world.camera.three as THREE.OrthographicCamera;
                            const optimalZoom = Math.min(2.0, Math.max(0.5, 10 / maxDimension));
                            orthoCam.zoom = optimalZoom;
                            orthoCam.updateProjectionMatrix();
                            console.log('Orthographic zoom set to:', optimalZoom);
                        }
                    });
                    
                } else {
                    // Perspective mode: Adobe-style behavior
                    // Position camera at optimal distance to view entire model
                    const optimalDistance = maxDimension * 2.0; // Larger distance for perspective
                    
                    // Get current viewing direction or use default
                    let viewDirection = new THREE.Vector3();
                    camera3js.getWorldDirection(viewDirection);
                    viewDirection.negate(); // Direction from center to camera
                    
                    // If no clear direction, use default front-top view
                    if (viewDirection.length() < 0.1) {
                        viewDirection.set(1, 0.5, 1).normalize();
                    }
                    
                    // Calculate new camera position
                    const newPosition = center.clone().add(viewDirection.multiplyScalar(optimalDistance));
                    
                    // Animate camera to new position and orientation
                    animateCameraTransition(camera3js, newPosition, center);
                }
                
                console.log('Adobe-style zoom to center completed');
            }
        }
    };

    // Helper function for smooth camera animation (Adobe-style)
    const animateCameraTransition = (
        camera: THREE.Camera, 
        targetPosition: THREE.Vector3, 
        targetLookAt: THREE.Vector3,
        onComplete?: () => void
    ) => {
        const startPosition = camera.position.clone();
        const startQuaternion = camera.quaternion.clone();
        
        // Create temporary camera to calculate target orientation
        const tempCamera = camera.clone();
        tempCamera.position.copy(targetPosition);
        tempCamera.lookAt(targetLookAt);
        const targetQuaternion = tempCamera.quaternion;
        
        const duration = 800; // ms
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use smooth easing function (Adobe-style)
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
            
            // Interpolate position
            camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            
            // Interpolate rotation
            camera.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, easeProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Ensure exact final position
                camera.position.copy(targetPosition);
                camera.lookAt(targetLookAt);
                if (onComplete) onComplete();
            }
        };
        
        animate();
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
                    <span class="zoom-label">Zoom to Extents</span>
                </button>
                <button class="zoom-button zoom-fit" title="Zoom to Fit">
                    <span class="zoom-label">Zoom to Fit</span>
                </button>
                <button class="zoom-button zoom-center" title="Zoom to Center">
                    <span class="zoom-label">Zoom to Center</span>
                </button>
                <div class="zoom-controls">
                    <button class="zoom-button zoom-in" title="Zoom In">
                        <span class="zoom-label">Zoom In</span>
                    </button>
                    <button class="zoom-button zoom-out" title="Zoom Out">
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
            top: 200px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.6);
            border-radius: 8px;
            padding: 10px;
            z-index: 99998;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            min-width: 100px;
            max-width: 140px;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .zoom-panel-content {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .zoom-title {
            font-size: 11px;
            font-weight: 600;
            color: #ffffff;
            text-align: center;
            margin-bottom: 2px;
            opacity: 0.9;
        }

        .zoom-buttons {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .zoom-controls {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .zoom-button {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px 8px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 10px;
            font-weight: 500;
            min-height: 28px;
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

        .zoom-label {
            flex: 1;
            text-align: center;
        }

        .zoom-controls {
            display: flex;
            flex-direction: row;
            gap: 2px;
        }

        .zoom-controls .zoom-button {
            flex: 1;
            justify-content: center;
        }


    `;

    document.head.appendChild(style);

    console.log('ZoomOptions component created (DOM version):', element);
    
    return element;
};