/**
 * Test script for projection switching view inversion fix
 * 
 * This script helps verify that switching between perspective and orthographic
 * modes maintains consistent view orientation without inversion.
 */

const testProjectionSwitchingFix = () => {
    console.log("\n🔄 === PROJECTION SWITCHING VIEW INVERSION FIX TEST ===");
    console.log("Testing view consistency when switching between perspective and orthographic modes");
    
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
        
        console.log("✅ Projection controls available - starting test");
        
        const camera = window.world.camera.three;
        const currentProjection = window.getCurrentProjection();
        
        console.log("📷 Current projection mode:", currentProjection);
        console.log("📍 Current camera position:", camera.position);
        console.log("🎯 Current camera rotation:", {
            x: camera.rotation.x * 180 / Math.PI,
            y: camera.rotation.y * 180 / Math.PI,
            z: camera.rotation.z * 180 / Math.PI
        });
        
        // Test model center calculation
        const testModelCenter = () => {
            if (window.world.meshes.size > 0) {
                const bbox = new THREE.Box3();
                window.world.meshes.forEach(mesh => {
                    bbox.expandByObject(mesh);
                });
                
                if (!bbox.isEmpty()) {
                    const center = bbox.getCenter(new THREE.Vector3());
                    const size = bbox.getSize(new THREE.Vector3());
                    const diagonal = size.length();
                    
                    console.log("\n📊 MODEL ANALYSIS:");
                    console.log("• Model center:", center);
                    console.log("• Model size:", size);
                    console.log("• Model diagonal:", diagonal.toFixed(2));
                    console.log("• Suggested orthographic distance:", (diagonal * 1.5).toFixed(2));
                    
                    return { center, size, diagonal };
                }
            }
            return null;
        };
        
        const modelInfo = testModelCenter();
        
        // Test switching behavior
        console.log("\n🔄 PROJECTION SWITCHING TEST:");
        console.log("We'll test switching between modes to check for view inversion");
        
        // Store initial state
        const initialPosition = camera.position.clone();
        const initialRotation = camera.rotation.clone();
        
        console.log("\n📋 MANUAL TESTING INSTRUCTIONS:");
        console.log("1. 👁️ Note the current view (what you're looking at)");
        console.log("2. 🔄 Switch to the other projection mode using the projection controls");
        console.log("3. 🔍 Check if the view is inverted or dramatically different");
        console.log("4. 🔄 Switch back to the original mode");
        console.log("5. ✅ Verify the view returns to approximately the same orientation");
        
        console.log("\n✅ EXPECTED IMPROVEMENTS:");
        console.log("• 🎯 Camera target now uses model center instead of arbitrary point");
        console.log("• 📏 Distance calculation considers model size");
        console.log("• 🔄 View orientation should be preserved when switching");
        console.log("• ❌ No more inverted or dramatically different views");
        
        // Automated switching test (commented out for manual control)
        console.log("\n🤖 AUTOMATED SWITCHING TEST:");
        console.log("Run this command to test automatic switching:");
        console.log("testAutomaticSwitching()");
        
        // Make the automatic test available globally
        window.testAutomaticSwitching = () => {
            console.log("\n🔄 Starting automated projection switching test...");
            
            const originalMode = window.getCurrentProjection();
            const targetMode = originalMode === "Perspective" ? "Orthographic" : "Perspective";
            
            console.log(`Switching from ${originalMode} to ${targetMode}...`);
            
            // Store position before switch
            const beforePosition = camera.position.clone();
            const beforeRotation = camera.rotation.clone();
            
            // Switch projection
            window.setProjectionMode(targetMode);
            
            // Wait a moment then check
            setTimeout(() => {
                const afterPosition = camera.position.clone();
                const afterRotation = camera.rotation.clone();
                
                console.log("📊 SWITCH RESULTS:");
                console.log("• Before position:", beforePosition);
                console.log("• After position:", afterPosition);
                console.log("• Position change:", afterPosition.distanceTo(beforePosition).toFixed(3));
                
                console.log("• Before rotation (degrees):", {
                    x: (beforeRotation.x * 180 / Math.PI).toFixed(1),
                    y: (beforeRotation.y * 180 / Math.PI).toFixed(1),
                    z: (beforeRotation.z * 180 / Math.PI).toFixed(1)
                });
                console.log("• After rotation (degrees):", {
                    x: (afterRotation.x * 180 / Math.PI).toFixed(1),
                    y: (afterRotation.y * 180 / Math.PI).toFixed(1),
                    z: (afterRotation.z * 180 / Math.PI).toFixed(1)
                });
                
                // Switch back
                setTimeout(() => {
                    console.log(`\nSwitching back to ${originalMode}...`);
                    window.setProjectionMode(originalMode);
                    
                    setTimeout(() => {
                        const returnPosition = camera.position.clone();
                        const returnRotation = camera.rotation.clone();
                        
                        console.log("📊 RETURN RESULTS:");
                        console.log("• Return position:", returnPosition);
                        console.log("• Total position drift:", returnPosition.distanceTo(beforePosition).toFixed(3));
                        console.log("• Return rotation (degrees):", {
                            x: (returnRotation.x * 180 / Math.PI).toFixed(1),
                            y: (returnRotation.y * 180 / Math.PI).toFixed(1),
                            z: (returnRotation.z * 180 / Math.PI).toFixed(1)
                        });
                        
                        console.log("\n✅ AUTOMATIC TEST COMPLETE");
                        console.log("If position drift < 0.1 and rotations are similar, the fix is working!");
                        
                    }, 1000);
                }, 2000);
            }, 1000);
        };
        
        console.log("\n🔧 FIX DETAILS:");
        console.log("• Camera target calculation: Now uses model center");
        console.log("• Distance calculation: Based on model diagonal * 1.5");
        console.log("• Consistent targeting: Eliminates arbitrary distance calculations");
        console.log("• Model-aware switching: Considers actual model geometry");
        
        console.log("\n💡 DEBUGGING COMMANDS:");
        console.log("• window.getCurrentProjection() - Get current mode");
        console.log("• window.setProjectionMode('Perspective'|'Orthographic') - Switch mode");
        console.log("• testAutomaticSwitching() - Run automated switching test");
        
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
console.log("🔄 Projection switching view inversion fix test script loaded");
console.log("📋 This will test view consistency when switching between projection modes");
console.log("⏳ Test will start in 2 seconds...");

setTimeout(testProjectionSwitchingFix, 2000);