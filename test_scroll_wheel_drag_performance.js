/**
 * Test script for scroll wheel drag performance
 * 
 * This script helps verify that middle mouse button (scroll wheel) dragging
 * is responsive and smooth in orthographic mode.
 */

const testScrollWheelDragPerformance = () => {
    console.log("\n🖱️ === SCROLL WHEEL DRAG PERFORMANCE TEST ===");
    console.log("Testing middle mouse button drag responsiveness");
    
    const runTest = () => {
        // Check if we're in orthographic mode
        const currentProjection = window.getCurrentProjection ? window.getCurrentProjection() : 'Unknown';
        console.log("📷 Current projection mode:", currentProjection);
        
        if (currentProjection !== 'Orthographic') {
            console.log("⚠️  This test is designed for Orthographic mode");
            console.log("💡 Please switch to Orthographic mode and run the test again");
            return;
        }
        
        // Check if OrthographicMouseControls is available
        if (!window.world || !window.world.camera) {
            console.log("❌ World or camera not available");
            return;
        }
        
        console.log("✅ Orthographic mode active - ready for testing");
        
        // Get current speed setting
        const currentSpeed = window.getCurrentSpeed ? window.getCurrentSpeed() : 'Unknown';
        console.log("⚡ Current movement speed:", currentSpeed);
        
        // Test pan speed calculation
        const testPanSpeed = () => {
            const baseSpeed = 5.0;
            const speedMultiplier = currentSpeed / baseSpeed;
            const panSpeedBase = 0.05; // Updated from 0.01
            const adjustedPanSpeed = panSpeedBase * speedMultiplier;
            
            console.log("\n📊 PAN SPEED ANALYSIS:");
            console.log("• Base pan speed: 0.05 (increased from 0.01)");
            console.log("• Speed multiplier:", speedMultiplier.toFixed(2));
            console.log("• Adjusted pan speed:", adjustedPanSpeed.toFixed(3));
            console.log("• Performance improvement: 5x faster base speed");
            
            return adjustedPanSpeed;
        };
        
        const panSpeed = testPanSpeed();
        
        console.log("\n🧪 MANUAL TESTING INSTRUCTIONS:");
        console.log("1. 📍 Position your cursor in the viewport");
        console.log("2. 🖱️ Hold down the MIDDLE MOUSE BUTTON (scroll wheel)");
        console.log("3. 🔄 Drag in different directions");
        console.log("4. 📏 Observe the camera panning responsiveness");
        
        console.log("\n✅ EXPECTED IMPROVEMENTS:");
        console.log("• 🚀 5x faster panning response");
        console.log("• 🎯 More precise control");
        console.log("• 🔧 Speed setting affects pan sensitivity");
        console.log("• 📐 Smooth movement without jumping");
        
        console.log("\n⚙️ SPEED TESTING:");
        console.log("• Try changing speed (x1, x2, x3) in Camera Settings");
        console.log("• Pan speed should adjust accordingly:");
        console.log("  - x1 speed: Pan multiplier = 1.0");
        console.log("  - x2 speed: Pan multiplier = 2.0");
        console.log("  - x3 speed: Pan multiplier = 3.0");
        
        // Performance monitoring
        console.log("\n📈 PERFORMANCE MONITORING:");
        let panEventCount = 0;
        let startTime = Date.now();
        
        const monitorPanEvents = () => {
            // Listen for camera change events from panning
            const handleCameraChange = (event) => {
                if (event.detail && event.detail.source === 'orthographic-pan') {
                    panEventCount++;
                    const elapsed = Date.now() - startTime;
                    
                    if (elapsed >= 1000) { // Report every second
                        console.log(`📊 Pan events/sec: ${panEventCount}/${(elapsed/1000).toFixed(1)}s = ${(panEventCount / (elapsed/1000)).toFixed(1)} events/sec`);
                        panEventCount = 0;
                        startTime = Date.now();
                    }
                }
            };
            
            window.addEventListener('cameraChanged', handleCameraChange);
            
            // Stop monitoring after 30 seconds
            setTimeout(() => {
                window.removeEventListener('cameraChanged', handleCameraChange);
                console.log("📊 Performance monitoring stopped");
            }, 30000);
            
            console.log("🔍 Performance monitoring started (30 seconds)");
            console.log("🖱️ Start dragging with middle mouse to see event rates");
        };
        
        monitorPanEvents();
        
        console.log("\n🎯 COMPARISON TEST:");
        console.log("• Before fix: Pan speed = 0.01 (very slow)");
        console.log("• After fix: Pan speed = 0.05 (5x faster)");
        console.log("• Speed adjustment: Multiplied by user speed setting");
        
        console.log("\n💡 DEBUGGING COMMANDS:");
        console.log("• window.getCurrentSpeed() - Check current speed");
        console.log("• window.getCurrentProjection() - Check projection mode");
        console.log("• console.clear() - Clear console output");
        
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
console.log("🖱️ Scroll wheel drag performance test script loaded");
console.log("📋 This will test middle mouse button (scroll wheel) drag responsiveness");
console.log("⏳ Test will start in 2 seconds...");

setTimeout(testScrollWheelDragPerformance, 2000);