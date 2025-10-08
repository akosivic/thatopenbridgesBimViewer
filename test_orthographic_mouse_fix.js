/**
 * Test script for improved orthographic mouse controls
 * 
 * This script helps verify that the mouse clamping system no longer
 * interferes with normal mouse usage in orthographic mode.
 */

const testOrthographicMouseControlsFix = () => {
    console.log("\n🖱️ === ORTHOGRAPHIC MOUSE CONTROLS FIX TEST ===");
    console.log("Testing improved mouse control responsiveness and reduced clamping interference");
    
    const runTest = () => {
        // Check if we're in orthographic mode
        const currentProjection = window.getCurrentProjection ? window.getCurrentProjection() : 'Unknown';
        console.log("📷 Current projection mode:", currentProjection);
        
        if (currentProjection !== 'Orthographic') {
            console.log("⚠️  This test requires Orthographic mode");
            console.log("💡 Please switch to Orthographic mode and run the test again");
            if (window.setProjectionMode) {
                console.log("🔄 Automatically switching to Orthographic mode...");
                window.setProjectionMode('Orthographic');
                setTimeout(() => testOrthographicMouseControlsFix(), 1000);
                return;
            }
        }
        
        console.log("✅ Orthographic mode active - ready for mouse testing");
        
        console.log("\n🔧 MOUSE CONTROL IMPROVEMENTS:");
        console.log("• Clamping threshold: Increased from 200px to 500px");
        console.log("• Extreme clamping: Only for truly unrealistic movements (>500px)");
        console.log("• Normal movements: Preserved without interference (<100px)");
        console.log("• Fast movements: Gentle smoothing instead of harsh clamping (100-500px)");
        console.log("• Responsiveness: Removed momentum dampening and direction change penalties");
        
        console.log("\n🧪 MANUAL TESTING INSTRUCTIONS:");
        console.log("Try these mouse operations in the orthographic view:");
        
        console.log("\n1. 🔄 LEFT MOUSE BUTTON + DRAG (Rotation):");
        console.log("   • Slow movements: Should feel smooth and precise");
        console.log("   • Fast movements: Should still respond, not get clamped");
        console.log("   • No sudden stops or jerky movements");
        console.log("   • Continuous rotation in all directions");
        
        console.log("\n2. 🖱️ MIDDLE MOUSE BUTTON + DRAG (Pan):");
        console.log("   • Much more responsive than before (5x speed increase)");
        console.log("   • Smooth panning in all directions");
        console.log("   • No lag or delay when starting movement");
        console.log("   • Proportional to mouse movement speed");
        
        console.log("\n3. 🔄 WHEEL SCROLL (Zoom):");
        console.log("   • Responsive zoom in/out");
        console.log("   • Speed affected by camera speed settings");
        
        // Monitor for extreme movement warnings
        console.log("\n📊 MONITORING MOUSE MOVEMENTS:");
        let extremeMovementCount = 0;
        let normalMovementCount = 0;
        let startTime = Date.now();
        
        // Override console.log temporarily to monitor orthographic mouse messages
        const originalLog = console.log;
        console.log = function(...args) {
            const message = args.join(' ');
            if (message.includes('EXTREME movement detected')) {
                extremeMovementCount++;
                originalLog(`🚨 EXTREME MOVEMENT #${extremeMovementCount}:`, ...args);
            } else if (message.includes('Orthographic rotation') || message.includes('Orthographic pan')) {
                normalMovementCount++;
                if (normalMovementCount % 10 === 0) {
                    originalLog(`✅ Normal movements recorded: ${normalMovementCount}`);
                }
            } else {
                originalLog(...args);
            }
        };
        
        // Restore original console.log after 30 seconds
        setTimeout(() => {
            console.log = originalLog;
            const elapsed = (Date.now() - startTime) / 1000;
            console.log(`\n📈 MOUSE MONITORING RESULTS (${elapsed.toFixed(1)}s):`);
            console.log(`• Normal movements: ${normalMovementCount}`);
            console.log(`• Extreme movements (clampings): ${extremeMovementCount}`);
            
            if (extremeMovementCount === 0) {
                console.log("🎉 EXCELLENT: No extreme movement clamping detected!");
            } else if (extremeMovementCount < 3) {
                console.log("✅ GOOD: Minimal extreme movement clamping");
            } else {
                console.log("⚠️ WARNING: High number of extreme movements - may indicate issues");
            }
            
            console.log("📊 Mouse monitoring completed");
        }, 30000);
        
        console.log("🔍 Monitoring mouse movements for 30 seconds...");
        console.log("🖱️ Start using the mouse controls to generate data");
        
        console.log("\n✅ BEFORE VS AFTER COMPARISON:");
        console.log("BEFORE FIX:");
        console.log("• Clamping at 200px movement -> Frequent interference");
        console.log("• Extreme clamping to 5px -> Unresponsive feel");
        console.log("• Complex momentum dampening -> Sluggish response");
        console.log("• Direction change penalties -> Jerky movements");
        
        console.log("\nAFTER FIX:");
        console.log("• Clamping at 500px movement -> Rare interference");
        console.log("• Proportional scaling -> Maintains responsiveness");
        console.log("• Simplified logic -> Smoother operation");
        console.log("• No momentum penalties -> Natural feel");
        
        console.log("\n💡 DEBUGGING COMMANDS:");
        console.log("• window.getCurrentProjection() - Check current mode");
        console.log("• window.setProjectionMode('Orthographic') - Switch to ortho");
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
console.log("🖱️ Orthographic mouse controls fix test script loaded");
console.log("📋 This will test improved mouse responsiveness and reduced clamping interference");
console.log("⏳ Test will start in 2 seconds...");

setTimeout(testOrthographicMouseControlsFix, 2000);