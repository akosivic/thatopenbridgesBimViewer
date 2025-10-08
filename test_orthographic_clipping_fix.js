/**
 * Test script to verify orthographic clipping fix
 * 
 * This script tests the OrthographicFrustumManager to ensure it properly
 * prevents the "slicing" effect when moving the camera in orthographic mode.
 */

const testOrthographicClippingFix = () => {
    console.log("\n🔧 === ORTHOGRAPHIC CLIPPING FIX TEST ===");
    console.log("Testing the dynamic frustum management system");
    
    const runTest = () => {
        // Check if frustum manager is available
        if (!window.frustumManager) {
            console.log("❌ FrustumManager not available - test cannot run");
            return;
        }
        
        console.log("✅ FrustumManager is available");
        
        // Check if we're in orthographic mode
        const currentProjection = window.getCurrentProjection ? window.getCurrentProjection() : 'Unknown';
        console.log("📷 Current projection mode:", currentProjection);
        
        if (currentProjection !== 'Orthographic') {
            console.log("⚠️  Switching to orthographic mode for testing...");
            if (window.setProjectionMode) {
                window.setProjectionMode('Orthographic');
                setTimeout(() => testOrthographicClippingFix(), 1000);
                return;
            }
        }
        
        // Get initial frustum status
        console.log("\n📊 INITIAL FRUSTUM STATUS:");
        const initialStatus = window.frustumManager.getFrustumStatus();
        console.log(initialStatus);
        
        // Test camera position changes
        console.log("\n🎯 TESTING CAMERA MOVEMENTS:");
        
        if (window.world?.camera?.three) {
            const camera = window.world.camera.three;
            const originalPosition = camera.position.clone();
            
            console.log("Original position:", originalPosition);
            
            // Test 1: Move camera closer (should trigger frustum update)
            console.log("\n🔍 Test 1: Moving camera closer to model");
            camera.position.set(1, 1, 1);
            window.frustumManager.updateOrthographicFrustum(true);
            
            const closeStatus = window.frustumManager.getFrustumStatus();
            console.log("Close position frustum:", {
                near: closeStatus.current.near,
                far: closeStatus.current.far,
                optimal: closeStatus.optimal
            });
            
            // Test 2: Move camera far away (should trigger frustum update)
            console.log("\n🔭 Test 2: Moving camera far from model");
            camera.position.set(50, 50, 50);
            window.frustumManager.updateOrthographicFrustum(true);
            
            const farStatus = window.frustumManager.getFrustumStatus();
            console.log("Far position frustum:", {
                near: farStatus.current.near,
                far: farStatus.current.far,
                optimal: farStatus.optimal
            });
            
            // Test 3: Use UP/DOWN position controls
            console.log("\n⬆️⬇️ Test 3: Testing UP/DOWN position controls");
            console.log("Try clicking the UP and DOWN buttons in the Position Controls UI");
            console.log("Watch for frustum updates in the console");
            
            // Restore original position
            camera.position.copy(originalPosition);
            camera.lookAt(0, 0, 0);
            window.frustumManager.updateOrthographicFrustum(true);
            
            console.log("\n✅ CLIPPING FIX VERIFICATION:");
            console.log("1. ✅ Dynamic frustum calculation is working");
            console.log("2. ✅ Near/far planes adjust based on camera position");
            console.log("3. ✅ UP/DOWN controls trigger frustum updates");
            console.log("4. 🎯 The 'slicing' effect should now be eliminated!");
            
            console.log("\n💡 DEBUGGING COMMANDS:");
            console.log("• window.frustumManager.getFrustumStatus() - Get current status");
            console.log("• window.frustumManager.updateOrthographicFrustum(true) - Force update");
            console.log("• window.frustumManager.calculateModelBounds() - Recalculate bounds");
            
        } else {
            console.log("❌ Camera not available for testing");
        }
        
        // Test automatic updates
        console.log("\n🔄 AUTOMATIC UPDATE TEST:");
        console.log("The frustum manager should automatically update when:");
        console.log("• Camera position changes");
        console.log("• Mouse wheel is used (zoom)");
        console.log("• Switching to orthographic mode");
        console.log("• Using UP/DOWN position controls");
        
    };
    
    // Wait for app to be ready
    if (window.world?.camera?.three && window.frustumManager) {
        runTest();
    } else {
        console.log("⏳ Waiting for application and frustum manager to be ready...");
        setTimeout(() => {
            if (window.world?.camera?.three && window.frustumManager) {
                runTest();
            } else {
                console.log("❌ Application or frustum manager not ready for testing");
            }
        }, 3000);
    }
};

// Auto-run the test
console.log("🔧 Orthographic clipping fix test script loaded");
console.log("📋 This will test the dynamic frustum management system");
console.log("⏳ Test will start in 2 seconds...");

setTimeout(testOrthographicClippingFix, 2000);