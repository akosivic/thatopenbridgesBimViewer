// Comprehensive Camera State Debugging Script
// This script helps identify what's really causing the model flipping issue

console.log("🔍 COMPREHENSIVE CAMERA DEBUGGING SCRIPT LOADED");

// Global variables to track camera state changes
let previousCameraState = null;
let cameraChangeCount = 0;

// Function to capture complete camera state
function captureCompleteState(camera, label) {
    const state = {
        label: label,
        timestamp: Date.now(),
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        up: camera.up.clone(),
        matrix: camera.matrix.clone(),
        matrixWorld: camera.matrixWorld.clone(),
        projectionMatrix: camera.projectionMatrix.clone(),
        zoom: camera.zoom,
        type: camera.type
    };
    
    // Get world direction
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    state.direction = direction;
    
    return state;
}

// Function to compare two camera states
function compareCameraStates(state1, state2) {
    if (!state1 || !state2) return;
    
    const positionDiff = state1.position.distanceTo(state2.position);
    const quatDiff = state1.quaternion.angleTo(state2.quaternion);
    const directionDiff = state1.direction.angleTo(state2.direction);
    
    console.log(`📊 CAMERA CHANGE ANALYSIS: ${state1.label} → ${state2.label}`);
    console.log(`   Position change: ${positionDiff.toFixed(6)} units`);
    console.log(`   Rotation change: ${(quatDiff * 180/Math.PI).toFixed(2)}°`);
    console.log(`   Direction change: ${(directionDiff * 180/Math.PI).toFixed(2)}°`);
    console.log(`   Up vector change: ${state1.up.distanceTo(state2.up).toFixed(6)}`);
    console.log(`   Matrix changed: ${!state1.matrix.equals(state2.matrix)}`);
    console.log(`   World matrix changed: ${!state1.matrixWorld.equals(state2.matrixWorld)}`);
    
    return {
        positionDiff,
        quatDiff: quatDiff * 180/Math.PI,
        directionDiff: directionDiff * 180/Math.PI
    };
}

// Override the projection switching function to add detailed monitoring
function addDetailedProjectionMonitoring() {
    // Wait for the BIM viewer to be ready
    setTimeout(() => {
        const camera = window.viewer?.camera?.three;
        if (!camera) {
            console.log("❌ Camera not found, retrying...");
            setTimeout(addDetailedProjectionMonitoring, 1000);
            return;
        }
        
        console.log("✅ Camera found, starting monitoring");
        
        // Capture initial state
        previousCameraState = captureCompleteState(camera, "INITIAL_STATE");
        console.log("📸 Initial camera state captured");
        
        // Monitor matrix changes
        const originalUpdateMatrixWorld = camera.updateMatrixWorld;
        camera.updateMatrixWorld = function(...args) {
            const beforeState = captureCompleteState(this, `BEFORE_MATRIX_UPDATE_${++cameraChangeCount}`);
            const result = originalUpdateMatrixWorld.apply(this, args);
            const afterState = captureCompleteState(this, `AFTER_MATRIX_UPDATE_${cameraChangeCount}`);
            
            const changes = compareCameraStates(beforeState, afterState);
            if (changes && (changes.positionDiff > 0.001 || changes.quatDiff > 0.1)) {
                console.log("🔄 Significant camera change during updateMatrixWorld");
            }
            
            return result;
        };
        
        // Monitor lookAt calls
        const originalLookAt = camera.lookAt;
        camera.lookAt = function(...args) {
            const beforeState = captureCompleteState(this, `BEFORE_LOOKAT_${++cameraChangeCount}`);
            console.log("🎯 LOOKAT CALLED with args:", args);
            console.trace("🔍 Call stack for lookAt:");
            
            const result = originalLookAt.apply(this, args);
            
            const afterState = captureCompleteState(this, `AFTER_LOOKAT_${cameraChangeCount}`);
            compareCameraStates(beforeState, afterState);
            
            return result;
        };
        
        // Monitor camera controls if they exist
        if (window.viewer?.camera?.controls) {
            console.log("📱 Camera controls found, monitoring...");
            
            const controls = window.viewer.camera.controls;
            
            // Monitor control updates
            if (controls.update) {
                const originalUpdate = controls.update;
                controls.update = function(...args) {
                    const beforeState = captureCompleteState(camera, `BEFORE_CONTROLS_UPDATE_${++cameraChangeCount}`);
                    const result = originalUpdate.apply(this, args);
                    const afterState = captureCompleteState(camera, `AFTER_CONTROLS_UPDATE_${cameraChangeCount}`);
                    
                    const changes = compareCameraStates(beforeState, afterState);
                    if (changes && (changes.positionDiff > 0.001 || changes.quatDiff > 0.1)) {
                        console.log("🕹️ Camera controls caused significant change");
                    }
                    
                    return result;
                };
            }
        }
        
        // Add projection switching monitor
        window.addEventListener('projectionChange', (event) => {
            console.log("🔄 PROJECTION CHANGE EVENT:", event.detail);
            const currentState = captureCompleteState(camera, `PROJECTION_CHANGE_${event.detail.mode}`);
            
            if (previousCameraState) {
                console.log("🔍 ANALYZING PROJECTION CHANGE IMPACT:");
                compareCameraStates(previousCameraState, currentState);
            }
            
            previousCameraState = currentState;
        });
        
        console.log("✅ Detailed camera monitoring activated");
        console.log("📋 Try switching projection modes to see detailed analysis");
        
    }, 2000);
}

// Start monitoring
addDetailedProjectionMonitoring();

// Add manual debugging functions to window
window.debugCamera = {
    capture: () => {
        const camera = window.viewer?.camera?.three;
        if (camera) {
            return captureCompleteState(camera, "MANUAL_CAPTURE");
        }
        return null;
    },
    
    compare: (state1, state2) => {
        return compareCameraStates(state1, state2);
    },
    
    getCurrentState: () => {
        const camera = window.viewer?.camera?.three;
        if (camera) {
            const state = captureCompleteState(camera, "CURRENT");
            console.log("📊 CURRENT CAMERA STATE:", state);
            return state;
        }
        return null;
    },
    
    testProjectionSwitch: () => {
        console.log("🧪 TESTING PROJECTION SWITCH");
        const before = window.debugCamera.capture();
        
        // Try to find and click the projection button
        const projectionButton = document.querySelector('[title="Switch to Orthographic"], [title="Switch to Perspective"]');
        if (projectionButton) {
            projectionButton.click();
            
            setTimeout(() => {
                const after = window.debugCamera.capture();
                window.debugCamera.compare(before, after);
            }, 100);
        } else {
            console.log("❌ Could not find projection button");
        }
    }
};

console.log("🛠️ Debug tools available: window.debugCamera.getCurrentState(), window.debugCamera.testProjectionSwitch()");