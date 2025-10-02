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

    // Predefined cube rotations to show each face prominently
    const cubeRotationsForViews = {
        front: { x: 0, y: 0 },
        back: { x: 0, y: 180 },
        left: { x: 0, y: 90 },    // Rotate cube 90° clockwise to bring left face to front
        right: { x: 0, y: -90 },  // Rotate cube 90° counter-clockwise to bring right face to front
        top: { x: -90, y: 0 },
        bottom: { x: 90, y: 0 },
        // Isometric corners - show the corner prominently
        frontTopRight: { x: -30, y: 45 },
        frontTopLeft: { x: -30, y: -45 },
        frontBottomRight: { x: 30, y: 45 },
        frontBottomLeft: { x: 30, y: -45 },
        backTopRight: { x: -30, y: 135 },
        backTopLeft: { x: -30, y: -135 },
        backBottomRight: { x: 30, y: 135 },
        backBottomLeft: { x: 30, y: -135 }
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

    // Function to smoothly animate cube rotation to show the clicked face
    const animateCubeRotation = (targetRotation: { x: number, y: number }, duration = 500) => {
        const cube = element.querySelector('.cube') as HTMLElement;
        if (!cube) return;

        const startRotationX = cubeRotationX;
        const startRotationY = cubeRotationY;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            // Interpolate rotation
            cubeRotationX = startRotationX + (targetRotation.x - startRotationX) * easeProgress;
            cubeRotationY = startRotationY + (targetRotation.y - startRotationY) * easeProgress;
            
            // Apply rotation to cube
            cube.style.transform = `rotateX(${cubeRotationX}deg) rotateY(${cubeRotationY}deg)`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    };

    // Interactive rotation variables
    let isMouseDown = false;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let cubeRotationX = -90; // Initial rotation for TOP view
    let cubeRotationY = 0;   // Initial rotation for TOP view

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
        
        // Directly update camera position for smooth real-time dragging
        camera3js.position.copy(newPosition);
        camera3js.lookAt(target);
        
        console.log('NaviCube: Camera updated to:', newPosition, 'Rotation:', { x: cubeRotationX, y: cubeRotationY });
    };

    // Mouse event handlers for cube rotation
    const handleMouseDown = (event: MouseEvent) => {
        console.log('NaviCube: Mouse down detected', event.target);
        
        const target = event.target as HTMLElement;
        
        // Allow dragging anywhere on the NaviCube (including faces/black boxes)
        const isOnNaviCube = target.closest('.navi-cube') === element;
        
        if (!isOnNaviCube) {
            console.log('NaviCube: Not on NaviCube, skipping drag');
            return;
        }
        
        console.log('NaviCube: Starting potential drag');
        isMouseDown = true;
        isDragging = false;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        
        // Change cursor to indicate dragging is possible
        const cube = element.querySelector('.cube') as HTMLElement;
        if (cube) {
            cube.style.cursor = 'grabbing';
        }
        
        // Add visual feedback
        element.style.opacity = '0.9';
        
        // Prevent any other handlers from interfering with NaviCube dragging
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    };

    const handleMouseMove = (event: MouseEvent) => {
        if (!isMouseDown) return;

        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        
        // Check if we've moved enough to consider this a drag
        const dragThreshold = 2; // Reduced threshold for more responsive dragging
        const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (totalMovement > dragThreshold && !isDragging) {
            isDragging = true;
            element.classList.add('dragging');
            console.log('NaviCube: Drag started - rotating camera');
        }
        
        if (!isDragging) return;

        // Rotation sensitivity - make it more responsive
        const sensitivity = 1.0; // Increased sensitivity
        
        // Update cube rotation
        cubeRotationY += deltaX * sensitivity;
        cubeRotationX -= deltaY * sensitivity; // Negative for intuitive up/down
        
        // Clamp X rotation to prevent flipping
        cubeRotationX = Math.max(-89, Math.min(89, cubeRotationX)); // Slightly less restrictive
        
        // Update cube visual rotation
        const cube = element.querySelector('.cube') as HTMLElement;
        if (cube) {
            cube.style.transform = `rotateX(${cubeRotationX}deg) rotateY(${cubeRotationY}deg)`;
        }
        
        // Update camera position to match cube orientation
        updateCameraFromCubeRotation();

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        
        // Prevent any other mouse move handlers from interfering
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    };

    const handleMouseUp = () => {
        console.log('NaviCube: Mouse up, was dragging:', isDragging, 'isMouseDown:', isMouseDown);
        
        if (isMouseDown) {
            // Reset cursor
            const cube = element.querySelector('.cube') as HTMLElement;
            if (cube) {
                cube.style.cursor = 'grab';
            }
            
            // Reset visual feedback
            element.style.opacity = '1';
            element.classList.remove('dragging');
        }
        
        isMouseDown = false;
        lastMouseX = 0;
        lastMouseY = 0;
        
        // Keep isDragging state for the click handler to prevent accidental clicks
        if (isDragging) {
            setTimeout(() => {
                isDragging = false;
                console.log('NaviCube: Drag state reset');
            }, 100);
        }
    };

    // Touch event handlers for mobile support
    const handleTouchStart = (event: TouchEvent) => {
        if (event.touches.length === 1) {
            const target = event.target as HTMLElement;
            
            // Allow dragging on the NaviCube container, cube, or faces
            const isOnNaviCube = target.closest('.navi-cube') === element;
            
            if (!isOnNaviCube) {
                console.log('NaviCube: Not on NaviCube, skipping touch drag');
                return;
            }
            
            console.log('NaviCube: Starting touch potential drag');
            isMouseDown = true;
            isDragging = false;
            lastMouseX = event.touches[0].clientX;
            lastMouseY = event.touches[0].clientY;
            
            // Add visual feedback
            element.style.opacity = '0.9';
            
            event.preventDefault();
        }
    };

    const handleTouchMove = (event: TouchEvent) => {
        if (event.touches.length !== 1 || !isMouseDown) return;

        const deltaX = event.touches[0].clientX - lastMouseX;
        const deltaY = event.touches[0].clientY - lastMouseY;
        
        const dragThreshold = 2; // Reduced threshold for more responsive dragging
        const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (totalMovement > dragThreshold && !isDragging) {
            isDragging = true;
            element.classList.add('dragging');
            console.log('NaviCube: Touch drag started - rotating camera');
        }
        
        if (!isDragging) return;

        const sensitivity = 1.0; // Increased sensitivity
        
        cubeRotationY += deltaX * sensitivity;
        cubeRotationX -= deltaY * sensitivity;
        
        cubeRotationX = Math.max(-89, Math.min(89, cubeRotationX));
        
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
        if (isMouseDown) {
            // Reset visual feedback
            element.style.opacity = '1';
            element.classList.remove('dragging');
        }
        
        isMouseDown = false;
        lastMouseX = 0;
        lastMouseY = 0;
        
        // Keep isDragging state for the click handler to prevent accidental clicks
        if (isDragging) {
            setTimeout(() => {
                isDragging = false;
            }, 100);
        }
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

            
            <!-- Interaction hint -->
            <div class="interaction-hint">
                Click faces for preset views • Drag background to rotate freely
            </div>
            
        </div>
    `;

    // Add mouse event listeners for dragging
    // Listen for mousedown on the cube container to start dragging
    element.addEventListener('mousedown', handleMouseDown);
    // Listen for mousemove and mouseup globally to handle dragging outside the element
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Add touch event listeners for mobile
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    // Add click event listeners to faces and corners (but allow dragging too)
    element.addEventListener('click', (event) => {
        console.log('NaviCube: Click detected, was dragging:', isDragging);
        
        // If we were dragging, don't handle as a click
        if (isDragging) {
            // Reset dragging state after a brief delay to allow for next interaction
            setTimeout(() => {
                isDragging = false;
            }, 100);
            return;
        }
        
        // Handle preset view clicks only if we didn't drag
        const target = event.target as HTMLElement;
        const clickedElement = target.closest('[data-view]') as HTMLElement;
        
        if (clickedElement && clickedElement.dataset.view) {
            const viewName = clickedElement.dataset.view as keyof typeof viewPositions;
            
            // Set camera view
            setView(viewName);
            
            // Animate cube rotation to show the clicked face prominently
            const targetRotation = cubeRotationsForViews[viewName];
            if (targetRotation) {
                animateCubeRotation(targetRotation);
                console.log(`NaviCube: Rotating cube to show ${viewName} face`, targetRotation);
            }
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
            transform: rotateX(-90deg) rotateY(0deg);
            transition: transform 0.1s ease;
            cursor: grab;
        }

        .cube:active {
            cursor: grabbing;
        }

        .cube.draggable-cube:hover {
            transform: rotateX(-90deg) rotateY(0deg) scale(1.02);
        }

        /* Make the cube container area larger for easier dragging */
        .navi-cube-container {
            width: 100px;
            height: 100px;
            position: relative;
            transform-style: preserve-3d;
            perspective: 300px;
            cursor: grab;
            transition: all 0.2s ease;
            border-radius: 8px;
        }

        .navi-cube-container:active {
            cursor: grabbing;
        }
        
        .navi-cube-container:hover {
            background: rgba(255, 255, 255, 0.1);
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
        }
        
        /* Add a subtle border to indicate draggable area */
        .navi-cube-container:hover::after {
            content: '';
            position: absolute;
            top: -3px;
            left: -3px;
            right: -3px;
            bottom: -3px;
            border: 2px dashed rgba(255, 255, 255, 0.5);
            border-radius: 12px;
            pointer-events: none;
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
            pointer-events: auto;
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
            background: transparent;
            border: 1px solid transparent;
            border-radius: 2px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .corner:hover {
            background: rgba(70, 130, 180, 0.8);
            transform: scale(1.2);
            border-color: rgba(255, 255, 255, 0.8);
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
        
        .drag-instruction {
            position: absolute;
            bottom: -45px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 8px;
            color: rgba(255, 215, 0, 0.9);
            white-space: nowrap;
            text-align: center;
            background: rgba(0, 0, 0, 0.8);
            padding: 3px 8px;
            border-radius: 4px;
            border: 1px solid rgba(255, 215, 0, 0.3);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            font-weight: bold;
        }
        
        .navi-cube.dragging .drag-instruction {
            opacity: 1;
        }
        
        .navi-cube.dragging .interaction-hint {
            opacity: 0;
        }
        
        /* Enhanced dragging state */
        .navi-cube.dragging {
            transform: scale(1.05);
        }
        
        .navi-cube.dragging .navi-cube-container {
            background: rgba(255, 255, 255, 0.15);
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
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

    // Initialize to TOP view on load
    const initializeTopView = () => {
        if (!world.camera.three) {
            console.log('NaviCube: Camera not ready, retrying in 100ms...');
            setTimeout(initializeTopView, 100);
            return;
        }
        
        console.log('NaviCube: Initializing to TOP view...');
        console.log('Current camera position before TOP view:', world.camera.three.position);
        
        // IMPORTANT: For orthographic mode, set position directly without scaling
        // to avoid the white screen issue - use exact orthographic position
        const camera3js = world.camera.three;
        const orthographicPosition = new THREE.Vector3(0, 10, 0);
        const orthographicTarget = new THREE.Vector3(0, 0, 0);
        
        // Set position directly without animation or scaling to avoid white screen
        camera3js.position.copy(orthographicPosition);
        camera3js.lookAt(orthographicTarget);
        
        // Ensure orthographic camera has proper frustum - critical for rendering
        if (camera3js.type === 'OrthographicCamera') {
            const orthoCam = camera3js as THREE.OrthographicCamera;
            const size = 10;
            const aspect = window.innerWidth / window.innerHeight;
            
            orthoCam.left = -size * aspect;
            orthoCam.right = size * aspect;
            orthoCam.top = size;
            orthoCam.bottom = -size;
            orthoCam.near = 0.1;
            orthoCam.far = 1000;
            orthoCam.zoom = 0.5;
            orthoCam.updateProjectionMatrix();
            
            console.log('NaviCube: Orthographic camera frustum configured');
        }
        
        // Update camera matrix for all camera types
        if ('updateProjectionMatrix' in camera3js) {
            (camera3js as any).updateProjectionMatrix();
        }
        
        // Set cube rotation to show TOP face prominently
        const topRotation = cubeRotationsForViews.top;
        if (topRotation) {
            cubeRotationX = topRotation.x;
            cubeRotationY = topRotation.y;
            
            const cube = element.querySelector('.cube') as HTMLElement;
            if (cube) {
                cube.style.transform = `rotateX(${cubeRotationX}deg) rotateY(${cubeRotationY}deg)`;
            }
            
            console.log('NaviCube: Initialized to TOP view with cube rotation:', topRotation);
            console.log('Camera position after TOP view:', camera3js.position);
        }
    };
    
    // Start initialization with shorter delay since WorldViewer sets proper orthographic position at 100ms
    setTimeout(initializeTopView, 200);

    // Add cleanup function to the element for proper removal
    (element as any).cleanup = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        isMouseDown = false;
        isDragging = false;
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
    };

    console.log('NaviCube component created:', element);
    
    return element;
};