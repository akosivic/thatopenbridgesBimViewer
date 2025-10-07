import * as THREE from "three";
import * as OBC from "@thatopen/components";
import { getCurrentProjection } from "./ProjectionControls";
import { getCurrentSpeed } from "./CameraSettings";

// Orthographic-specific mouse controls
export class OrthographicMouseControls {
    private world: OBC.World;
    private viewport: HTMLElement;
    private isLeftMouseDown = false;
    private isMiddleMouseDown = false;
    private lastMouseX = 0;
    private lastMouseY = 0;
    private rotationSpeed = 0.005;
    private panSpeed = 0.01;
    
    // Delta limiting to prevent mouse boundary flips
    private readonly MAX_DELTA = 50; // More aggressive limit - 50px max
    private readonly SMOOTH_THRESHOLD = 25; // Start smoothing above 25px
    private previousDeltaX = 0;
    private previousDeltaY = 0;

    constructor(world: OBC.World, viewport: HTMLElement) {
        this.world = world;
        this.viewport = viewport;
        this.setupEventListeners();
        this.setupSpeedChangeListener();
    }

    private setupSpeedChangeListener() {
        // Listen for speed changes to update orthographic controls dynamically
        window.addEventListener('moveSpeedChange', this.onSpeedChange);
    }

    private setupEventListeners() {
        // Mouse event listeners
        this.viewport.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.viewport.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.viewport.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.viewport.addEventListener('mouseleave', this.onMouseLeave.bind(this));
        
        // Prevent context menu on right click
        this.viewport.addEventListener('contextmenu', (e) => {
            if (getCurrentProjection() === "Orthographic") {
                e.preventDefault();
            }
        });

        // Mouse wheel for zoom
        this.viewport.addEventListener('wheel', this.onWheel.bind(this));
    }

    private isToolbarButton(target: EventTarget | null): boolean {
        if (!target || !(target instanceof HTMLElement)) return false;
        return !!target.closest(`
            bim-tabs, 
            bim-tab, 
            bim-toolbar, 
            bim-button, 
            bim-toolbar-section, 
            .screenshot-btn,
            .custom-tabs-container,
            .custom-tab-headers,
            .custom-tab-button,
            .left-panel-minimize-btn,
            .left-panel-expand-btn,
            bim-panel,
            bim-panel-section,
            bim-selector,
            bim-option,
            input,
            button,
            select
        `.replace(/\\s+/g, ''));
    }

    private onMouseDown(event: MouseEvent) {
        // Only handle in orthographic mode
        if (getCurrentProjection() !== "Orthographic") return;
        
        // Don't interfere with toolbar buttons
        if (this.isToolbarButton(event.target)) return;

        if (event.button === 0) { // Left mouse button - rotation
            this.isLeftMouseDown = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            // Reset delta tracking to prevent initial jump
            this.previousDeltaX = 0;
            this.previousDeltaY = 0;
            this.viewport.style.cursor = 'grab';
            console.log('Orthographic rotation started');
        } else if (event.button === 1) { // Middle mouse button - pan
            this.isMiddleMouseDown = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            // Reset delta tracking to prevent initial jump
            this.previousDeltaX = 0;
            this.previousDeltaY = 0;
            this.viewport.style.cursor = 'move';
            event.preventDefault(); // Prevent browser scroll
            console.log('Orthographic pan started');
        }
    }

    private onMouseMove(event: MouseEvent) {
        // Only handle in orthographic mode
        if (getCurrentProjection() !== "Orthographic") return;

        const rawDeltaX = event.clientX - this.lastMouseX;
        const rawDeltaY = event.clientY - this.lastMouseY;
        
        // Apply delta clamping to prevent mouse boundary flips
        const clampedDeltas = this.clampAndSmoothDeltas(rawDeltaX, rawDeltaY);
        const deltaX = clampedDeltas.x;
        const deltaY = clampedDeltas.y;

        if (this.isLeftMouseDown) {
            // Left mouse drag - rotate camera around model (360°)
            this.rotateCamera(deltaX, deltaY);
        } else if (this.isMiddleMouseDown) {
            // Middle mouse drag - pan camera
            this.panCamera(deltaX, deltaY);
        }

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        
        // Store for momentum calculation
        this.previousDeltaX = deltaX;
        this.previousDeltaY = deltaY;
    }

