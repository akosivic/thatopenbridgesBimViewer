/**
 * Test script to demonstrate projection switching behavior
 * 
 * This script tests what happens when you:
 * 1. Start in perspective mode
 * 2. Switch to orthographic 
 * 3. Move around in orthographic
 * 4. Switch back to perspective
 * 5. Switch to orthographic again
 */

const testProjectionSwitching = () => {
    console.log("\n🧪 === PROJECTION SWITCHING BEHAVIOR TEST ===");
    
    // Function to log current camera state
    const logCameraState = (label) => {
        if (!window.world?.camera?.three) {
            console.log(`❌ ${label}: Camera not available`);
            return;
        }
        
        const camera = window.world.camera.three;
        const projection = window.getCurrentProjection ? window.getCurrentProjection() : 'Unknown';
        
        console.log(`📷 ${label}:`);
        console.log(`   Projection: ${projection}`);
        console.log(`   Position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
        console.log(`   Looking at: Based on current rotation`);
    };
    
    // Test sequence
    const runTestSequence = async () => {
        // Step 1: Check initial state
        logCameraState("INITIAL STATE");
        
        // Step 2: Switch to Orthographic (first time)
        console.log("\n🔄 STEP 1: Switching to Orthographic (first time)");
        if (window.setProjectionMode) {
            window.setProjectionMode('Orthographic');
            setTimeout(() => {
                logCameraState("AFTER FIRST ORTHO SWITCH");
                console.log("   ✨ Expected: Camera at (0, 10, 0) - TOP view");
                
                // Step 3: Move camera manually in orthographic
                console.log("\n🚶 STEP 2: Moving camera manually in orthographic mode");
                if (window.world?.camera?.three) {
                    const camera = window.world.camera.three;
                    // Move to a different position
                    camera.position.set(5, 3, 8);
                    camera.lookAt(0, 0, 0);
                    logCameraState("AFTER MANUAL MOVEMENT");
                    console.log("   ✨ Moved camera to (5, 3, 8)");
                    
                    // Step 4: Switch to Perspective
                    console.log("\n🔄 STEP 3: Switching to Perspective");
                    window.setProjectionMode('Perspective');
                    setTimeout(() => {
                        logCameraState("AFTER PERSPECTIVE SWITCH");
                        console.log("   ✨ Expected: Camera at (0, 10, 0) - TOP view (FORCED)");
                        
                        // Step 5: Switch back to Orthographic (second time)
                        console.log("\n🔄 STEP 4: Switching BACK to Orthographic (second time)");
                        window.setProjectionMode('Orthographic');
                        setTimeout(() => {
                            logCameraState("AFTER SECOND ORTHO SWITCH");
                            console.log("   ❗ ISSUE: Camera AGAIN forced to (0, 10, 0) - TOP view");
                            console.log("   💡 User's previous position (5, 3, 8) is LOST!");
                            
                            console.log("\n📋 === BEHAVIOR SUMMARY ===");
                            console.log("✅ First Ortho switch: Sets TOP view (0, 10, 0) - OK");
                            console.log("✅ Manual movement: Works freely - OK");
                            console.log("❌ Perspective switch: FORCES TOP view (0, 10, 0) - PROBLEM");
                            console.log("❌ Second Ortho switch: FORCES TOP view again - PROBLEM");
                            console.log("\n🎯 IMPROVEMENT NEEDED:");
                            console.log("   • Remember user's camera position when switching modes");
                            console.log("   • Only set default view on FIRST switch to orthographic");
                            console.log("   • Preserve user's viewing context");
                            
                        }, 500);
                    }, 500);
                }
            }, 500);
        } else {
            console.log("❌ setProjectionMode function not available");
        }
    };
    
    // Wait a bit for app to be ready, then run test
    setTimeout(runTestSequence, 1000);
};

// Auto-run the test when this script loads
console.log("🔧 Projection switching test script loaded");
console.log("📋 This will test the camera behavior when switching between projection modes");
console.log("⏳ Test will start in 2 seconds...");

setTimeout(testProjectionSwitching, 2000);