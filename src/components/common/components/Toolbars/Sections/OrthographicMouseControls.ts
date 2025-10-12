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
    private panSpeed = 0.05; // Increased from 0.01 to 0.05 for more responsive middle mouse dragging

    constructor(world: OBC.World, viewport: HTMLElement) {
        this.world = world;
        this.viewport = viewport;
        this.setupEventListeners();
        this.setupSpeedChangeListener();
    }

    private getModelCenter(): THREE.Vector3 {
        // Calculate model center from all meshes in the scene
        if (this.world.meshes.size > 0) {
            const bbox = new THREE.Box3();
            this.world.meshes.forEach(mesh => {
                bbox.expandByObject(mesh);
            });
            
            if (!bbox.isEmpty()) {
                return bbox.getCenter(new THREE.Vector3());
            }
        }
        
        // Fallback to origin if no meshes or empty bounds
        return new THREE.Vector3(0, 0, 0);
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
            this.viewport.style.cursor = 'grab';
            console.log('Orthographic rotation started');
        } else if (event.button === 1) { // Middle mouse button - pan
            this.isMiddleMouseDown = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
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
    }

    /**
     * Clamps and smooths mouse deltas to prevent flipping when mouse hits boundaries
     * or moves extremely fast. Uses more intelligent detection to avoid interfering with normal use.
     */
    private clampAndSmoothDeltas(rawDeltaX: number, rawDeltaY: number): { x: number, y: number } {
        // Calculate magnitude of movement
        const magnitude = Math.sqrt(rawDeltaX * rawDeltaX + rawDeltaY * rawDeltaY);
        
        // Only apply extreme clamping for truly unrealistic movements (mouse teleportation)
        // Increased threshold to 500px to avoid interfering with fast but normal movements
        if (magnitude > 500) {
            console.log('EXTREME movement detected - likely mouse teleportation:', { magnitude, raw: { x: rawDeltaX, y: rawDeltaY } });
            // Instead of tiny movement, use moderate clamping to maintain responsiveness
            const maxReasonable = 50; // Allow up to 50px movement
            const scale = maxReasonable / magnitude;
            return { 
                x: rawDeltaX * scale, 
                y: rawDeltaY * scale 
            };
        }
        
        // For normal to fast movements (under 500px), allow them through
        // This prevents the system from interfering with normal mouse usage
        if (magnitude <= 100) {
            // Normal movement - no clamping needed
            return { x: rawDeltaX, y: rawDeltaY };
        }
        
        // For moderately fast movements (100-500px), apply gentle smoothing only
        // This handles fast mouse movements without making them feel sluggish
        const smoothingFactor = Math.min(1.0, 100 / magnitude);
        const smoothedX = rawDeltaX * (0.7 + 0.3 * smoothingFactor); // Gentler smoothing
        const smoothedY = rawDeltaY * (0.7 + 0.3 * smoothingFactor);
        
        return { x: smoothedX, y: smoothedY };
    }

    private onMouseUp(event: MouseEvent) {
        // Only handle in orthographic mode
        if (getCurrentProjection() !== "Orthographic") return;

        if (event.button === 0) {
            this.isLeftMouseDown = false;
            console.log('Orthographic rotation ended');
        } else if (event.button === 1) {
            this.isMiddleMouseDown = false;
            console.log('Orthographic pan ended');
        }

        this.viewport.style.cursor = 'default';
    }

    private onMouseLeave() {
        this.isLeftMouseDown = false;
        this.isMiddleMouseDown = false;
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
        
        // Get current speed multiplier from camera settings (using consistent normalization)
        const currentSpeed = getCurrentSpeed();
        const speedMultiplier = currentSpeed / 5.0; // Use baseSpeed (5.0) for consistent normalization
        
        // Apply speed to rotation
        const adjustedRotationSpeed = this.rotationSpeed * speedMultiplier;
        
        // Get the model center for consistent lookAt target
        const modelCenter = this.getModelCenter();
        
        // Get the camera's current position relative to the model center
        const spherical = new THREE.Spherical();
        const vector = new THREE.Vector3();
        
        // Calculate spherical coordinates relative to model center (not origin)
        vector.copy(camera.position).sub(modelCenter); // Position relative to model center
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
        
        // Convert back to Cartesian coordinates relative to model center
        vector.setFromSpherical(spherical);
        camera.position.copy(vector.add(modelCenter)); // Add model center back to get world position
        
        // Always look at the model center for consistency with projection switching
        camera.lookAt(modelCenter);
        
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
        
        // Get current speed multiplier from camera settings (using consistent normalization)
        const currentSpeed = getCurrentSpeed();
        const speedMultiplier = currentSpeed / 5.0; // Use baseSpeed (5.0) for consistent normalization
        
        // Apply speed to panning with a more responsive feel for middle mouse dragging
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

        // Use a fixed, small zoom speed for mouse wheel - don't apply speed multiplier
        // Mouse wheel should have consistent, fine-grained control regardless of movement speed setting
        const baseZoomSpeed = 0.05; // Reduced from 0.1 and no speed multiplier applied
        
        const currentZoom = this.world.camera.three.zoom || 1;
        const direction = deltaY > 0 ? -baseZoomSpeed : baseZoomSpeed;
        
        const newZoom = Math.max(0.001, Math.min(100, currentZoom + direction)); // Reduced from 0.01 to 0.001
        this.world.camera.three.zoom = newZoom;
        this.world.camera.three.updateProjectionMatrix();
        
        // Notify NaviCube of camera change (zoom affects view but not cube rotation typically)
        window.dispatchEvent(new CustomEvent('cameraChanged', {
            detail: { source: 'orthographic-zoom', zoom: newZoom }
        }));
        
        console.log('Orthographic zoom (fixed speed):', newZoom);
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