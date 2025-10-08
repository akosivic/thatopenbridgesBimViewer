/**
 * Comprehensive test script to verify seamless projection switching
 * 
 * This script tests:
 * 1. First-time switching preserves viewing context
 * 2. Subsequent switches restore previous positions
 * 3. Camera memory system works correctly
 * 4. Transitions are seamless (no jarring jumps)
 */

const testSeamlessProjectionSwitching = () => {
    console.log("\n🧪 === SEAMLESS PROJECTION SWITCHING TEST ===");
    console.log("Testing the improved camera position memory system");
    
    let testResults = {
        firstTimeSeamless: false,
        positionMemory: false,
        noJarringJumps: false,
        memorySystemWorks: false
    };
    
    // Helper function to get current camera state
    const getCameraState = () => {
        if (!window.world?.camera?.three) return null;
        const camera = window.world.camera.three;
        return {
            position: camera.position.clone(),
            projection: window.getCurrentProjection?.() || 'Unknown',
            target: (() => {
                const direction = new THREE.Vector3();
                camera.getWorldDirection(direction);
                return camera.position.clone().add(direction.multiplyScalar(10));
            })()
        };
    };
    
    // Helper to compare positions (with tolerance for floating point precision)
    const positionsEqual = (pos1, pos2, tolerance = 0.01) => {
        return Math.abs(pos1.x - pos2.x) < tolerance &&
               Math.abs(pos1.y - pos2.y) < tolerance &&
               Math.abs(pos1.z - pos2.z) < tolerance;
    };
    
    const runTest = async () => {
        // Reset camera memory to start fresh
        if (window.resetCameraMemory) {
            window.resetCameraMemory();
            console.log("🔄 Camera memory reset for testing");
        }
        
        // Step 1: Set initial perspective position
        console.log("\n📍 STEP 1: Setting initial perspective position");
        if (window.setProjectionMode) {
            window.setProjectionMode('Perspective');
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Move to a specific test position
            if (window.world?.camera?.three) {
                const camera = window.world.camera.three;
                camera.position.set(3, 2, 5);
                camera.lookAt(1, 1, 1);
                
                const initialState = getCameraState();
                console.log("   Initial perspective position:", initialState.position);
                console.log("   Looking towards:", initialState.target);
                
                // Step 2: First switch to orthographic (should be seamless)
                console.log("\n🔄 STEP 2: First switch to orthographic (testing seamless transition)");
                window.setProjectionMode('Orthographic');
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const orthoState1 = getCameraState();
                console.log("   Orthographic position after first switch:", orthoState1.position);
                
                // Check if transition preserved viewing context (not forced to TOP view)
                const isNotTopView = !(positionsEqual(orthoState1.position, new THREE.Vector3(0, 10, 0), 0.1));
                if (isNotTopView) {
                    testResults.firstTimeSeamless = true;
                    console.log("   ✅ SUCCESS: First switch preserved viewing context (not forced to TOP view)");
                } else {
                    console.log("   ❌ FAILED: First switch forced to TOP view - not seamless");
                }
                
                // Step 3: Move camera in orthographic mode
                console.log("\n🚶 STEP 3: Moving camera in orthographic mode");
                camera.position.set(-2, 4, 6);
                camera.lookAt(2, 0, -1);
                
                const orthoState2 = getCameraState();
                console.log("   New orthographic position:", orthoState2.position);
                
                // Step 4: Switch to perspective (should remember previous perspective position)
                console.log("\n🔄 STEP 4: Switch to perspective (testing position memory)");
                window.setProjectionMode('Perspective');
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const perspectiveState2 = getCameraState();
                console.log("   Perspective position after switch:", perspectiveState2.position);
                
                // Check if it remembered the original perspective position
                const rememberedPerspective = positionsEqual(perspectiveState2.position, initialState.position, 0.1);
                if (rememberedPerspective) {
                    testResults.positionMemory = true;
                    console.log("   ✅ SUCCESS: Remembered previous perspective position");
                } else {
                    console.log("   ❌ FAILED: Did not remember perspective position");
                    console.log("     Expected:", initialState.position);
                    console.log("     Got:", perspectiveState2.position);
                }
                
                // Step 5: Switch back to orthographic (should remember orthographic position)
                console.log("\n🔄 STEP 5: Switch back to orthographic (testing orthographic memory)");
                window.setProjectionMode('Orthographic');
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const orthoState3 = getCameraState();
                console.log("   Orthographic position after return:", orthoState3.position);
                
                // Check if it remembered the orthographic position from step 3
                const rememberedOrthographic = positionsEqual(orthoState3.position, orthoState2.position, 0.1);
                if (rememberedOrthographic) {
                    testResults.noJarringJumps = true;
                    console.log("   ✅ SUCCESS: Remembered orthographic position - no jarring jumps");
                } else {
                    console.log("   ❌ FAILED: Did not remember orthographic position");
                    console.log("     Expected:", orthoState2.position);
                    console.log("     Got:", orthoState3.position);
                }
                
                // Step 6: Test camera memory system
                console.log("\n🧠 STEP 6: Testing camera memory system");
                if (window.getCameraMemory) {
                    const memory = window.getCameraMemory();
                    console.log("   Camera memory state:", memory);
                    
                    const hasValidMemory = memory.perspective !== null && memory.orthographic !== null &&
                                         !memory.isFirstTimeOrthographic && !memory.isFirstTimePerspective;
                    
                    if (hasValidMemory) {
                        testResults.memorySystemWorks = true;
                        console.log("   ✅ SUCCESS: Camera memory system is working correctly");
                    } else {
                        console.log("   ❌ FAILED: Camera memory system not working properly");
                    }
                } else {
                    console.log("   ❌ FAILED: Camera memory functions not available");
                }
                
                // Final Results
                console.log("\n📊 === TEST RESULTS SUMMARY ===");
                console.log(`   First-time seamless transition: ${testResults.firstTimeSeamless ? '✅ PASS' : '❌ FAIL'}`);
                console.log(`   Position memory works: ${testResults.positionMemory ? '✅ PASS' : '❌ FAIL'}`);
                console.log(`   No jarring jumps: ${testResults.noJarringJumps ? '✅ PASS' : '❌ FAIL'}`);
                console.log(`   Memory system functional: ${testResults.memorySystemWorks ? '✅ PASS' : '❌ FAIL'}`);
                
                const allTestsPassed = Object.values(testResults).every(result => result === true);
                console.log(`\n🎯 OVERALL RESULT: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
                
                if (allTestsPassed) {
                    console.log("🎉 Seamless projection switching is working correctly!");
                } else {
                    console.log("⚠️  Some issues remain with the projection switching system.");
                }
            }
        } else {
            console.log("❌ setProjectionMode function not available");
        }
    };
    
    // Wait for app to be ready
    if (window.world?.camera?.three) {
        runTest();
    } else {
        console.log("⏳ Waiting for camera to be ready...");
        setTimeout(() => {
            if (window.world?.camera?.three) {
                runTest();
            } else {
                console.log("❌ Camera not available for testing");
            }
        }, 2000);
    }
};

// Export for manual use
window.testSeamlessProjectionSwitching = testSeamlessProjectionSwitching;

console.log("🔧 Seamless projection switching test script loaded");
console.log("📋 This will verify the improved camera position memory system");
console.log("⏳ Test will start in 3 seconds...");
console.log("💡 You can also run manually: window.testSeamlessProjectionSwitching()");

setTimeout(testSeamlessProjectionSwitching, 3000);