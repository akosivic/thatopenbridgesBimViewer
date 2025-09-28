import * as THREE from "three";
import * as OBC from "@thatopen/components";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import { getCurrentProjection } from "./ProjectionControls";

// Global references
let fpControls: PointerLockControls | null = null;
let world: OBC.World | null = null;
let moveSpeed = 5.0;

export const setKeyboardControlsContext = (controls: PointerLockControls | null, worldContext: OBC.World, speed: number) => {
    fpControls = controls;
    world = worldContext;
    moveSpeed = speed;
};

// Key state tracking
const keys: Record<string, boolean> = {
    // Movement keys
    arrowup: false,
    arrowdown: false,
    arrowleft: false,
    arrowright: false,
    keyw: false,
    keys: false,
    keya: false,
    keyd: false,
    // Vertical movement
    keyq: false, // Up
    keye: false, // Down
    // Modifiers
    shiftleft: false, // Sprint
    controlleft: false, // Orbit mode for orthographic
    controlright: false
};

// Movement vectors
const upVector = new THREE.Vector3(0, 1, 0);

let animationFrame: number | null = null;

// Enhanced movement function with projection-specific behavior
const updateMovement = () => {
    if (!world?.camera.three || !fpControls) {
        return;
    }

    const camera = world.camera.three;
    const currentProjection = getCurrentProjection();
    const isOrthographic = currentProjection === "Orthographic";
    const isPerspective = currentProjection === "Perspective";
    
    // Calculate movement vectors from camera orientation
    const cameraMatrix = new THREE.Matrix4();
    camera.updateMatrixWorld();
    cameraMatrix.extractRotation(camera.matrixWorld);
    
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    cameraMatrix.extractBasis(right, upVector, forward);
    forward.negate(); // Camera looks down negative Z

    // Base movement distance (same for both modes)
    const dt = 0.016; // ~60fps
    let currentSpeed = moveSpeed;
    
    // Sprint modifier
    if (keys.shiftleft) {
        currentSpeed *= 2;
    }

    const moveDistance = currentSpeed * dt;
    let moved = false;

    // Movement controls with projection-specific behavior
    if (keys.arrowup || keys.keyw) {
        if (isPerspective) {
            // Perspective: Move in camera forward direction
            camera.position.addScaledVector(forward, moveDistance);
        } else {
            // Orthographic: Move in camera forward direction (default CAD behavior)
            camera.position.addScaledVector(forward, moveDistance);
        }
        moved = true;
    }
    
    if (keys.arrowdown || keys.keys) {
        if (isPerspective) {
            // Perspective: Move in camera backward direction
            camera.position.addScaledVector(forward, -moveDistance);
        } else {
            // Orthographic: Move in camera backward direction (default CAD behavior)
            camera.position.addScaledVector(forward, -moveDistance);
        }
        moved = true;
    }
    
    if (keys.arrowleft || keys.keya) {
        if (isPerspective) {
            // Perspective: Strafe left
            camera.position.addScaledVector(right, -moveDistance);
        } else {
            // Orthographic: Pan left 
            camera.position.addScaledVector(right, -moveDistance);
        }
        moved = true;
    }
    
    if (keys.arrowright || keys.keyd) {
        if (isPerspective) {
            // Perspective: Strafe right
            camera.position.addScaledVector(right, moveDistance);
        } else {
            // Orthographic: Pan right
            camera.position.addScaledVector(right, moveDistance);
        }
        moved = true;
    }

    // Vertical movement (same for both modes)
    if (keys.keyq) {
        camera.position.y += moveDistance;
        moved = true;
    }
    
    if (keys.keye) {
        camera.position.y -= moveDistance;
        moved = true;
    }

    // Rotation controls - projection-specific behavior
    const rotationSpeed = 0.08;
    
    if (isPerspective) {
        // In perspective mode, keyboard rotation is disabled - use mouse look instead
        // This matches FPS-style controls
    } else if (isOrthographic) {
        // In orthographic mode, Ctrl + Arrow keys for orbit rotation (no restrictions)
        if (keys.controlleft || keys.controlright) {
            const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
            
            if (keys.arrowleft) {
                euler.y += rotationSpeed * dt;
                moved = true;
            }
            if (keys.arrowright) {
                euler.y -= rotationSpeed * dt;
                moved = true;
            }
            if (keys.arrowup) {
                // Orthographic: No restrictions, allow full rotation
                euler.x += rotationSpeed * dt;
                moved = true;
            }
            if (keys.arrowdown) {
                // Orthographic: No restrictions, allow full rotation
                euler.x -= rotationSpeed * dt;
                moved = true;
            }
            
            camera.quaternion.setFromEuler(euler);
        }
    }

    // Y-axis restrictions only apply to perspective mode (FPS-style)
    if (isPerspective && (keys.arrowup || keys.arrowdown || keys.keyw || keys.keys || 
                         keys.arrowleft || keys.arrowright || keys.keya || keys.keyd)) {
        // Only lock Y in perspective mode, and only if not using Q/E for vertical movement
        if (!keys.keyq && !keys.keye) {
            camera.position.y = 1.6; // Eye level height lock for perspective mode only
        }
    }
    // In orthographic mode: No Y-axis restrictions, allow free 3D movement

    if (moved) {
        if (isPerspective) {
            console.log(`${currentProjection} movement (FPS restrictions):`, camera.position);
        } else {
            console.log(`${currentProjection} movement (no restrictions):`, camera.position);
        }
    }

    // Continue the animation loop
    animationFrame = requestAnimationFrame(updateMovement);
};

