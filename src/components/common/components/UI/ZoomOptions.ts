import * as OBC from "@thatopen/components";
import * as THREE from "three";

// Global minimum zoom limit that can be accessed by other modules
let globalMinZoomLimit = 0.8; // Default fallback

// Export getter for the minimum zoom limit
export const getMinZoomLimit = () => globalMinZoomLimit;

export default (world: OBC.World) => {
    // Store the zoom-to-fit value as the minimum zoom out limit
    let minZoomLimit = 0.8; // Default fallback
    
    // Function to calculate the zoom-to-fit value (minimum allowed zoom)
    function calculateZoomToFitValue(): number {
        if (world.meshes.size === 0) return 0.8; // Fallback if no model
        
        const bbox = new THREE.Box3();
        world.meshes.forEach(mesh => {
            bbox.expandByObject(mesh);
        });
        
        if (bbox.isEmpty()) return 0.8; // Fallback if empty bounds
        
        const size = bbox.getSize(new THREE.Vector3());
        const camera3js = world.camera.three;
        
        if (camera3js.type === 'OrthographicCamera') {
            const orthoCam = camera3js as THREE.OrthographicCamera;
            const margin = 2.0; // Same margin as zoomToFit
            const fitWidth = size.x * margin;
            const fitHeight = size.y * margin;
            const frustumWidth = Math.abs(orthoCam.right - orthoCam.left);
            const frustumHeight = Math.abs(orthoCam.top - orthoCam.bottom);
            const zoomForWidth = frustumWidth / fitWidth;
            const zoomForHeight = frustumHeight / fitHeight;
            const fitZoom = Math.min(zoomForWidth, zoomForHeight);
            
            console.log('Calculated zoom-to-fit minimum:', fitZoom);
            return Math.max(0.1, fitZoom); // Ensure it's not too small
        }
        
        return 0.8; // Fallback for non-orthographic
    }
    
    // Update global minimum zoom limit
    const updateMinZoomLimit = (value: number) => {
        minZoomLimit = value;
        globalMinZoomLimit = value;
        console.log('Updated global minimum zoom limit to:', globalMinZoomLimit);
    };
    
    // Helper for orthographic zoom with margin
    function zoomModelWithMargin(center: THREE.Vector3, size: THREE.Vector3, camera3js: THREE.Camera, margin: number) {
        const fitWidth = size.x * margin;
        const fitHeight = size.y * margin;
        const orthoCam = camera3js as THREE.OrthographicCamera;
        const frustumWidth = Math.abs(orthoCam.right - orthoCam.left);
        const frustumHeight = Math.abs(orthoCam.top - orthoCam.bottom);
        const zoomForWidth = frustumWidth / fitWidth;
        const zoomForHeight = frustumHeight / fitHeight;
        const targetZoom = Math.min(zoomForWidth, zoomForHeight);
        
        // Update the minimum zoom limit when zoom-to-fit is used
        updateMinZoomLimit(Math.max(0.1, targetZoom));
        
        const currentDirection = new THREE.Vector3();
        camera3js.getWorldDirection(currentDirection);
        currentDirection.normalize();
        const distance = camera3js.position.distanceTo(center);
        const newPosition = center.clone().sub(currentDirection.clone().multiplyScalar(distance));
        animateCameraTransition(camera3js, newPosition, center, () => {
            if (world.camera instanceof OBC.OrthoPerspectiveCamera) {
                const orthoCam2 = world.camera.three as THREE.OrthographicCamera;
                orthoCam2.zoom = targetZoom;
                orthoCam2.updateProjectionMatrix();
            }
        });
    }
    const { camera } = world;

    console.log('ZoomOptions component being created...');
    
    // Calculate initial minimum zoom limit based on model
    setTimeout(() => {
        const calculatedMin = calculateZoomToFitValue();
        updateMinZoomLimit(calculatedMin);
    }, 100);

    // Zoom functions with DISTINCT Adobe-style behaviors
    const zoomToExtents = () => {
        if (camera instanceof OBC.OrthoPerspectiveCamera && world.meshes.size > 0) {
            const bbox = new THREE.Box3();
            world.meshes.forEach(mesh => {
                bbox.expandByObject(mesh);
            });
            if (!bbox.isEmpty()) {
                const center = bbox.getCenter(new THREE.Vector3());
                const size = bbox.getSize(new THREE.Vector3());
                const diagonalLength = size.length();
                const camera3js = world.camera.three;
                if (camera3js.type === 'OrthographicCamera') {
                    // Use margin 1.2 for extents (default)
                    zoomModelWithMargin(center, size, camera3js, 1.5);
                } else {
                    // Perspective mode: Far back for full overview
                    const fov = (camera3js as THREE.PerspectiveCamera).fov * Math.PI / 180;
                    const padding = 1.5; // 50% padding for perspective
                    const optimalDistance = (diagonalLength * padding) / (2 * Math.tan(fov / 2));
                    const currentDirection = new THREE.Vector3();
                    camera3js.getWorldDirection(currentDirection);
                    currentDirection.normalize();
                    const newPosition = center.clone().sub(currentDirection.clone().multiplyScalar(optimalDistance));
                    animateCameraTransition(camera3js, newPosition, center);
                }
                console.log('Zoom to Extents: Wide overview with generous padding');
            }
        }
    };

    const zoomToFit = () => {
        if (camera instanceof OBC.OrthoPerspectiveCamera && world.meshes.size > 0) {
            const bbox = new THREE.Box3();
            world.meshes.forEach(mesh => {
                bbox.expandByObject(mesh);
            });
            if (!bbox.isEmpty()) {
                const center = bbox.getCenter(new THREE.Vector3());
                const size = bbox.getSize(new THREE.Vector3());
                const maxDimension = Math.max(size.x, size.y, size.z);
                const camera3js = world.camera.three;
                if (camera3js.type === 'OrthographicCamera') {
                    // Use larger margin for fit (e.g., 2.0)
                    zoomModelWithMargin(center, size, camera3js, 2.0);
                    // Notify NaviCube to sync after zoom animation completes
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('cameraChanged'));
                    }, 850); // Wait for animation to complete (duration is 800ms)
                } else {
                    // Perspective mode: Close for tight detail
                    const fov = (camera3js as THREE.PerspectiveCamera).fov * Math.PI / 180;
                    const padding = 0.7; // Minimal padding for tight fit
                    const optimalDistance = (maxDimension * padding) / (2 * Math.tan(fov / 2));
                    const currentDirection = new THREE.Vector3();
                    camera3js.getWorldDirection(currentDirection);
                    currentDirection.normalize();
                    const newPosition = center.clone().sub(currentDirection.clone().multiplyScalar(optimalDistance));
                    animateCameraTransition(camera3js, newPosition, center);
                    // Notify NaviCube to sync after zoom animation completes
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('cameraChanged'));
                    }, 850);
                }
                console.log('Zoom to Fit: Close framing for maximum detail');
            }
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
                const camera3js = world.camera.three;
                const currentPosition = camera3js.position.clone();
                
                // CENTER: Simply rotate to look at center - DON'T move camera much!
                const distanceToCenter = currentPosition.distanceTo(center);
                const size = bbox.getSize(new THREE.Vector3());
                const modelRadius = Math.max(size.x, size.y, size.z) / 2;
                const minSafeDistance = modelRadius * 1.2;
                
                let targetPosition = currentPosition.clone();
                
                // Only move if camera is dangerously close to the model
                if (distanceToCenter < minSafeDistance) {
                    console.log('Camera too close to model, adjusting position slightly');
                    const directionFromCenter = currentPosition.clone().sub(center).normalize();
                    targetPosition = center.clone().add(directionFromCenter.multiplyScalar(minSafeDistance));
                }
                
                // Short, quick animation primarily for rotation
                animateCameraLookAt(camera3js, targetPosition, center);
                // Notify NaviCube to sync after zoom animation completes
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('cameraChanged'));
                }, 450); // Wait for animation to complete (duration is 400ms)
                console.log('Zoom to Center: Camera pointed toward model center (minimal movement)');
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
            const newZoom = Math.max(minZoomLimit, currentZoom * 0.8); // Minimum zoom limited to zoom-to-fit value
            orthoCam.zoom = newZoom;
            orthoCam.updateProjectionMatrix();
            console.log('Zoomed out to:', newZoom, '(min limit:', minZoomLimit + ')');
        }
    };

    // Helper function for smooth camera animation with repositioning
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
            
            // Use smooth easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
            
            // Interpolate position and rotation
            camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            camera.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, easeProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                camera.position.copy(targetPosition);
                // Check if camera state preservation is active before calling lookAt
                if (!(window as any).isCameraStateBeingPreserved || !(window as any).isCameraStateBeingPreserved()) {
                    camera.lookAt(targetLookAt);
                } else {
                    console.log("🔒 ZoomOptions: Skipping lookAt during camera state preservation");
                }
                if (onComplete) onComplete();
            }
        };
        
        animate();
    };
    
    // Helper function for quick camera look-at (minimal position change)
    const animateCameraLookAt = (
        camera: THREE.Camera,
        targetPosition: THREE.Vector3,
        lookAtTarget: THREE.Vector3
    ) => {
        const startPosition = camera.position.clone();
        const startQuaternion = camera.quaternion.clone();
        
        const tempCamera = camera.clone();
        tempCamera.position.copy(targetPosition);
        tempCamera.lookAt(lookAtTarget);
        const targetQuaternion = tempCamera.quaternion;
        
        const duration = 400; // Shorter duration for look-at only
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeProgress = 1 - Math.pow(1 - progress, 2); // Ease-out quadratic
            
            camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            camera.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, easeProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
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
            border: 2px solid rgba(255, 255, 255, 0.8);
            border-radius: 8px;
            padding: 10px;
            z-index: 100000;
            box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
            min-width: 120px;
            max-width: 160px;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .zoom-panel-content {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .zoom-title {
            font-size: 12px;
            font-weight: 600;
            color: #ffffff;
            text-align: center;
            margin-bottom: 2px;
            opacity: 0.9;
        }

        .zoom-buttons {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .zoom-controls {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .zoom-button {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 8px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
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

        .zoom-icon {
            font-size: 12px;
            flex-shrink: 0;
        }

        .zoom-label {
            flex: 1;
            text-align: left;
            font-size: 9px;
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
    
    // Expose zoomToCenter for external use (e.g., initial load)
    (element as unknown as { zoomToCenter: () => void }).zoomToCenter = zoomToCenter;
    
    return element;
};