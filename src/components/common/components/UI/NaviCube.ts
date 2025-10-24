import * as OBC from "@thatopen/components";
import * as THREE from "three";

/*
 * NaviCube Component
 * 
 * VISUAL vs LOGICAL BEHAVIOR:
 * 
 * VISUAL NAVICUBE DRAGGING:
 * - Drag NaviCube RIGHT → NaviCube visually rotates RIGHT (intuitive)
 * - Drag NaviCube LEFT → NaviCube visually rotates LEFT (intuitive)
 * 
 * LOGICAL MODEL REPRESENTATION:
 * - When NaviCube shows RIGHT face → Camera positioned to see LEFT side of model
 * - When NaviCube shows LEFT face → Camera positioned to see RIGHT side of model
 * 
 * CONSISTENT WITH MODEL DRAGGING:
 * - Drag model RIGHT → See LEFT side → NaviCube shows RIGHT face (represents viewing angle)
 * - Drag NaviCube RIGHT → NaviCube shows RIGHT face → Camera sees LEFT side (same result)
 * 
 * COORDINATE SYSTEM:
 * - Visual rotation: Normal (drag right = rotate right)
 * - Camera positioning: Inverted theta for model-side representation
 */

export default (world: OBC.World) => {
    // Check if debug mode is enabled
    const isDebugMode = window.location.search.toLowerCase().includes('debug');
    
    if (isDebugMode) {
        console.log('NaviCube component being created...');
    }

    // Get the model center for consistent reference (same as OrthographicMouseControls)
    const getModelCenter = (): THREE.Vector3 => {
        if (world.meshes.size > 0) {
            const bbox = new THREE.Box3();
            world.meshes.forEach(mesh => {
                bbox.expandByObject(mesh);
            });
            if (!bbox.isEmpty()) {
                return bbox.getCenter(new THREE.Vector3());
            }
        }
        return new THREE.Vector3(0, 0, 0);
    };

    // Predefined view positions for standard views
    const viewPositions = {
        front: { position: new THREE.Vector3(0, 0, 10), target: new THREE.Vector3(0, 0, 0) },
        back: { position: new THREE.Vector3(0, 0, -10), target: new THREE.Vector3(0, 0, 0) },
        left: { position: new THREE.Vector3(-10, 0, 0), target: new THREE.Vector3(0, 0, 0) }, // Fixed: Camera on left shows left side of model
        right: { position: new THREE.Vector3(10, 0, 0), target: new THREE.Vector3(0, 0, 0) }, // Fixed: Camera on right shows right side of model
        top: { position: new THREE.Vector3(0, 10, 0), target: new THREE.Vector3(0, 0, 0) },
        bottom: { position: new THREE.Vector3(0, -7, 7), target: new THREE.Vector3(0, 0, 0) }, // Modified: Angled view instead of straight down
        // Isometric corners - fixed for correct model side representation
        frontTopRight: { position: new THREE.Vector3(7, 7, 7), target: new THREE.Vector3(0, 0, 0) },   // Fixed: See front-top-right
        frontTopLeft: { position: new THREE.Vector3(-7, 7, 7), target: new THREE.Vector3(0, 0, 0) },   // Fixed: See front-top-left
        frontBottomRight: { position: new THREE.Vector3(7, -7, 7), target: new THREE.Vector3(0, 0, 0) }, // Fixed: See front-bottom-right
        frontBottomLeft: { position: new THREE.Vector3(-7, -7, 7), target: new THREE.Vector3(0, 0, 0) }, // Fixed: See front-bottom-left
        backTopRight: { position: new THREE.Vector3(7, 7, -7), target: new THREE.Vector3(0, 0, 0) },    // Fixed: See back-top-right
        backTopLeft: { position: new THREE.Vector3(-7, 7, -7), target: new THREE.Vector3(0, 0, 0) },    // Fixed: See back-top-left
        backBottomRight: { position: new THREE.Vector3(7, -7, -7), target: new THREE.Vector3(0, 0, 0) }, // Fixed: See back-bottom-right
        backBottomLeft: { position: new THREE.Vector3(-7, -7, -7), target: new THREE.Vector3(0, 0, 0) }  // Fixed: See back-bottom-left
    };

    // Predefined cube rotations to show each face prominently
    const cubeRotationsForViews = {
        front: { x: 0, y: 0 },
        back: { x: 0, y: 180 },
        left: { x: 0, y: 90 },    // Fixed: Show left face when camera is on left side (model shows left)
        right: { x: 0, y: -90 },  // Fixed: Show right face when camera is on right side (model shows right)
        top: { x: -90, y: 0 },
        bottom: { x: 45, y: 0 }, // Modified: 45° angle instead of 90° straight down
        // Isometric corners - adjusted for correct model side representation
        frontTopRight: { x: -30, y: 45 },   // Fixed: Show front-top-right corner
        frontTopLeft: { x: -30, y: -45 },   // Fixed: Show front-top-left corner
        frontBottomRight: { x: 30, y: 45 },  // Fixed: Show front-bottom-right corner
        frontBottomLeft: { x: 30, y: -45 },  // Fixed: Show front-bottom-left corner
        backTopRight: { x: -30, y: 135 },    // Fixed: Show back-top-right corner
        backTopLeft: { x: -30, y: -135 },    // Fixed: Show back-top-left corner
        backBottomRight: { x: 30, y: 135 },  // Fixed: Show back-bottom-right corner
        backBottomLeft: { x: 30, y: -135 }   // Fixed: Show back-bottom-left corner
    };

    // Function to set camera view with smooth transition
    const setView = (viewName: keyof typeof viewPositions) => {
        if (!world.camera.three) return;

        // Temporarily stop camera monitoring during view change
        stopCameraMonitoring();

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

        // Restart camera monitoring after animation completes
        setTimeout(() => {
            startCameraMonitoring();
        }, 600); // Wait a bit longer than animation duration

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

    // Enhanced camera movement detection with improved sensitivity
    let lastCameraPosition = new THREE.Vector3();
    let lastCameraQuaternion = new THREE.Quaternion();
    let lastCameraMatrix = new THREE.Matrix4();
    let cameraUpdateInterval: number | null = null;
    let lastUpdateTime = 0;
    let isMonitoringActive = false;

    // Interactive rotation variables
    let isMouseDown = false;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Global camera change listener for integration with other control systems
    const handleGlobalCameraChange = (event: Event) => {
        if (!isUpdatingFromCamera && world.camera.three) {
            // Check if this is a position movement in orthographic mode that should be ignored
            const customEvent = event as CustomEvent;
            if (customEvent && customEvent.detail) {
                const { movementType, projectionMode } = customEvent.detail;
                
                // In orthographic mode, ignore position-only movements (left/right/up/down/forward/backward)
                if (projectionMode === 'orthographic' && movementType === 'position-movement') {
                    if (isDebugMode) {
                        console.log('NaviCube: Ignoring position movement in orthographic mode', customEvent.detail);
                    }
                    return; // Don't update NaviCube for position-only movements in orthographic mode
                }
                
                if (isDebugMode) {
                    console.log('NaviCube: Processing camera change', {
                        movementType,
                        projectionMode,
                        source: customEvent.detail.source
                    });
                }
            }
            
            updateNaviCubeFromCamera();
        }
    };

    // Set up global camera change event listener
    window.addEventListener('cameraChanged', handleGlobalCameraChange);

    const startCameraMonitoring = () => {
        if (cameraUpdateInterval || isMonitoringActive) return; // Already monitoring
        
        isMonitoringActive = true;
        
        cameraUpdateInterval = setInterval(() => {
            if (!world.camera.three || isUpdatingFromCamera) return;
            
            const camera3js = world.camera.three;
            const currentPosition = camera3js.position.clone();
            const currentQuaternion = camera3js.quaternion.clone();
            const currentMatrix = camera3js.matrixWorld.clone();
            
            // Enhanced change detection with multiple thresholds
            const positionThreshold = 0.001; // More sensitive position threshold
            const quaternionThreshold = 0.0001; // Quaternion sensitivity
            const now = Date.now();
            
            // Check for any significant changes
            const positionChanged = currentPosition.distanceTo(lastCameraPosition) > positionThreshold;
            const rotationChanged = currentQuaternion.angleTo(lastCameraQuaternion) > quaternionThreshold;
            const matrixChanged = !currentMatrix.equals(lastCameraMatrix);
            
            // Update if any change detected and enough time has passed (debouncing)
            if ((positionChanged || rotationChanged || matrixChanged) && (now - lastUpdateTime > 16)) { // ~60fps max update rate
                
                // Camera has moved, update NaviCube
                isUpdatingFromCamera = true;
                updateNaviCubeFromCamera();
                isUpdatingFromCamera = false;
                
                // Update tracking variables
                lastCameraPosition.copy(currentPosition);
                lastCameraQuaternion.copy(currentQuaternion);
                lastCameraMatrix.copy(currentMatrix);
                lastUpdateTime = now;
                
                if (isDebugMode) {
                    console.log('NaviCube: Camera change detected', {
                        positionChanged,
                        rotationChanged,
                        matrixChanged,
                        position: currentPosition,
                        rotation: currentQuaternion
                    });
                }
            }
        }, 16); // Check every 16ms for 60fps responsiveness
        
        if (isDebugMode) {
            console.log('NaviCube: Enhanced camera monitoring started');
        }
    };

    const stopCameraMonitoring = () => {
        if (cameraUpdateInterval) {
            clearInterval(cameraUpdateInterval);
            cameraUpdateInterval = null;
            isMonitoringActive = false;
            if (isDebugMode) {
                console.log('NaviCube: Enhanced camera monitoring stopped');
            }
        }
    };

    // Enhanced camera monitoring initialization
    const initializeCameraMonitoring = () => {
        if (world.camera.three) {
            // Initialize tracking variables
            lastCameraPosition.copy(world.camera.three.position);
            lastCameraQuaternion.copy(world.camera.three.quaternion);
            lastCameraMatrix.copy(world.camera.three.matrixWorld);
            
            // Start enhanced monitoring
            startCameraMonitoring();
            
            // Initial NaviCube sync
            setTimeout(() => {
                if (!isUpdatingFromCamera) {
                    updateNaviCubeFromCamera();
                }
            }, 100);
            
            if (isDebugMode) {
                console.log('NaviCube: Camera monitoring initialized with initial position:', world.camera.three.position);
            }
        } else {
            // Retry until camera is available with exponential backoff
            setTimeout(initializeCameraMonitoring, 50);
        }
    };

    // Initialize camera monitoring
    initializeCameraMonitoring();
    let cubeRotationX = -90; // Initial rotation for TOP view
    let cubeRotationY = 0;   // Initial rotation for TOP view
    let isUpdatingFromCamera = false; // Flag to prevent infinite loops

    // Function to update camera based on cube rotation
    const updateCameraFromCubeRotation = () => {
        if (!world.camera.three || isUpdatingFromCamera) return;

        const camera3js = world.camera.three;
        const target = getModelCenter(); // Use model center
        
        // Calculate current distance to maintain zoom
        const currentDistance = camera3js.position.distanceTo(target);
        
        // Convert cube rotation to camera position with inversion for model-side logic
        const spherical = new THREE.Spherical();
        spherical.radius = currentDistance;
        spherical.phi = THREE.MathUtils.degToRad(90 + cubeRotationX);
        spherical.theta = THREE.MathUtils.degToRad(-cubeRotationY); // INVERT: NaviCube right face = camera on left side
        
        // Calculate new position
        const newPosition = new THREE.Vector3();
        newPosition.setFromSpherical(spherical);
        newPosition.add(target); // Add model center offset
        
        // Directly update camera position for smooth real-time dragging
        camera3js.position.copy(newPosition);
        
        // Check if camera state preservation is active (during projection switching)
        const isCameraStateBeingPreserved = (window as any).isCameraStateBeingPreserved?.() || false;
        
        if (!isCameraStateBeingPreserved) {
            camera3js.lookAt(target);
        } else {
            console.log("🔒 NaviCube: Skipping lookAt during camera state preservation");
        }
        
        if (isDebugMode) {
            console.log('NaviCube: Camera updated to:', newPosition, 'Rotation:', { x: cubeRotationX, y: cubeRotationY });
        }
    };

    // Enhanced function to update NaviCube rotation based on camera position and orientation
    const updateNaviCubeFromCamera = () => {
        if (!world.camera.three || isUpdatingFromCamera) return;

        const camera3js = world.camera.three;
        const target = getModelCenter(); // Use model center
        
        // Calculate camera position relative to target
        const relativePosition = camera3js.position.clone().sub(target);
        
        // Convert to spherical coordinates for better handling
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(relativePosition);
        
        // Calculate cube rotation based on spherical coordinates
        let newCubeRotationX = THREE.MathUtils.radToDeg(spherical.phi) - 90;
        let newCubeRotationY = -THREE.MathUtils.radToDeg(spherical.theta); // INVERTED: Camera on left = NaviCube shows right
        
        // Remove double quaternion application - spherical coordinates are sufficient
        
        // Normalize angles
        newCubeRotationY = ((newCubeRotationY % 360) + 360) % 360;
        if (newCubeRotationY > 180) newCubeRotationY -= 360;
        
        if (isDebugMode) {
            console.log('NaviCube: Using model center:', target);
            console.log('Camera position relative to model center:', relativePosition);
            console.log('Spherical coordinates:', {
                theta: spherical.theta * 180 / Math.PI,
                phi: spherical.phi * 180 / Math.PI,
                radius: spherical.radius
            });
        }
        
        // Enhanced threshold for smoother updates but avoiding jitter
        const threshold = 0.2; // More sensitive threshold
        const deltaX = Math.abs(newCubeRotationX - cubeRotationX);
        const deltaY = Math.abs(newCubeRotationY - cubeRotationY);
        
        if (deltaX > threshold || deltaY > threshold) {
            // Smooth interpolation for less jarring updates
            const lerpFactor = 0.3; // Adjust for smoothness vs responsiveness
            cubeRotationX = THREE.MathUtils.lerp(cubeRotationX, newCubeRotationX, lerpFactor);
            cubeRotationY = THREE.MathUtils.lerp(cubeRotationY, newCubeRotationY, lerpFactor);
            
            // Clamp X rotation to prevent flipping and limit bottom view to glimpse only
            cubeRotationX = Math.max(-85, Math.min(45, cubeRotationX)); // Limited bottom view to 45°
            
            // Update the visual cube rotation with smooth transitions
            const cube = element.querySelector('.cube') as HTMLElement;
            if (cube) {
                cube.style.transition = 'transform 0.1s ease-out';
                cube.style.transform = `rotateX(${cubeRotationX}deg) rotateY(${cubeRotationY}deg)`;
                
                // Remove transition after update to allow immediate updates
                setTimeout(() => {
                    cube.style.transition = '';
                }, 100);
            }
            
            if (isDebugMode) {
                console.log('NaviCube: Smooth update from camera', {
                    x: cubeRotationX.toFixed(1),
                    y: cubeRotationY.toFixed(1),
                    deltaX: deltaX.toFixed(1),
                    deltaY: deltaY.toFixed(1),
                    cameraPos: camera3js.position,
                    spherical: {
                        theta: spherical.theta * 180 / Math.PI,
                        phi: spherical.phi * 180 / Math.PI
                    }
                });
            }
        }
    };

    // Mouse event handlers for cube rotation
    const handleMouseDown = (event: MouseEvent) => {
        if (isDebugMode) {
            console.log('NaviCube: Mouse down detected', event.target);
        }
        
        const target = event.target as HTMLElement;
        
        // Allow dragging anywhere on the NaviCube (including faces/black boxes)
        const isOnNaviCube = target.closest('.navi-cube') === element;
        
        if (!isOnNaviCube) {
            if (isDebugMode) {
                console.log('NaviCube: Not on NaviCube, skipping drag');
            }
            return;
        }
        
        if (isDebugMode) {
            console.log('NaviCube: Starting potential drag');
        }
        isMouseDown = true;
        isDragging = false;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        
        // Temporarily stop camera monitoring during NaviCube interaction
        stopCameraMonitoring();
        
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
            if (isDebugMode) {
                console.log('NaviCube: Drag started - rotating camera');
            }
        }
        
        if (!isDragging) return;

        // Rotation sensitivity - make it more responsive
        const sensitivity = 1.0; // Increased sensitivity
        
        // Visual NaviCube rotation: Drag right = rotate right (intuitive)
        cubeRotationY += deltaX * sensitivity; // NORMAL: Drag right rotates cube right
        cubeRotationX -= deltaY * sensitivity; // Negative for intuitive up/down
        
        // Clamp X rotation to prevent flipping and limit bottom view to glimpse only
        cubeRotationX = Math.max(-89, Math.min(45, cubeRotationX)); // Limited bottom view to 45°
        
        // Update cube visual rotation
        const cube = element.querySelector('.cube') as HTMLElement;
        if (cube) {
            cube.style.transform = `rotateX(${cubeRotationX}deg) rotateY(${cubeRotationY}deg)`;
        }
        
        // Update camera position to match cube orientation
        if (!isUpdatingFromCamera) {
            updateCameraFromCubeRotation();
        }

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        
        // Prevent any other mouse move handlers from interfering
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    };

    const handleMouseUp = () => {
        if (isDebugMode) {
            console.log('NaviCube: Mouse up, was dragging:', isDragging, 'isMouseDown:', isMouseDown);
        }
        
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
        
        // Restart camera monitoring after interaction
        setTimeout(() => {
            startCameraMonitoring();
        }, 100);
        
        // Keep isDragging state for the click handler to prevent accidental clicks
        if (isDragging) {
            setTimeout(() => {
                isDragging = false;
                if (isDebugMode) {
                    console.log('NaviCube: Drag state reset');
                }
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
                if (isDebugMode) {
                    console.log('NaviCube: Not on NaviCube, skipping touch drag');
                }
                return;
            }
            
            if (isDebugMode) {
                console.log('NaviCube: Starting touch potential drag');
            }
            isMouseDown = true;
            isDragging = false;
            lastMouseX = event.touches[0].clientX;
            lastMouseY = event.touches[0].clientY;
            
            // Temporarily stop camera monitoring during touch interaction
            stopCameraMonitoring();
            
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
            if (isDebugMode) {
                console.log('NaviCube: Touch drag started - rotating camera');
            }
        }
        
        if (!isDragging) return;

        const sensitivity = 1.0; // Increased sensitivity
        
        // Visual NaviCube rotation: Drag right = rotate right (same as mouse)
        cubeRotationY += deltaX * sensitivity; // NORMAL: Drag right rotates cube right
        cubeRotationX -= deltaY * sensitivity;
        
        cubeRotationX = Math.max(-89, Math.min(45, cubeRotationX)); // Limited bottom view to 45°
        
        const cube = element.querySelector('.cube') as HTMLElement;
        if (cube) {
            cube.style.transform = `rotateX(${cubeRotationX}deg) rotateY(${cubeRotationY}deg)`;
        }
        
        if (!isUpdatingFromCamera) {
            updateCameraFromCubeRotation();
        }

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
        
        // Restart camera monitoring after touch interaction
        setTimeout(() => {
            startCameraMonitoring();
        }, 100);
        
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
            
            // Look at target (but respect camera state preservation)
            const isCameraStateBeingPreserved = (window as any).isCameraStateBeingPreserved?.() || false;
            if (!isCameraStateBeingPreserved) {
                camera.lookAt(targetLookAt);
            }

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
        
        // Check if camera state preservation is active (during projection switching)
        const isCameraStateBeingPreserved = (window as any).isCameraStateBeingPreserved?.() || false;
        
        if (!isCameraStateBeingPreserved) {
            camera3js.lookAt(orthographicTarget);
        } else {
            console.log("🔒 NaviCube: Skipping lookAt during camera state preservation");
        }
        
        // Ensure orthographic camera has proper frustum - critical for rendering
        if (camera3js.type === 'OrthographicCamera') {
            const orthoCam = camera3js as THREE.OrthographicCamera;
            const size = 10;
            const aspect = window.innerWidth / window.innerHeight;
            
            orthoCam.left = -size * aspect;
            orthoCam.right = size * aspect;
            orthoCam.top = size;
            orthoCam.bottom = -size;
            orthoCam.near = 1;
            orthoCam.far = 1000;
            orthoCam.zoom = 1;
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
    
    // Add exposed methods for external triggering
    (element as any).triggerTopView = () => {
        console.log('NaviCube: triggerTopView called externally');
        initializeTopView();
    };
    
    // Expose method to force immediate camera sync
    (element as any).syncWithCamera = () => {
        console.log('NaviCube: syncWithCamera called externally');
        if (world.camera.three && !isUpdatingFromCamera) {
            updateNaviCubeFromCamera();
        }
    };
    
    // Expose method to restart monitoring
    (element as any).restartMonitoring = () => {
        console.log('NaviCube: restartMonitoring called externally');
        stopCameraMonitoring();
        setTimeout(() => {
            initializeCameraMonitoring();
        }, 50);
    };
    
    // Enhanced model loaded event handler for immediate camera sync
    const handleModelLoaded = (event: CustomEvent) => {
        console.log('NaviCube: Received modelLoaded event:', event.detail);
        console.log('NaviCube: Initializing camera sync after model load...');
        
        // Ensure camera monitoring is active
        if (!isMonitoringActive) {
            initializeCameraMonitoring();
        }
        
        // Small delay to ensure model is fully rendered, then sync
        setTimeout(() => {
            // Initialize to TOP view first
            initializeTopView();
            
            // Then ensure immediate sync with camera state
            setTimeout(() => {
                if (world.camera.three && !isUpdatingFromCamera) {
                    console.log('NaviCube: Performing initial camera sync after model load');
                    updateNaviCubeFromCamera();
                }
            }, 50);
        }, 100);
    };
    
    // Add event listeners
    window.addEventListener('modelLoaded', handleModelLoaded as EventListener);
    
    console.log('NaviCube: Ready to respond to model load events');

    // Enhanced cleanup function to handle all monitoring and events
    (element as any).cleanup = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('modelLoaded', handleModelLoaded as EventListener);
        window.removeEventListener('cameraChanged', handleGlobalCameraChange);
        
        // Stop enhanced camera monitoring
        stopCameraMonitoring();
        
        // Reset state variables
        isMouseDown = false;
        isDragging = false;
        isMonitoringActive = false;
        isUpdatingFromCamera = false;
        
        // Clear timing variables
        lastUpdateTime = 0;
        
        // Remove styles
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
        
        console.log('NaviCube: Enhanced cleanup completed - all monitoring and events cleared');
    };

    console.log('NaviCube component created:', element);
    
    return element;
};