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

        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;

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
        
        // No restrictions - allow full 360° rotation in all directions
        // (Unlike perspective mode, no clamping of phi)
        
        // Convert back to Cartesian coordinates
        vector.setFromSpherical(spherical);
        camera.position.copy(vector);
        
        // Always look at the origin (model center)
        camera.lookAt(0, 0, 0);
        
        console.log('Orthographic rotation - free 360° (speed x' + speedMultiplier.toFixed(1) + '):', {
            theta: spherical.theta * 180 / Math.PI,
            phi: spherical.phi * 180 / Math.PI,
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