    /**
     * Clamps and smooths mouse deltas to prevent flipping when mouse hits boundaries
     * or moves extremely fast
     */
    private clampAndSmoothDeltas(rawDeltaX: number, rawDeltaY: number): { x: number, y: number } {
        // Calculate magnitude of movement
        const magnitude = Math.sqrt(rawDeltaX * rawDeltaX + rawDeltaY * rawDeltaY);
        
        // Aggressive clamping for very large movements that cause flipping
        if (magnitude > 200) {
            console.log('EXTREME movement detected - applying heavy clamping:', { magnitude, raw: { x: rawDeltaX, y: rawDeltaY } });
            // For movements > 200px, reduce to tiny amount to prevent flip
            return { 
                x: Math.sign(rawDeltaX) * 5, 
                y: Math.sign(rawDeltaY) * 5 
            };
        }
        
        // If movement is within normal range, use as-is
        if (magnitude <= this.SMOOTH_THRESHOLD) {
            return { x: rawDeltaX, y: rawDeltaY };
        }
        
        // For extreme movements, apply progressive clamping
        let clampedX = rawDeltaX;
        let clampedY = rawDeltaY;
        
        // Hard limit: Never allow movement larger than MAX_DELTA
        if (Math.abs(rawDeltaX) > this.MAX_DELTA) {
            clampedX = Math.sign(rawDeltaX) * this.MAX_DELTA;
        }
        if (Math.abs(rawDeltaY) > this.MAX_DELTA) {
            clampedY = Math.sign(rawDeltaY) * this.MAX_DELTA;
        }
        
        // Smooth falloff for fast movements
        if (magnitude > this.SMOOTH_THRESHOLD) {
            const smoothFactor = Math.min(1.0, this.SMOOTH_THRESHOLD / magnitude);
            clampedX *= smoothFactor;
            clampedY *= smoothFactor;
        }
        
        // Enhanced momentum dampening to prevent sudden direction changes
        const momentumFactor = 0.5; // Reduced to 50% for more stability
        if (this.previousDeltaX !== 0 || this.previousDeltaY !== 0) {
            const directionChangeX = Math.abs(Math.sign(clampedX) - Math.sign(this.previousDeltaX));
            const directionChangeY = Math.abs(Math.sign(clampedY) - Math.sign(this.previousDeltaY));
            
            if (directionChangeX > 0) {
                clampedX *= momentumFactor;
            }
            if (directionChangeY > 0) {
                clampedY *= momentumFactor;
            }
        }
        
        // Log extreme movements for debugging
        if (magnitude > this.MAX_DELTA) {
            console.log('Mouse delta clamped:', {
                raw: { x: rawDeltaX, y: rawDeltaY, magnitude },
                clamped: { x: clampedX, y: clampedY }
            });
        }
        
        return { x: clampedX, y: clampedY };
    }

    private onMouseUp(event: MouseEvent) {
        // Only handle in orthographic mode
        if (getCurrentProjection() !== "Orthographic") return;

        if (event.button === 0) {
            this.isLeftMouseDown = false;
            // Reset delta tracking when rotation ends
            this.previousDeltaX = 0;
            this.previousDeltaY = 0;
            console.log('Orthographic rotation ended');
        } else if (event.button === 1) {
            this.isMiddleMouseDown = false;
            // Reset delta tracking when panning ends  
            this.previousDeltaX = 0;
            this.previousDeltaY = 0;
            console.log('Orthographic pan ended');
        }

        this.viewport.style.cursor = 'default';
    }

    private onMouseLeave() {
        this.isLeftMouseDown = false;
        this.isMiddleMouseDown = false;
        // Reset delta tracking when mouse leaves viewport
        this.previousDeltaX = 0;
        this.previousDeltaY = 0;
        this.viewport.style.cursor = 'default';
    }

    private onWheel(event: WheelEvent) {
        // Only handle in orthographic mode
        if (getCurrentProjection() !== "Orthographic") return;

        event.preventDefault();
        
        // Mouse wheel - zoom in/out
        this.zoomCamera(event.deltaY);
    }