const handleKeyDown = (event: KeyboardEvent) => {
    const key = event.code.toLowerCase();
    
    if (keys.hasOwnProperty(key)) {
        keys[key] = true;
        
        // Start animation loop if not already running
        if (!animationFrame) {
            animationFrame = requestAnimationFrame(updateMovement);
        }
        
        // Prevent default for movement keys
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'keyw', 'keys', 'keya', 'keyd', 'keyq', 'keye'].includes(key)) {
            event.preventDefault();
        }
    }
};

const handleKeyUp = (event: KeyboardEvent) => {
    const key = event.code.toLowerCase();
    
    if (keys.hasOwnProperty(key)) {
        keys[key] = false;
        
        // Stop animation loop if no keys are pressed
        const anyKeyPressed = Object.values(keys).some(pressed => pressed);
        if (!anyKeyPressed && animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    }
};

// Mouse wheel handling for zoom (both modes)
const handleWheel = (event: WheelEvent) => {
    if (!world?.camera) return;
    
    const currentProjection = getCurrentProjection();
    
    if (world.camera instanceof OBC.OrthoPerspectiveCamera) {
        event.preventDefault();
        
        const zoomSpeed = 0.1;
        const currentZoom = world.camera.three.zoom || 1;
        const direction = event.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        
        const newZoom = Math.max(0.1, Math.min(5, currentZoom + direction));
        world.camera.three.zoom = newZoom;
        world.camera.three.updateProjectionMatrix();
        
        console.log(`${currentProjection} zoom:`, newZoom);
    }
};

// Initialize event listeners
export const initializeKeyboardControls = () => {
    // Remove existing listeners first
    cleanupKeyboardControls();
    
    // Add new listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    console.log('Enhanced keyboard controls initialized with projection-specific bindings');
};

// Cleanup function
export const cleanupKeyboardControls = () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    document.removeEventListener('wheel', handleWheel);
    
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    // Reset all keys
    Object.keys(keys).forEach(key => keys[key] = false);
};

// Listen for projection changes to adjust behavior
window.addEventListener('projectionChanged', (event: any) => {
    const { mode } = event.detail;
    console.log(`Keyboard controls adapted for ${mode} mode`);
    
    // Reset any ongoing movement when switching modes
    Object.keys(keys).forEach(key => keys[key] = false);
    
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
});

export { keys as getKeyState };