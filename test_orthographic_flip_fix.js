/**
 * Test script for orthographic view flipping fix
 * 
 * This script helps verify that the model no longer flips upside down
 * when switching to orthographic view from certain positions.
 */

const testOrthographicViewFlipFix = () => {
    console.log("\n🔄 === ORTHOGRAPHIC VIEW FLIP FIX TEST ===");
    console.log("Testing to ensure model doesn't flip upside down in orthographic view");
    
    const runTest = () => {
        // Check if projection controls are available
        if (!window.getCurrentProjection || !window.setProjectionMode) {
            console.log("❌ Projection controls not available");
            return;
        }
        
        if (!window.world?.camera?.three) {
            console.log("❌ Camera not available");
            return;
        }
        
        console.log("✅ Projection controls available - starting flip test");
        
        const camera = window.world.camera.three;
        let currentProjection = window.getCurrentProjection();
        
        console.log("📷 Current projection mode:", currentProjection);
        console.log("📍 Current camera position:", camera.position);
        console.log("🎯 Current camera rotation:", {
            x: camera.rotation.x * 180 / Math.PI,
            y: camera.rotation.y * 180 / Math.PI,
            z: camera.rotation.z * 180 / Math.PI
        });
        
        // Calculate model center for reference
        const getModelCenter = () => {
            if (window.world.meshes.size > 0) {
                const bbox = new THREE.Box3();
                window.world.meshes.forEach(mesh => {
                    bbox.expandByObject(mesh);
                });
                
                if (!bbox.isEmpty()) {
                    return bbox.getCenter(new THREE.Vector3());
                }
            }
            return null;
        };
        
        const modelCenter = getModelCenter();
        if (modelCenter) {
            console.log("📊 Model center:", modelCenter);
        } else {
            console.log("⚠️ Could not calculate model center");
        }
        
        console.log("\n🔧 FLIP FIX IMPROVEMENTS:");
        console.log("• Target consistency: Always uses current model center");
        console.log("• Memory structure: Only stores position, not target");
        console.log("• LookAt enforcement: Always applies lookAt(modelCenter) when switching");
        console.log("• Debug logging: Added to verify lookAt is applied");
        
        console.log("\n🧪 AUTOMATED FLIP TEST:");
        
        // Test automatic switching to see if view flips
        window.testViewFlipping = (iterations = 3) => {
            console.log(`\n🔄 Starting ${iterations} iterations of projection switching test...`);
            
            let testIteration = 0;
            const testInterval = 2000; // 2 seconds between switches
            
            const performSwitch = () => {
                if (testIteration >= iterations * 2) {
                    console.log("\n✅ FLIP TEST COMPLETED");
                    console.log("Check visually that the model orientation remained consistent");
                    return;
                }
                
                const currentMode = window.getCurrentProjection();
                const targetMode = currentMode === "Perspective" ? "Orthographic" : "Perspective";
                
                console.log(`\n--- Iteration ${Math.floor(testIteration/2) + 1} ---`);
                console.log(`🔄 Switching from ${currentMode} to ${targetMode}`);
                
                // Record camera state before switch
                const beforePosition = camera.position.clone();
                const beforeRotation = camera.rotation.clone();
                
                // Switch projection
                window.setProjectionMode(targetMode);
                
                // Check camera state after switch
                setTimeout(() => {
                    const afterPosition = camera.position.clone();
                    const afterRotation = camera.rotation.clone();
                    
                    console.log("📊 Switch results:");
                    console.log("• Before position:", beforePosition);
                    console.log("• After position:", afterPosition);
                    console.log("• Position change:", afterPosition.distanceTo(beforePosition).toFixed(3));
                    
                    // Check if view appears to be flipped (rotation changes dramatically)
                    const rotationChangeX = Math.abs(afterRotation.x - beforeRotation.x) * 180 / Math.PI;
                    const rotationChangeY = Math.abs(afterRotation.y - beforeRotation.y) * 180 / Math.PI;
                    
                    console.log("• Rotation change X:", rotationChangeX.toFixed(1), "degrees");
                    console.log("• Rotation change Y:", rotationChangeY.toFixed(1), "degrees");
                    
                    if (rotationChangeX > 90 || rotationChangeY > 90) {
                        console.log("⚠️ POTENTIAL FLIP DETECTED - Large rotation change");
                    } else {
                        console.log("✅ View orientation stable");
                    }
                    
                    testIteration++;
                    
                    // Continue with next switch
                    setTimeout(performSwitch, testInterval);
                    
                }, 500); // Give time for the switch to complete
            };
            
            performSwitch();
        };
        
        console.log("\n🎯 MANUAL TESTING INSTRUCTIONS:");
        console.log("1. 👁️ Note the current view orientation of your model");
        console.log("2. 🔄 Switch to orthographic mode");
        console.log("3. ✅ Verify the model is NOT upside down or flipped");
        console.log("4. 🔄 Switch back to perspective mode");
        console.log("5. ✅ Verify the view orientation is consistent");
        console.log("6. 🔁 Try from different camera positions/angles");
        
        console.log("\n🤖 AUTOMATED TESTING:");
        console.log("• testViewFlipping() - Run 3 iterations of switching");
        console.log("• testViewFlipping(5) - Run 5 iterations of switching");
        
        console.log("\n🔍 KEY INDICATORS TO WATCH:");
        console.log("• Model should maintain same 'up' direction");
        console.log("• No sudden 180° flips or inversions");
        console.log("• Consistent horizon/vertical orientation");
        console.log("• Smooth view transitions");
        
        console.log("\n📋 WHAT WAS FIXED:");
        console.log("BEFORE:");
        console.log("• Camera target was stored in memory and could become stale");
        console.log("• Old target could point in wrong direction causing flips");
        console.log("• No consistent enforcement of lookAt(modelCenter)");
        
        console.log("\nAFTER:");
        console.log("• Camera target always uses current model center");
        console.log("• Memory only stores position, target is always recalculated");
        console.log("• Explicit lookAt(modelCenter) applied on every switch");
        console.log("• Debug logging confirms lookAt is being applied");
        
        console.log("\n💡 DEBUGGING COMMANDS:");
        console.log("• window.getCurrentProjection() - Check current mode");
        console.log("• window.setProjectionMode('Orthographic'|'Perspective') - Switch mode");
        console.log("• testViewFlipping() - Run automated flip test");
        
    };
    
    // Wait for app to be ready
    if (window.world?.camera?.three && window.getCurrentProjection) {
        runTest();
    } else {
        console.log("⏳ Waiting for application to be ready...");
        setTimeout(() => {
            if (window.world?.camera?.three && window.getCurrentProjection) {
                runTest();
            } else {
                console.log("❌ Application not ready for testing");
                console.log("💡 Make sure the BIM viewer is fully loaded");
            }
        }, 3000);
    }
};

// Auto-run the test
console.log("🔄 Orthographic view flip fix test script loaded");
console.log("📋 This will test that the model doesn't flip upside down in orthographic view");
console.log("⏳ Test will start in 2 seconds...");

setTimeout(testOrthographicViewFlipFix, 2000);