    private rotateCamera(deltaX: number, deltaY: number) {
        if (!this.world?.camera?.three) return;

        const camera = this.world.camera.three;
        
        // Get current speed multiplier from camera settings
        const currentSpeed = getCurrentSpeed();
        const speedMultiplier = currentSpeed / 5.0; // Normalize against base speed
        
        // Apply speed to rotation
        const adjustedRotationSpeed = this.rotationSpeed * speedMultiplier;
        
        // Get the camera's current position relative to the origin (model center)
        const spherical = new THREE.Spherical();
        const vector = new THREE.Vector3();
        
        // Calculate spherical coordinates from current position
        vector.copy(camera.position);
        spherical.setFromVector3(vector);
        
        // Apply rotation deltas with speed adjustment
        spherical.theta -= deltaX * adjustedRotationSpeed; // Horizontal rotation (360°)
        spherical.phi += deltaY * adjustedRotationSpeed;   // Vertical rotation
        
        // CRITICAL FIX: Constrain phi to prevent gimbal lock and flipping
        // Allow near-full rotation but avoid mathematical singularities
        const epsilon = 0.1; // Small margin to prevent singularities
        spherical.phi = Math.max(epsilon, Math.min(Math.PI - epsilon, spherical.phi));
        
        // Normalize theta to prevent accumulation errors
        spherical.theta = spherical.theta % (2 * Math.PI);
        
        // Ensure radius stays consistent
        if (spherical.radius <= 0) {
            spherical.radius = 10; // Fallback distance
        }
        
        // Convert back to Cartesian coordinates
        vector.setFromSpherical(spherical);
        camera.position.copy(vector);
        
        // Always look at the origin (model center)
        camera.lookAt(0, 0, 0);
        
        // Notify NaviCube of camera change
        window.dispatchEvent(new CustomEvent('cameraChanged', {
            detail: { source: 'orthographic-rotation', position: camera.position, rotation: camera.quaternion }
        }));
        
        console.log('Orthographic rotation - constrained (speed x' + speedMultiplier.toFixed(1) + '):', {
            theta: spherical.theta * 180 / Math.PI,
            phi: spherical.phi * 180 / Math.PI,
            phiClamped: spherical.phi >= epsilon && spherical.phi <= Math.PI - epsilon,
            position: camera.position
        });
    }

    private panCamera(deltaX: number, deltaY: number) {
        if (!this.world?.camera?.three) return;

        const camera = this.world.camera.three;
        
        // Get current speed multiplier from camera settings
        const currentSpeed = getCurrentSpeed();
        const speedMultiplier = currentSpeed / 5.0; // Normalize against base speed
        
        // Apply speed to panning
        const adjustedPanSpeed = this.panSpeed * speedMultiplier;
        
        // Get camera's right and up vectors
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        
        camera.getWorldDirection(new THREE.Vector3()); // Update camera matrix
        right.setFromMatrixColumn(camera.matrix, 0); // X axis
        up.setFromMatrixColumn(camera.matrix, 1);    // Y axis
        
        // Calculate pan movement with speed adjustment
        const panVector = new THREE.Vector3();
        panVector.addScaledVector(right, -deltaX * adjustedPanSpeed);
        panVector.addScaledVector(up, deltaY * adjustedPanSpeed);
        
        // Apply pan to camera position
        camera.position.add(panVector);
        
        // Notify NaviCube of camera change
        window.dispatchEvent(new CustomEvent('cameraChanged', {
            detail: { source: 'orthographic-pan', position: camera.position }
        }));
        
        console.log('Orthographic pan (speed x' + speedMultiplier.toFixed(1) + '):', camera.position);
    }

    private zoomCamera(deltaY: number) {
        if (!this.world?.camera) return;
        if (!(this.world.camera instanceof OBC.OrthoPerspectiveCamera)) return;

        // Get current speed multiplier from camera settings
        const currentSpeed = getCurrentSpeed();
        const speedMultiplier = currentSpeed / 5.0; // Normalize against base speed
        
        // Apply speed to zoom
        const baseZoomSpeed = 0.1;
        const adjustedZoomSpeed = baseZoomSpeed * speedMultiplier;
        
        const currentZoom = this.world.camera.three.zoom || 1;
        const direction = deltaY > 0 ? -adjustedZoomSpeed : adjustedZoomSpeed;
        
        const newZoom = Math.max(0.01, Math.min(100, currentZoom + direction));
        this.world.camera.three.zoom = newZoom;
        this.world.camera.three.updateProjectionMatrix();
        
        // Notify NaviCube of camera change (zoom affects view but not cube rotation typically)
        window.dispatchEvent(new CustomEvent('cameraChanged', {
            detail: { source: 'orthographic-zoom', zoom: newZoom }
        }));
        
        console.log('Orthographic zoom (speed x' + speedMultiplier.toFixed(1) + '):', newZoom);
    }

    public cleanup() {
        this.isLeftMouseDown = false;
        this.isMiddleMouseDown = false;
        this.viewport.style.cursor = 'default';
        
        // Clean up speed change listener
        window.removeEventListener('moveSpeedChange', this.onSpeedChange);
        
        console.log('Orthographic mouse controls cleaned up');
    }

    private onSpeedChange = () => {
        console.log('Speed changed - orthographic controls will use new speed setting');
    };
}

// Global instance
let orthographicMouseControls: OrthographicMouseControls | null = null;

export const initializeOrthographicControls = (world: OBC.World, viewport: HTMLElement) => {
    if (orthographicMouseControls) {
        orthographicMouseControls.cleanup();
    }
    
    orthographicMouseControls = new OrthographicMouseControls(world, viewport);
    console.log('Orthographic mouse controls initialized');
    
    return orthographicMouseControls;
};

export const getOrthographicControls = () => orthographicMouseControls;