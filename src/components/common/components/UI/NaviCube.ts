import * as OBC from "@thatopen/components";
import * as THREE from "three";

export default (world: OBC.World) => {
    console.log('NaviCube component being created...');

    // Predefined view positions for standard views
    const viewPositions = {
        front: { position: new THREE.Vector3(0, 0, 10), target: new THREE.Vector3(0, 0, 0) },
        back: { position: new THREE.Vector3(0, 0, -10), target: new THREE.Vector3(0, 0, 0) },
        left: { position: new THREE.Vector3(-10, 0, 0), target: new THREE.Vector3(0, 0, 0) },
        right: { position: new THREE.Vector3(10, 0, 0), target: new THREE.Vector3(0, 0, 0) },
        top: { position: new THREE.Vector3(0, 10, 0), target: new THREE.Vector3(0, 0, 0) },
        bottom: { position: new THREE.Vector3(0, -10, 0), target: new THREE.Vector3(0, 0, 0) },
        // Isometric corners
        frontTopRight: { position: new THREE.Vector3(7, 7, 7), target: new THREE.Vector3(0, 0, 0) },
        frontTopLeft: { position: new THREE.Vector3(-7, 7, 7), target: new THREE.Vector3(0, 0, 0) },
        frontBottomRight: { position: new THREE.Vector3(7, -7, 7), target: new THREE.Vector3(0, 0, 0) },
        frontBottomLeft: { position: new THREE.Vector3(-7, -7, 7), target: new THREE.Vector3(0, 0, 0) },
        backTopRight: { position: new THREE.Vector3(7, 7, -7), target: new THREE.Vector3(0, 0, 0) },
        backTopLeft: { position: new THREE.Vector3(-7, 7, -7), target: new THREE.Vector3(0, 0, 0) },
        backBottomRight: { position: new THREE.Vector3(7, -7, -7), target: new THREE.Vector3(0, 0, 0) },
        backBottomLeft: { position: new THREE.Vector3(-7, -7, -7), target: new THREE.Vector3(0, 0, 0) }
    };

    // Function to set camera view with smooth transition
    const setView = (viewName: keyof typeof viewPositions) => {
        if (!world.camera.three) return;

        const view = viewPositions[viewName];
        const camera3js = world.camera.three;

        // Calculate the current distance from target to maintain zoom level
        const currentDistance = camera3js.position.distanceTo(view.target);
        const targetDistance = view.position.distanceTo(view.target);
        const scaleFactor = currentDistance / targetDistance;

        // Scale the position to maintain current zoom level
        const newPosition = view.position.clone().sub(view.target).multiplyScalar(scaleFactor).add(view.target);

        // Animate to the new position
        animateCamera(camera3js, newPosition, view.target);

        console.log(`NaviCube: Set view to ${viewName}`, { position: newPosition, target: view.target });
    };

    // Interactive rotation variables
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let cubeRotationX = -20; // Initial rotation to match CSS
    let cubeRotationY = 30;  // Initial rotation to match CSS

    // Function to update camera based on cube rotation
    const updateCameraFromCubeRotation = () => {
        if (!world.camera.three) return;

        const camera3js = world.camera.three;
        const target = new THREE.Vector3(0, 0, 0); // Look at origin
        
        // Calculate current distance to maintain zoom
        const currentDistance = camera3js.position.distanceTo(target);
        
        // Convert cube rotation to camera position
        const spherical = new THREE.Spherical();
        spherical.radius = currentDistance;
        spherical.phi = THREE.MathUtils.degToRad(90 + cubeRotationX); // Convert to spherical coordinates
        spherical.theta = THREE.MathUtils.degToRad(cubeRotationY);
        
        // Calculate new position
        const newPosition = new THREE.Vector3();
        newPosition.setFromSpherical(spherical);
        
        // Apply the transformation
        animateCamera(camera3js, newPosition, target);
    };

    // Mouse event handlers for cube rotation
    const handleMouseDown = (event: MouseEvent) => {
        isDragging = false; // Reset dragging state
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        event.preventDefault();
    };

    const handleMouseMove = (event: MouseEvent) => {
        // Only start dragging if mouse has moved and we're in a mouse down state
        if (lastMouseX === 0 && lastMouseY === 0) return; // Not in mouse down state

        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        
        // Check if we've moved enough to consider this a drag
        const dragThreshold = 3; // pixels
        const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (totalMovement > dragThreshold) {
            isDragging = true;
        }
        
        if (!isDragging) return;

        // Rotation sensitivity
        const sensitivity = 0.5;
        
        // Update cube rotation
        cubeRotationY += deltaX * sensitivity;
        cubeRotationX -= deltaY * sensitivity; // Negative for intuitive up/down
        
        // Clamp X rotation to prevent flipping
        cubeRotationX = Math.max(-90, Math.min(90, cubeRotationX));
        
        // Update cube visual rotation
        const cube = element.querySelector('.cube') as HTMLElement;
        if (cube) {
            cube.style.transform = `rotateX(${cubeRotationX}deg) rotateY(${cubeRotationY}deg)`;
        }
        
        // Update camera position to match cube orientation
        updateCameraFromCubeRotation();

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        
        event.preventDefault();
    };

    const handleMouseUp = () => {
        // Reset tracking variables
        lastMouseX = 0;
        lastMouseY = 0;
        // Note: isDragging is reset in click handler after a brief delay
    };

    // Touch event handlers for mobile support
    const handleTouchStart = (event: TouchEvent) => {
        if (event.touches.length === 1) {
            isDragging = false;
            lastMouseX = event.touches[0].clientX;
            lastMouseY = event.touches[0].clientY;
            event.preventDefault();
        }
    };

    const handleTouchMove = (event: TouchEvent) => {
        if (event.touches.length !== 1 || (lastMouseX === 0 && lastMouseY === 0)) return;

        const deltaX = event.touches[0].clientX - lastMouseX;
        const deltaY = event.touches[0].clientY - lastMouseY;
        
        // Check if we've moved enough to consider this a drag
        const dragThreshold = 3; // pixels
        const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (totalMovement > dragThreshold) {
            isDragging = true;
        }
        
        if (!isDragging) return;

        const sensitivity = 0.5;
        
        cubeRotationY += deltaX * sensitivity;
        cubeRotationX -= deltaY * sensitivity;
        
        cubeRotationX = Math.max(-90, Math.min(90, cubeRotationX));
        
        const cube = element.querySelector('.cube') as HTMLElement;
        if (cube) {
            cube.style.transform = `rotateX(${cubeRotationX}deg) rotateY(${cubeRotationY}deg)`;
        }
        
        updateCameraFromCubeRotation();

        lastMouseX = event.touches[0].clientX;
        lastMouseY = event.touches[0].clientY;
        
        event.preventDefault();
    };

    const handleTouchEnd = () => {
        lastMouseX = 0;
        lastMouseY = 0;
        // Note: isDragging is reset in click handler after a brief delay
    };

    // Smooth camera animation function
    const animateCamera = (camera: THREE.Camera, targetPosition: THREE.Vector3, targetLookAt: THREE.Vector3, duration = 500) => {
        const startPosition = camera.position.clone();
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            // Interpolate position
            camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            
            // Look at target
            camera.lookAt(targetLookAt);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    };

    // Create the NaviCube DOM element
    const element = document.createElement('div');
    element.id = 'navi-cube';
    element.className = 'navi-cube';
    element.innerHTML = `
        <div class="navi-cube-container">
            <!-- Cube Faces -->
            <div class="cube draggable-cube">
                <div class="face front" data-view="front">
                    <span>FRONT</span>
                </div>
                <div class="face back" data-view="back">
                    <span>BACK</span>
                </div>
                <div class="face right" data-view="right">
                    <span>RIGHT</span>
                </div>
                <div class="face left" data-view="left">
                    <span>LEFT</span>
                </div>
                <div class="face top" data-view="top">
                    <span>TOP</span>
                </div>
                <div class="face bottom" data-view="bottom">
                    <span>BOTTOM</span>
                </div>
            </div>
            
            <!-- Corner indicators for isometric views -->
            <div class="cube-corners">
                <div class="corner corner-front-top-left" data-view="frontTopLeft"></div>
                <div class="corner corner-front-top-right" data-view="frontTopRight"></div>
                <div class="corner corner-front-bottom-left" data-view="frontBottomLeft"></div>
                <div class="corner corner-front-bottom-right" data-view="frontBottomRight"></div>
                <div class="corner corner-back-top-left" data-view="backTopLeft"></div>
                <div class="corner corner-back-top-right" data-view="backTopRight"></div>
                <div class="corner corner-back-bottom-left" data-view="backBottomLeft"></div>
                <div class="corner corner-back-bottom-right" data-view="backBottomRight"></div>
            </div>

            <!-- Home button in the center -->
            <div class="home-button" data-view="frontTopRight" title="Home View">
                <span>🏠</span>
            </div>
            
            <!-- Interaction hint -->
            <div class="interaction-hint">
                Click faces for views, drag cube to rotate
            </div>
        </div>
    `;

    // Add mouse event listeners for dragging
    element.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Add touch event listeners for mobile
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    // Add click event listeners to faces and corners (higher priority than dragging)
    element.addEventListener('click', (event) => {
        // Only handle clicks if we weren't dragging
        if (isDragging) {
            // Reset dragging state after a brief delay to allow for next interaction
            setTimeout(() => {
                isDragging = false;
            }, 100);
            return;
        }
        
        const target = event.target as HTMLElement;
        const clickedElement = target.closest('[data-view]') as HTMLElement;
        
        if (clickedElement && clickedElement.dataset.view) {
            const viewName = clickedElement.dataset.view as keyof typeof viewPositions;
            setView(viewName);
            
            // Update cube rotation to match the selected view
            setTimeout(() => {
                if (!world.camera.three) return;
                const camera3js = world.camera.three;
                
                // Calculate cube rotation from camera position
                const direction = camera3js.position.clone().normalize();
                cubeRotationX = Math.asin(direction.y) * 180 / Math.PI;
                cubeRotationY = Math.atan2(direction.x, direction.z) * 180 / Math.PI;
                
                const cube = element.querySelector('.cube') as HTMLElement;
                if (cube) {
                    cube.style.transform = `rotateX(${cubeRotationX}deg) rotateY(${cubeRotationY}deg)`;
                }
            }, 500); // Wait for camera animation to complete
        }
        
        // Reset dragging state
        setTimeout(() => {
            isDragging = false;
        }, 100);
    });

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .navi-cube {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 99999;
            user-select: none;
            pointer-events: auto;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        }

        .navi-cube-container {
            width: 100px;
            height: 100px;
            position: relative;
            transform-style: preserve-3d;
            perspective: 300px;
        }

        .cube {
            width: 60px;
            height: 60px;
            position: absolute;
            top: 20px;
            left: 20px;
            transform-style: preserve-3d;
            transform: rotateX(-20deg) rotateY(30deg);
            transition: transform 0.1s ease;
            cursor: grab;
        }

        .cube:active {
            cursor: grabbing;
        }

        .cube.draggable-cube:hover {
            transform: rotateX(-20deg) rotateY(30deg) scale(1.02);
        }

        .face {
            position: absolute;
            width: 60px;
            height: 60px;
            background: rgba(70, 130, 180, 0.8);
            border: 2px solid rgba(255, 255, 255, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            font-weight: bold;
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
            backdrop-filter: blur(4px);
        }

        .face:hover {
            background: rgba(70, 130, 180, 1);
            border-color: rgba(255, 255, 255, 0.8);
            transform: translateZ(2px);
        }

        .face.front {
            transform: rotateY(0deg) translateZ(30px);
        }

        .face.back {
            transform: rotateY(180deg) translateZ(30px);
        }

        .face.right {
            transform: rotateY(90deg) translateZ(30px);
        }

        .face.left {
            transform: rotateY(-90deg) translateZ(30px);
        }

        .face.top {
            transform: rotateX(90deg) translateZ(30px);
        }

        .face.bottom {
            transform: rotateX(-90deg) translateZ(30px);
        }

        .cube-corners {
            position: absolute;
            width: 100px;
            height: 100px;
            top: 0;
            left: 0;
        }

        .corner {
            position: absolute;
            width: 12px;
            height: 12px;
            background: rgba(255, 215, 0, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.5);
            border-radius: 2px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .corner:hover {
            background: rgba(255, 215, 0, 1);
            transform: scale(1.2);
            border-color: rgba(255, 255, 255, 1);
        }

        /* Corner positions */
        .corner-front-top-left { top: 15px; left: 15px; }
        .corner-front-top-right { top: 15px; right: 15px; }
        .corner-front-bottom-left { bottom: 15px; left: 15px; }
        .corner-front-bottom-right { bottom: 15px; right: 15px; }
        .corner-back-top-left { top: 25px; left: 25px; opacity: 0.6; }
        .corner-back-top-right { top: 25px; right: 25px; opacity: 0.6; }
        .corner-back-bottom-left { bottom: 25px; left: 25px; opacity: 0.6; }
        .corner-back-bottom-right { bottom: 25px; right: 25px; opacity: 0.6; }

        .home-button {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            background: rgba(46, 125, 50, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            z-index: 10;
        }

        .home-button:hover {
            background: rgba(46, 125, 50, 1);
            transform: translate(-50%, -50%) scale(1.2);
            border-color: rgba(255, 255, 255, 1);
        }

        .interaction-hint {
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 8px;
            color: rgba(255, 255, 255, 0.7);
            white-space: nowrap;
            text-align: center;
            background: rgba(0, 0, 0, 0.7);
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }

        .navi-cube:hover .interaction-hint {
            opacity: 1;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .navi-cube {
                top: 70px;
                right: 10px;
            }
            
            .navi-cube-container {
                width: 80px;
                height: 80px;
            }
            
            .cube {
                width: 50px;
                height: 50px;
                top: 15px;
                left: 15px;
            }
            
            .face {
                width: 50px;
                height: 50px;
                font-size: 7px;
            }
            
            .face.front, .face.back, .face.right, .face.left, .face.top, .face.bottom {
                transform-origin: center;
            }
            
            .face.front { transform: rotateY(0deg) translateZ(25px); }
            .face.back { transform: rotateY(180deg) translateZ(25px); }
            .face.right { transform: rotateY(90deg) translateZ(25px); }
            .face.left { transform: rotateY(-90deg) translateZ(25px); }
            .face.top { transform: rotateX(90deg) translateZ(25px); }
            .face.bottom { transform: rotateX(-90deg) translateZ(25px); }
            
            .corner {
                width: 10px;
                height: 10px;
            }
            
            .home-button {
                width: 16px;
                height: 16px;
                font-size: 8px;
            }
        }

        /* High DPI displays */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
            .face, .corner, .home-button {
                border-width: 0.5px;
            }
        }
    `;

    document.head.appendChild(style);

    // Add cleanup function to the element for proper removal
    (element as any).cleanup = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
    };

    console.log('NaviCube component created:', element);
    
    return element;
};