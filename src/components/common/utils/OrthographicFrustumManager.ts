/**
 * Dynamic Orthographic Camera Frustum Manager
 * 
 * This utility dynamically adjusts the orthographic camera's near/far clipping planes
 * based on the model bounds and camera position to prevent the "slicing" effect.
 */

import * as THREE from "three";
import * as OBC from "@thatopen/components";
import { debugLog, debugWarn } from "../../../utils/debugLogger";

export class OrthographicFrustumManager {
    private world: OBC.World;
    private modelBounds: THREE.Box3 | null = null;
    private isDebugMode: boolean;

    constructor(world: OBC.World) {
        this.world = world;
        this.isDebugMode = window.location.search.toLowerCase().includes('debug');
    }

    /**
     * Calculate model bounds from all meshes in the scene
     */
    public calculateModelBounds(): THREE.Box3 | null {
        if (this.world.meshes.size === 0) {
            debugWarn('No meshes found for frustum calculation');
            return null;
        }

        const bbox = new THREE.Box3();
        this.world.meshes.forEach(mesh => {
            bbox.expandByObject(mesh);
        });

        if (bbox.isEmpty()) {
            debugWarn('Model bounds are empty');
            return null;
        }

        this.modelBounds = bbox;
        
        if (this.isDebugMode) {
            const size = bbox.getSize(new THREE.Vector3());
            const center = bbox.getCenter(new THREE.Vector3());
            debugLog('Model bounds calculated:', {
                center: center,
                size: size,
                min: bbox.min,
                max: bbox.max
            });
        }

        return bbox;
    }

    /**
     * Calculate optimal near and far planes for orthographic camera
     */
    public calculateOptimalFrustum(cameraPosition: THREE.Vector3): { near: number, far: number } {
        if (!this.modelBounds) {
            this.calculateModelBounds();
        }

        if (!this.modelBounds) {
            // Fallback values if no model bounds available
            return { near: 0.1, far: 1000 };
        }

        // Get model center and size
        const modelCenter = this.modelBounds.getCenter(new THREE.Vector3());
        const modelSize = this.modelBounds.getSize(new THREE.Vector3());
        const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);

        // Calculate distance from camera to model center
        const distanceToCenter = cameraPosition.distanceTo(modelCenter);

        // Calculate distances to model bounds
        const distanceToNearestPoint = cameraPosition.distanceTo(this.modelBounds.min) < cameraPosition.distanceTo(this.modelBounds.max) 
            ? cameraPosition.distanceTo(this.modelBounds.min)
            : cameraPosition.distanceTo(this.modelBounds.max);

        const distanceToFarthestPoint = cameraPosition.distanceTo(this.modelBounds.min) > cameraPosition.distanceTo(this.modelBounds.max)
            ? cameraPosition.distanceTo(this.modelBounds.min)
            : cameraPosition.distanceTo(this.modelBounds.max);

        // Calculate optimal near and far with safety margins
        const safetyMargin = maxDimension * 0.5; // 50% of model size as safety margin
        const near = Math.max(0.01, distanceToNearestPoint - safetyMargin);
        const far = distanceToFarthestPoint + safetyMargin;

        // Ensure far is always greater than near
        const finalNear = Math.max(0.01, near);
        const finalFar = Math.max(finalNear + 1, far);

        if (this.isDebugMode) {
            debugLog('Frustum calculation:', {
                cameraPosition: cameraPosition,
                modelCenter: modelCenter,
                distanceToCenter: distanceToCenter,
                distanceToNearest: distanceToNearestPoint,
                distanceToFarthest: distanceToFarthestPoint,
                safetyMargin: safetyMargin,
                calculatedNear: near,
                calculatedFar: far,
                finalNear: finalNear,
                finalFar: finalFar
            });
        }

        return { near: finalNear, far: finalFar };
    }

    /**
     * Update orthographic camera frustum based on current position
     */
    public updateOrthographicFrustum(force: boolean = false): boolean {
        if (!(this.world.camera instanceof OBC.OrthoPerspectiveCamera)) {
            return false;
        }

        const camera3js = this.world.camera.three;
        if (camera3js.type !== 'OrthographicCamera') {
            return false;
        }

        const orthoCam = camera3js as THREE.OrthographicCamera;
        const { near, far } = this.calculateOptimalFrustum(camera3js.position);

        // Only update if there's a significant change or force is true
        const nearDiff = Math.abs(orthoCam.near - near);
        const farDiff = Math.abs(orthoCam.far - far);
        const threshold = 0.1; // Minimum change threshold

        if (force || nearDiff > threshold || farDiff > threshold) {
            orthoCam.near = near;
            orthoCam.far = far;
            orthoCam.updateProjectionMatrix();

            if (this.isDebugMode) {
                debugLog('Orthographic frustum updated:', {
                    near: near,
                    far: far,
                    nearDiff: nearDiff,
                    farDiff: farDiff
                });
            }

            return true;
        }

        return false;
    }

    /**
     * Set up automatic frustum updates on camera position changes
     */
    public enableAutomaticUpdates(): void {
        // Listen for camera changes
        const updateFrustum = () => {
            this.updateOrthographicFrustum();
        };

        // Update frustum when camera position changes
        window.addEventListener('cameraChanged', updateFrustum);
        
        // Update frustum on mouse wheel (zoom changes)
        if (this.world.renderer?.three.domElement) {
            this.world.renderer.three.domElement.addEventListener('wheel', updateFrustum);
        }

        // Update frustum when switching to orthographic mode
        window.addEventListener('projectionChanged', (event: any) => {
            if (event.detail.mode === 'Orthographic') {
                setTimeout(() => this.updateOrthographicFrustum(true), 100);
            }
        });

        // Initial update
        setTimeout(() => this.updateOrthographicFrustum(true), 1000);

        if (this.isDebugMode) {
            debugLog('Automatic orthographic frustum updates enabled');
        }
    }

    /**
     * Get current frustum status for debugging
     */
    public getFrustumStatus(): object {
        if (!(this.world.camera instanceof OBC.OrthoPerspectiveCamera)) {
            return { error: 'Not an OrthoPerspectiveCamera' };
        }

        const camera3js = this.world.camera.three;
        if (camera3js.type !== 'OrthographicCamera') {
            return { error: 'Not in orthographic mode' };
        }

        const orthoCam = camera3js as THREE.OrthographicCamera;
        const optimal = this.calculateOptimalFrustum(camera3js.position);

        return {
            current: {
                near: orthoCam.near,
                far: orthoCam.far,
                left: orthoCam.left,
                right: orthoCam.right,
                top: orthoCam.top,
                bottom: orthoCam.bottom,
                zoom: orthoCam.zoom
            },
            optimal: optimal,
            needsUpdate: Math.abs(orthoCam.near - optimal.near) > 0.1 || Math.abs(orthoCam.far - optimal.far) > 0.1,
            modelBounds: this.modelBounds ? {
                center: this.modelBounds.getCenter(new THREE.Vector3()),
                size: this.modelBounds.getSize(new THREE.Vector3())
            } : null
        };
    }
}

// Export for global access
export default OrthographicFrustumManager;
