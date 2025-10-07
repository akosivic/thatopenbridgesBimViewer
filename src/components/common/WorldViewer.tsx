import "./WorldViewer.css";
import {
  Worlds,
  SimpleScene,
  OrthoPerspectiveCamera,
  Components,
  Grids,
  FragmentsManager,
  IfcRelationsIndexer,
  Classifier,
  IfcLoader,
  Cullers,
} from "@thatopen/components";
import i18n from "./utils/i18n";
import { showLoadingOverlay, hideLoadingOverlay, updateLoadingText } from "./utils/LoadingOverlay";
import {
  PostproductionRenderer,
  IfcStreamer,
  Highlighter,
} from "@thatopen/components-front";
import { Manager, Viewport, Component, html, Grid } from "@thatopen/ui";
import * as THREE from "three";
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import projectInformation, { setModel } from "./components/Panels/ProjectInformation";
import elementData from "./components/Panels/Selection";
import settings from "./components/Panels/Settings";
import load from "./components/Toolbars/Sections/Import";
import help from "./components/Panels/Help";
import measurement from "./components/Toolbars/Sections/Measurement";
import selection from "./components/Toolbars/Sections/Selection";
import cameraSettings from "./components/Toolbars/Sections/CameraSettings";
import { AppManager } from "./components/bim-components";
import { loadIfc } from "./components/Toolbars/Sections/Import";
import { setBaseSpeed } from "./components/Toolbars/Sections/SpeedControls";
import { InfoPanelsManager } from "./components/InfoPanelsManager";
import ZoomOptions from "./components/UI/ZoomOptions";
import NaviCube from "./components/UI/NaviCube";
import { getCurrentProjection } from "./components/Toolbars/Sections/ProjectionControls";


interface State {
  update: [];
  leftPanelMinimized: boolean;
}

const dataState: State = {
  update: [],
  leftPanelMinimized: false,
};
export class WorldViewer extends HTMLElement {
  private infoPanelsManager?: InfoPanelsManager;
  private hasTriggeredInitialView = false; // Track if initial view has been set

  constructor() {
    super();
  }

  public fragmentIdMap = function () {
    return new Map<string, Set<number>>();
  }

  disconnectedCallback() {
    // Clean up resources when the element is removed from DOM
    const isDebugMode = new URLSearchParams(window.location.search).has('debug');
    if (isDebugMode) {
        console.log('WorldViewer disconnecting - cleaning up resources...');
    }
    
    if (this.infoPanelsManager) {
      this.infoPanelsManager.dispose();
    }
    
    // Clean up WebGL resources to prevent memory leaks
    try {
      const renderer = (window as any).worldRenderer;
      if (renderer && renderer.dispose) {
        renderer.dispose();
        if (isDebugMode) {
            console.log('WebGL renderer disposed');
        }
      }
      
      // Clear any remaining textures or geometries
      if ((window as any).worldScene) {
        const scene = (window as any).worldScene;
        scene.traverse((object: any) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material: any) => {
                if (material.map) material.map.dispose();
                if (material.normalMap) material.normalMap.dispose();
                if (material.roughnessMap) material.roughnessMap.dispose();
                material.dispose();
              });
            } else {
              if (object.material.map) object.material.map.dispose();
              if (object.material.normalMap) object.material.normalMap.dispose();
              if (object.material.roughnessMap) object.material.roughnessMap.dispose();
              object.material.dispose();
            }
          }
        });
        if (isDebugMode) {
            console.log('Scene resources cleaned up');
        }
      }
    } catch (error) {
      if (isDebugMode) {
          console.warn('Error during cleanup:', error);
      }
    }
  }
  async connectedCallback() {
    // Check if debug mode is enabled via URL parameter
    const isDebugMode = window.location.search.toLowerCase().includes('debug');
    
    try {
      // Initialize WASM modules first
      if (isDebugMode) {
          console.log('Pre-loading WebAssembly modules...');
      }

      // Pre-initialize web-ifc WASM module
      try {
        await import('web-ifc');
        if (isDebugMode) {
            console.log('web-ifc WASM module loaded successfully');
        }
      } catch (wasmError) {
        if (isDebugMode) {
            console.warn('Failed to pre-load web-ifc WASM module:', wasmError);
        }
        // Continue with initialization even if pre-loading fails
      }

      await this.initializeWorldViewer();
    } catch (error) {
      if (isDebugMode) {
          console.error('Failed to initialize WorldViewer:', error);
      }
    }
  }

  private async initializeWorldViewer() {
    // Show loading overlay immediately when app initializes
    const loadingOverlay = showLoadingOverlay('initializing');

    // Check if debug mode is enabled via URL parameter
    const isDebugMode = window.location.search.toLowerCase().includes('debug');
    if (isDebugMode) {
      console.log('Debug mode detected:', isDebugMode, 'URL:', window.location.search);
    }

    Manager.init();

    const components = new Components();
    const worlds = components.get(Worlds);

    const world = worlds.create<
      SimpleScene,
      OrthoPerspectiveCamera,
      PostproductionRenderer
    >();
    world.name = "Main";

    world.scene = new SimpleScene(components);
    world.scene.setup();
    world.scene.three.background = null;

    const viewport = Component.create<Viewport>(() => {
      return html`
        <bim-viewport>
          <bim-grid floating></bim-grid>
        </bim-viewport>
      `;
    });

    world.renderer = new PostproductionRenderer(components, viewport);
    const { postproduction } = world.renderer;
    
    // Store renderer and scene references for cleanup
    (window as any).worldRenderer = world.renderer.three;
    (window as any).worldScene = world.scene.three;

    // Add WebGL context loss handling
    const canvas = world.renderer.three.domElement;
    
    canvas.addEventListener('webglcontextlost', (event) => {
      if (isDebugMode) {
        console.warn('WebGL context lost. Preventing default behavior...');
      }
      event.preventDefault();
      
      // Pause any animations or rendering loops
      if (world.renderer) {
        if (isDebugMode) {
            console.log('Pausing renderer due to context loss');
        }
      }
      
      // Show a user-friendly message
      const contextLostOverlay = document.createElement('div');
      contextLostOverlay.id = 'webgl-context-lost-overlay';
      contextLostOverlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 100000;
        text-align: center;
        font-family: system-ui, sans-serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      `;
      contextLostOverlay.innerHTML = `
        <h3>Graphics Context Lost</h3>
        <p>The 3D graphics context was lost. Attempting to restore...</p>
        <div style="margin-top: 10px;">
          <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        </div>
        <style>
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      `;
      document.body.appendChild(contextLostOverlay);
    }, false);

    canvas.addEventListener('webglcontextrestored', () => {
      if (isDebugMode) {
        console.log('WebGL context restored. Reinitializing renderer...');
      }
      
      // Remove the overlay
      const overlay = document.getElementById('webgl-context-lost-overlay');
      if (overlay) {
        overlay.remove();
      }
      
      try {
        // Reinitialize the renderer
        if (world.renderer) {
          world.renderer.update();
          if (isDebugMode) {
            console.log('Renderer reinitialized successfully');
          }
        }
        
        // Reinitialize postproduction effects
        if (postproduction) {
          postproduction.enabled = true;
          postproduction.setPasses({ custom: true, ao: true, gamma: true });
          if (isDebugMode) {
            console.log('Postproduction effects restored');
          }
        }
        
        // Force a render update
        setTimeout(() => {
          if (world.renderer) {
            world.renderer.update();
          }
        }, 100);
        
      } catch (error) {
        if (isDebugMode) {
            console.error('Error reinitializing after context restore:', error);
        }
        
        // Show reload suggestion if reinitialization fails
        const reloadOverlay = document.createElement('div');
        reloadOverlay.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 20px;
          border-radius: 8px;
          z-index: 100000;
          text-align: center;
          font-family: system-ui, sans-serif;
        `;
        reloadOverlay.innerHTML = `
          <h3>Unable to Restore Graphics</h3>
          <p>Please reload the page to restore 3D functionality.</p>
          <button onclick="window.location.reload()" style="
            padding: 10px 20px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
          ">Reload Page</button>
        `;
        document.body.appendChild(reloadOverlay);
      }
    }, false);

    world.camera = new OrthoPerspectiveCamera(components);

    // Initialize camera projection to match the default setting (Orthographic)
    setTimeout(() => {
      if (isDebugMode) {
        console.log('Setting initial projection to Orthographic...');
      }
      if (world.camera instanceof OrthoPerspectiveCamera) {
        world.camera.projection.set("Orthographic");
        
        // CRITICAL: Set proper orthographic camera parameters to prevent white screen
        const orthoCam = world.camera.three as THREE.OrthographicCamera;
        if (orthoCam.type === 'OrthographicCamera') {
          // Set proper frustum size for orthographic camera
          const size = 10; // Viewing area size
          const aspect = window.innerWidth / window.innerHeight;
          
          orthoCam.left = -size * aspect;
          orthoCam.right = size * aspect;
          orthoCam.top = size;
          orthoCam.bottom = -size;
          orthoCam.near = 0.1;
          orthoCam.far = 1000;
          orthoCam.zoom = 0.5; // Start with wider view
          orthoCam.updateProjectionMatrix();
          
          if (isDebugMode) {
            console.log('Orthographic camera frustum configured:', {
              left: orthoCam.left,
              right: orthoCam.right,
              top: orthoCam.top,
              bottom: orthoCam.bottom,
              zoom: orthoCam.zoom
            });
          }
        }
        
        // Also set via controls if available
        if (world.camera.controls?.camera) {
          world.camera.controls.camera.zoom = 0.5;
          world.camera.controls.camera.updateProjectionMatrix();
        }
        
        if (isDebugMode) {
          console.log('Camera projection initialized to Orthographic mode');
          console.log('Camera ready for model-triggered view positioning');
        }
      }
    }, 100);

    // First-Person Camera Setup (FPS-style controls)
    // Set initial camera position at eye level (1.6m height) - LOCKED
    const defaultX = -7.846;
    const defaultY = 1.60; // Eye level height - LOCKED, never changes
    const defaultZ = 1.567;

    // Create pointer lock controls for first-person navigation
    let fpControls: PointerLockControls | null = null;

    // Set camera position directly in world coordinates (Y is locked to 1.6)
    world.camera.three.position.set(defaultX, defaultY, defaultZ);

    // Set initial camera orientation: H = -3.7°, V = 91.6°
    // H = yaw (rotation.y), V = pitch (rotation.x)
    world.camera.three.rotation.y = -3.7 * Math.PI / 180;
    // V = 91.6° means rot.x = (90 - 91.6) * PI/180 = -1.6°
    world.camera.three.rotation.x = -1.6 * Math.PI / 180;
    world.camera.three.rotation.z = 0;
    world.camera.three.updateMatrixWorld();

    // WebGL optimization settings to prevent context loss
    const renderer = world.renderer.three;
    if (renderer.getContext()) {
      const gl = renderer.getContext();
      
      // Enable context loss and restoration handling
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        if (isDebugMode) {
            console.log('WebGL lose context extension available');
        }
        
        // Add periodic context validation (optional)
        setInterval(() => {
          if (gl.isContextLost()) {
            if (isDebugMode) {
                console.warn('WebGL context lost detected during periodic check');
            }
          }
        }, 10000); // Check every 10 seconds
      }
      
      // Optimize WebGL settings to reduce memory pressure
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
      renderer.info.autoReset = true; // Auto-reset render stats
      
      // Enable memory management
      renderer.dispose = (() => {
        const originalDispose = renderer.dispose.bind(renderer);
        return () => {
          if (isDebugMode) {
              console.log('Disposing WebGL renderer resources...');
          }
          originalDispose();
        };
      })();
      
      if (isDebugMode) {
          console.log('WebGL optimization settings applied');
      }
    }

    // Initialize pointer lock controls
    fpControls = new PointerLockControls(world.camera.three, viewport);

    // Store FPS controls reference for Camera.ts
    const { setFPControls } = await import('./components/Toolbars/Sections/CameraSettings');
    setFPControls(fpControls);

    // Initialize orthographic mouse controls
    const { initializeOrthographicControls } = await import('./components/Toolbars/Sections/OrthographicMouseControls');
    initializeOrthographicControls(world, viewport);
    if (isDebugMode) {
        console.log('Orthographic mouse controls initialized');
    }

    // DISABLE the original orbit controls to prevent conflicts
    if (world.camera.controls) {
      world.camera.controls.enabled = false;
      if (isDebugMode) {
          console.log('Original orbit controls disabled');
      }
    }

    // Override the original camera controls with first-person controls
    // Store reference to controls on camera for access elsewhere
    interface CameraWithFPS extends OrthoPerspectiveCamera {
      fpControls?: PointerLockControls;
    }
    (world.camera as CameraWithFPS).fpControls = fpControls;

    // Add press-and-hold functionality for FPS mode, but allow screenshot button to work
    let isMousePressed = false;

    // Prevent FPS activation when clicking toolbar buttons or their children
    function isToolbarButton(target: EventTarget | null): boolean {
      if (!target || !(target instanceof HTMLElement)) return false;
      // Check for toolbar/tab/button classes and UI elements that should block FPS
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
      `.replace(/\s+/g, ''));
    }

    // Track mousedown position to ensure consistent behavior
    let mouseDownOnToolbar = false;

    viewport.addEventListener('mousedown', async (e) => {
      mouseDownOnToolbar = isToolbarButton(e.target);

      if (mouseDownOnToolbar) {
        if (isDebugMode) {
            console.log('Mouse down on toolbar element, FPS blocked');
        }
        return;
      }

      // Check projection mode to determine behavior
      try {
        const { getCurrentProjection } = await import('./components/Toolbars/Sections/ProjectionControls');
        const currentProjection = getCurrentProjection();
        
        if (currentProjection === "Perspective" && fpControls && e.button === 0) {
          // Perspective mode: Use FPS controls (left mouse activates pointer lock)
          isMousePressed = true;
          fpControls.lock();
          if (isDebugMode) {
              console.log('Mouse pressed - FPS mode ACTIVATED');
          }
        } else if (currentProjection === "Orthographic") {
          // Orthographic mode: OrthographicMouseControls handles all mouse events
          if (isDebugMode) {
              console.log('Mouse event handled by orthographic controls');
          }
        }
      } catch (error) {
        if (isDebugMode) {
            console.warn('Could not determine projection mode, defaulting to perspective behavior');
        }
        if (fpControls && e.button === 0) {
          isMousePressed = true;
          fpControls.lock();
          if (isDebugMode) {
              console.log('Mouse pressed - FPS mode ACTIVATED (fallback)');
          }
        }
      }
    });

    viewport.addEventListener('mouseup', async (e) => {
      // Check both current target and original mousedown target
      const currentTargetIsToolbar = isToolbarButton(e.target);

      if (mouseDownOnToolbar || currentTargetIsToolbar) {
        // Reset tracking variables
        mouseDownOnToolbar = false;
        if (isDebugMode) {
            console.log('Mouse up on/from toolbar element, FPS remains blocked');
        }
        return;
      }

      // Check projection mode to determine behavior
      try {
        const { getCurrentProjection } = await import('./components/Toolbars/Sections/ProjectionControls');
        const currentProjection = getCurrentProjection();
        
        if (currentProjection === "Perspective" && fpControls && e.button === 0 && isMousePressed) {
          // Perspective mode: Deactivate FPS controls
          isMousePressed = false;
          fpControls.unlock();
          if (isDebugMode) {
              console.log('Mouse released - FPS mode DEACTIVATED');
          }
        }
        // Orthographic mode: OrthographicMouseControls handles mouse up
      } catch (error) {
        if (isDebugMode) {
            console.warn('Could not determine projection mode, using fallback behavior');
        }
        if (fpControls && e.button === 0 && isMousePressed) {
          isMousePressed = false;
          fpControls.unlock();
          if (isDebugMode) {
              console.log('Mouse released - FPS mode DEACTIVATED (fallback)');
          }
        }
      }

      // Reset tracking variables
      mouseDownOnToolbar = false;
    });

    // Also handle mouse leave to deactivate FPS if mouse leaves the viewport
    viewport.addEventListener('mouseleave', () => {
      if (fpControls && isMousePressed) {
        isMousePressed = false;
        fpControls.unlock();
        if (isDebugMode) {
            console.log('Mouse left viewport - FPS mode DEACTIVATED');
        }
      }
    });

    // Handle pointer lock events
    fpControls.addEventListener('lock', () => {
      if (isDebugMode) {
          console.log('First-person controls locked - mouse look active');
      }
    });

    fpControls.addEventListener('unlock', () => {
      if (isDebugMode) {
          console.log('First-person controls unlocked - mouse look inactive');
      }
    });

    // Set default camera properties
    if (world.camera.controls && world.camera.controls.camera) {
      world.camera.controls.camera.zoom = 1.00;
      world.camera.controls.camera.updateProjectionMatrix();
    }

    
    if (isDebugMode) {
        console.log('First-person camera initialized at position:', world.camera.three.position);
    }    // Create camera position display only in debug mode
    let positionDisplay: HTMLElement | null = null;
    if (isDebugMode) {
      positionDisplay = document.createElement('div');
      positionDisplay.id = 'fps-position-display';
      positionDisplay.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: #00ff00;
        padding: 8px 12px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        border-radius: 4px;
        z-index: 9999;
        border: 1px solid #00ff00;
        box-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
        min-width: 200px;
        pointer-events: none;
        max-height: 250px;
        overflow-y: auto;
        line-height: 1.3;
      `;
      positionDisplay.innerHTML = `<div style="font-weight: bold; color: #00ff00;">🎮 DEBUG</div><div>Initializing...</div>`;
      document.body.appendChild(positionDisplay);
      if (isDebugMode) {
          console.log('Position display created and added to BOTTOM RIGHT');
      }
    }

    // FPS-style movement controls
    let moveSpeed = 5.0; // Units per second for FPS movement (now variable)
    let keyboardControlsUpdate: ((speed: number) => void) | null = null;

    // Set up speed control integration
    setBaseSpeed(moveSpeed);

    // Listen for speed change events from SpeedControls
    window.addEventListener('moveSpeedChange', (event: any) => {
      const { effectiveSpeed } = event.detail;
      moveSpeed = effectiveSpeed;
      
      // Update keyboard controls with new speed if available
      if (keyboardControlsUpdate) {
        keyboardControlsUpdate(moveSpeed);
        if (isDebugMode) {
          console.log(`🎯 Updated keyboard controls context with new moveSpeed: ${moveSpeed}`);
        }
      }
      
      if (isDebugMode) {
          console.log(`WorldViewer moveSpeed updated to: ${moveSpeed}`);
      }
    });

    // Listen for manual movement events from SpeedControls direction buttons
    window.addEventListener('manualMovement', async (event: any) => {
      const { direction, speed } = event.detail;
      if (isDebugMode) {
          console.log(`Manual movement triggered: ${direction} at speed ${speed}`);
      }

      if (!fpControls) return;

      const moveDistance = speed * 0.1; // Adjust multiplier for single movement steps
      const currentDirection = new THREE.Vector3();
      const sideways = new THREE.Vector3();
      const upVector = new THREE.Vector3(0, 1, 0);

      // Get camera's current orientation
      world.camera.three.getWorldDirection(currentDirection);
      sideways.crossVectors(currentDirection, upVector).normalize();

      // Apply movement based on direction
      switch (direction) {
        case 'up':
          world.camera.three.position.addScaledVector(currentDirection, moveDistance);
          break;
        case 'down':
          world.camera.three.position.addScaledVector(currentDirection, -moveDistance);
          break;
        case 'left':
          world.camera.three.position.addScaledVector(sideways, -moveDistance);
          break;
        case 'right':
          world.camera.three.position.addScaledVector(sideways, moveDistance);
          break;
      }

      // Get current projection mode to apply restrictions only to perspective mode
      try {
        const { getCurrentProjection } = await import('./components/Toolbars/Sections/ProjectionControls');
        const currentProjection = getCurrentProjection();
        
        if (currentProjection === "Perspective") {
          // FORCE Y position to always be at eye level (1.6 meters) - perspective mode only
          world.camera.three.position.y = 1.6;
          if (isDebugMode) {
              console.log(`Moved ${direction} (Perspective mode - Y locked at 1.6m):`, world.camera.three.position);
          }
        } else {
          // Orthographic mode: No Y-axis restrictions, allow free movement
          if (isDebugMode) {
              console.log(`Moved ${direction} (Orthographic mode - no restrictions):`, world.camera.three.position);
          }
        }
      } catch (error) {
        if (isDebugMode) {
            console.warn('Could not determine projection mode, applying default restrictions:', error);
        }
        world.camera.three.position.y = 1.6; // Fallback to perspective behavior
        if (isDebugMode) {
            console.log(`Moved ${direction} (fallback behavior):`, world.camera.three.position);
        }
      }
    });

    // Create enhanced position display update function for debug mode
    const updatePositionDisplay = async () => {
      if (isDebugMode && positionDisplay && fpControls) {
        const pos = world.camera.three.position;
        const rot = world.camera.three.rotation;
        const isLocked = fpControls.isLocked;

        try {
          const { getCurrentProjection } = await import('./components/Toolbars/Sections/ProjectionControls');
          const projection = getCurrentProjection();
          
          positionDisplay.innerHTML = `
            <div style="font-weight: bold; color: #00ff00; margin-bottom: 4px; font-size: 12px;">🎮 DEBUG</div>
            <div style="font-weight: bold; color: ${isLocked ? '#00ff00' : '#ff8800'}; font-size: 11px; margin-bottom: 4px;">
              ${isLocked ? '🔒 FPS ON' : '🔓 HOLD MOUSE'}
            </div>
            <div style="margin-bottom: 2px;"><strong>Mode:</strong> <span style="color: #ffdd00;">${projection}</span></div>
            <div style="margin-bottom: 2px;"><strong>Pos:</strong></div>
            <div style="margin-left: 8px; margin-bottom: 4px; font-size: 10px;">
              X: ${pos.x.toFixed(2)}<br>
              Y: ${pos.y.toFixed(2)}<br>
              Z: ${pos.z.toFixed(2)}
            </div>
            <div style="margin-bottom: 2px;"><strong>Rot:</strong></div>
            <div style="margin-left: 8px; margin-bottom: 4px; font-size: 10px;">
              H: ${(rot.y * 180 / Math.PI).toFixed(1)}°<br>
              V: ${(90 - rot.x * 180 / Math.PI).toFixed(1)}°
            </div>
            <div style="font-size: 9px; color: #ccc; border-top: 1px solid #333; padding-top: 4px;">
              <span style="color: #00ff00;">Enhanced Controls Active</span><br>
              Projection-aware bindings
            </div>
          `;

          // Make sure it's visible
          positionDisplay.style.display = 'block';
          positionDisplay.style.visibility = 'visible';

        } catch (error) {
          if (isDebugMode) {
              console.error('Error updating position display:', error);
          }
        }
      }
      requestAnimationFrame(updatePositionDisplay);
    };

    // Start position display update loop
    if (isDebugMode) {
      updatePositionDisplay();
    }

    // Import enhanced keyboard controls
    const { initializeKeyboardControls, setKeyboardControlsContext } = await import('./components/Toolbars/Sections/EnhancedKeyboardControls');
    
    // Initialize enhanced keyboard controls with projection-aware bindings
    setKeyboardControlsContext(fpControls, world, moveSpeed);
    initializeKeyboardControls();
    
    // Set up the update function for speed changes
    keyboardControlsUpdate = (newSpeed: number) => {
      setKeyboardControlsContext(fpControls, world, newSpeed);
    };
    
    if (isDebugMode) {
        console.log('Enhanced keyboard controls initialized with projection-specific bindings');
    }

    // Enable scroll wheel movement: scroll up = forward, scroll down = backward
    viewport.addEventListener('wheel', async (event: WheelEvent) => {
      if (!fpControls) return;

      event.preventDefault(); // Prevent default scroll behavior

      if (isDebugMode) {
          console.log('=== MOUSEWHEEL MOVEMENT ===');
          console.log('Delta:', event.deltaY);
      }

      // Calculate movement distance based on scroll
      const scrollMovementSpeed = 2.0; // Adjust this value to control scroll sensitivity
      const moveDistance = scrollMovementSpeed;

      // Get camera's forward direction
      const direction = new THREE.Vector3();
      world.camera.three.getWorldDirection(direction);

      // Scroll up (negative deltaY) = move forward (like up arrow)
      // Scroll down (positive deltaY) = move backward (like down arrow)
      if (event.deltaY < 0) {
        // Scroll up = move forward
        world.camera.three.position.addScaledVector(direction, moveDistance);
        console.log('Scroll up: Moving FORWARD');
      } else if (event.deltaY > 0) {
        // Scroll down = move backward
        world.camera.three.position.addScaledVector(direction, -moveDistance);
        if (isDebugMode) {
            console.log('Scroll down: Moving BACKWARD');
        }
      }

      // Get current projection mode to apply restrictions only to perspective mode
      try {
        const { getCurrentProjection } = await import('./components/Toolbars/Sections/ProjectionControls');
        const currentProjection = getCurrentProjection();
        
        if (currentProjection === "Perspective") {
          // FORCE Y position to always be at eye level (1.6 meters) - perspective mode only
          world.camera.three.position.y = 1.6;
          if (isDebugMode) {
              console.log('Perspective mode: Y position locked to 1.6m');
          }
        } else {
          // Orthographic mode: No Y-axis restrictions, allow free movement
          if (isDebugMode) {
              console.log('Orthographic mode: No Y-axis restrictions applied');
          }
        }
      } catch (error) {
        if (isDebugMode) {
            console.warn('Could not determine projection mode, applying default restrictions:', error);
        }
        world.camera.three.position.y = 1.6; // Fallback to perspective behavior
      }

      if (isDebugMode) {
          console.log('New position:', world.camera.three.position);
      }
    });

    const worldGrid = components.get(Grids).create(world);
    worldGrid.material.uniforms.uColor.value = new THREE.Color(0x424242);
    worldGrid.material.uniforms.uSize1.value = 2;
    worldGrid.material.uniforms.uSize2.value = 8;

    const resizeWorld = () => {
      world.renderer?.resize();
      world.camera.updateAspect();
    };

    viewport.addEventListener("resize", resizeWorld);

    components.init();

    postproduction.enabled = true;
    postproduction.customEffects.excludedMeshes.push(worldGrid.three);
    postproduction.setPasses({ custom: true, ao: true, gamma: true });
    postproduction.customEffects.lineColor = 0x17191c;

    // Initialize InfoPanelsManager for 3D information panels
    if (isDebugMode) {
        console.log('🔧 Initializing InfoPanelsManager...');
    }
    this.infoPanelsManager = new InfoPanelsManager(
      world.scene.three,
      world.camera.three,
      world.renderer.three,
      (config) => {
        if (isDebugMode) {
            console.log('Info panels configuration updated:', config);
        }
      }
    );

    // Load info panels configuration
    if (isDebugMode) {
        console.log('📁 Loading info panels configuration...');
    }
    const configLoaded = await this.infoPanelsManager.loadConfig();
    if (isDebugMode) {
        console.log('Config loading result:', configLoaded);
    }

    // Expose InfoPanelsManager to window for debugging distance settings
    (window as any).infoPanelsManager = this.infoPanelsManager;
    if (isDebugMode) {
        console.log('🔧 InfoPanelsManager exposed to window.infoPanelsManager for debugging');
        console.log('💡 Use window.infoPanelsManager.setVisibilityDistance(min, max) to adjust distance thresholds');
        console.log('💡 Current settings: Show when 2-8 units away, fade 8-15 units, hide beyond 15 units');
        console.log('💡 Use window.infoPanelsManager.getDistanceInfo() to see current distances');
    }

    const appManager = components.get(AppManager);
    const viewportGrid = viewport.querySelector<Grid>("bim-grid[floating]")!;
    appManager.grids.set("viewport", viewportGrid);

    const fragments = components.get(FragmentsManager);
    const indexer = components.get(IfcRelationsIndexer);
    const classifier = components.get(Classifier);
    classifier.list.CustomSelections = {};

    // Initialize highlighter early so it's available for FPS movement
    const highlighter = components.get(Highlighter);

    const ifcLoader = components.get(IfcLoader);
    updateLoadingText('settingUpIfcLoader');
    await ifcLoader.setup();

    // Optimize IFC loader settings for better loading performance
    ifcLoader.settings.wasm = {
      path: "https://unpkg.com/web-ifc@0.0.57/",
      absolute: true
    };
    ifcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;

    console.log('IFC Loader optimized for performance');

    const tilesLoader = components.get(IfcStreamer);
    tilesLoader.world = world;
    tilesLoader.culler.threshold = 10;
    tilesLoader.culler.maxHiddenTime = 1000;
    tilesLoader.culler.maxLostTime = 40000;

    // Use the highlighter initialized earlier
    highlighter.setup({ world });
    highlighter.zoomToSelection = true;

    // Define constants for ground level and eye elevation
    const groundLevelZ = 0.05; // 50mm in meters
    const eyeElevationZ = 1.6; // 1600mm in meters
    const distanceFromLight = 1.7; // 1700mm in meters

    // Calculate zoom factor based on the distance from light to eye and ground
    // This creates a proportional zoom effect based on the viewing geometry
    const zoomDistance = distanceFromLight / (eyeElevationZ - groundLevelZ);
    console.log('Zoom distance calculated:', zoomDistance);
    highlighter.zoomFactor = zoomDistance;

    // Set up HighlighterConfig according to the type definition
    highlighter.config = {
      selectName: "select",
      /** Toggles the select functionality. */
      selectEnabled: isDebugMode,
      /** Name of the hover event. */
      hoverName: "hover",
      /** Toggles the hover functionality. */
      hoverEnabled: isDebugMode,
      /** Color used for selection. */
      selectionColor: new THREE.Color(1, 1, 0),
      /** Color used for hover. */
      hoverColor: new THREE.Color(1, 1, 1),
      /** Whether to automatically highlight fragments on click. */
      autoHighlightOnClick: isDebugMode,
      /** The world in which the highlighter operates. */
      world: world
    };
    const culler = components.get(Cullers).create(world);
    culler.threshold = 5;

    // Add FPS camera movement detection to clear selection when camera moves
    const lastCameraPosition = world.camera.three.position.clone();

    // Check for camera movement changes and clear selection
    const checkCameraMovement = () => {
      if (!fpControls) {
        requestAnimationFrame(checkCameraMovement);
        return;
      }

      const currentPosition = world.camera.three.position.clone();
      const positionChanged = !lastCameraPosition.equals(currentPosition);

      if (positionChanged) {
        lastCameraPosition.copy(currentPosition);
      }

      requestAnimationFrame(checkCameraMovement);
    };
    checkCameraMovement();

    fragments.onFragmentsLoaded.add(async (model) => {
      console.log('Fragment loading started for model:', model);

      try {
        // Check WebGL context before proceeding
        if (!world.renderer) {
          console.warn('Renderer not available during fragment loading');
          return;
        }
        
        const gl = world.renderer.three.getContext();
        if (gl.isContextLost()) {
          console.warn('WebGL context lost during fragment loading, skipping...');
          return;
        }

        if (model.hasProperties) {
          console.log('Processing model properties...');
          await indexer.process(model);
          classifier.byEntity(model);
          console.log('Model properties processed');
        }

        if (!model.isStreamed) {
          console.log('Adding model fragments to scene...');
          let fragmentCount = 0;
          for (const fragment of model.items) {
            try {
              // Check context again for each fragment
              if (gl.isContextLost()) {
                console.warn('WebGL context lost during fragment processing, stopping...');
                break;
              }

              world.meshes.add(fragment.mesh);
              culler.add(fragment.mesh);

              // Ensure fragment mesh is visible and has proper material
              if (fragment.mesh) {
                fragment.mesh.visible = true;
                fragment.mesh.castShadow = true;
                fragment.mesh.receiveShadow = true;

                // Force material update with error handling
                if (fragment.mesh.material) {
                  try {
                    if (Array.isArray(fragment.mesh.material)) {
                      fragment.mesh.material.forEach(mat => {
                        if (mat && 'needsUpdate' in mat) {
                          (mat as THREE.Material).needsUpdate = true;
                        }
                      });
                    } else if ('needsUpdate' in fragment.mesh.material) {
                      (fragment.mesh.material as THREE.Material).needsUpdate = true;
                    }
                  } catch (materialError) {
                    console.warn('Error updating material for fragment:', materialError);
                  }
                }

                fragmentCount++;
                
                // Yield control periodically to prevent blocking
                if (fragmentCount % 50 === 0) {
                  await new Promise(resolve => setTimeout(resolve, 1));
                }
              }
            } catch (fragmentError) {
              console.warn('Error processing fragment:', fragmentError);
              // Continue with next fragment
            }
          }
          console.log(`Added ${fragmentCount} fragments to scene`);
        }

        // Add model to scene with error handling
        try {
          world.scene.three.add(model);
          console.log('Model added to Three.js scene');
        } catch (sceneError) {
          console.warn('Error adding model to scene:', sceneError);
        }

        // Force renderer update with error handling
        try {
          if (world.renderer && !gl.isContextLost()) {
            world.renderer.update();
            console.log('Renderer updated');
          }
        } catch (renderError) {
          console.warn('Error updating renderer:', renderError);
        }
      } catch (overallError) {
        console.error('Overall error in fragment loading:', overallError);
      }

      if (!model.isStreamed) {
        // FPS camera positioning removed - NaviCube handles initial view
        console.log('Model fragments loaded - letting NaviCube handle camera positioning');
      }
    });

    fragments.onFragmentsDisposed.add(({ fragmentIDs }) => {
      for (const fragmentID of fragmentIDs) {
        const mesh = [...world.meshes].find((mesh) => mesh.uuid === fragmentID);
        if (mesh) {
          world.meshes.delete(mesh);
        }
      }
    });

    const projectInformationPanel = await projectInformation(components, isDebugMode, highlighter);
    const elementDataPanel = elementData(components, isDebugMode);

    const [toolbar, updateToolbar] = Component.create<HTMLElement, State>((state) => {
      console.log('Updating toolbar with state:', state);
      if (isDebugMode) {
        return html`
        <bim-tabs floating style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); border-radius: 0.5rem; padding: 30px; z-index: 100000; pointer-events: auto;">
          <bim-tab label="${i18n.t('import')}">
            <bim-toolbar style="pointer-events: auto;">${load(components)}</bim-toolbar>
          </bim-tab>
          <bim-tab label="${i18n.t('cameraSettings')}">
            <bim-toolbar style="pointer-events: auto;">
              ${cameraSettings(world)} ${selection(components, world)}
            </bim-toolbar>
          </bim-tab>
          <bim-tab label="${i18n.t('measurements')}">
            <bim-toolbar style="pointer-events: auto;"> ${measurement(world, components)} </bim-toolbar>
          </bim-tab>
        </bim-tabs>
      `;
      }
      else {
        return html`
        <bim-tabs floating style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); border-radius: 0.5rem; padding: 30px; z-index: 100000; pointer-events: auto;">
          <bim-tab label="${i18n.t('cameraSettings')}">
            <bim-toolbar style="pointer-events: auto;">
              ${cameraSettings(world)}
            </bim-toolbar>
          </bim-tab>
        </bim-tabs>
      `;
      }
    }, dataState);

    // Create the ZoomOptions component
    const zoomOptionsComponent = ZoomOptions(world);
    console.log('ZoomOptions component created:', zoomOptionsComponent);

    // Create the NaviCube component
    const naviCubeComponent = NaviCube(world);
    console.log('NaviCube component created:', naviCubeComponent);

    // Create a function to update the panel when language changes
    const updatePanelOnLanguageChange = () => {
      updateLeftPanelFn(dataState);
      updateToolbar(dataState);
    };

    // Add language change listener
    i18n.on('languageChanged', updatePanelOnLanguageChange);

    // Simple tab state - bypass the framework's broken tabs
    let currentActiveTab = 'project';

    // Create the left panel component first
    const [leftPanel, updateLeftPanelFn] = Component.create<HTMLElement, State>((state) => {
      console.log('Updating left panel with state:', state, 'Active tab:', currentActiveTab);

      // Custom tab switcher function
      const switchTab = (newTab: string) => {
        currentActiveTab = newTab;
        updateLeftPanelFn(state);
      };

      // Create custom tab buttons and content area
      const tabButtons = isDebugMode ? [
        { name: 'project', label: i18n.t('project'), icon: 'ph:building-fill' },
        { name: 'infopanels', label: 'Info Panels', icon: 'material-symbols:info' },
        { name: 'settings', label: i18n.t('settings'), icon: 'solar:settings-bold' },
        { name: 'infopanels', label: 'Info Panels', icon: 'material-symbols:info' },
        { name: 'help', label: i18n.t('help'), icon: 'material-symbols:help' }
      ] : [
        { name: 'project', label: i18n.t('project'), icon: 'ph:building-fill' }
      ];

      // Get current tab content
      const getCurrentTabContent = () => {
        switch (currentActiveTab) {
          case 'project':
            return projectInformationPanel;
          case 'infopanels':
            return this.infoPanelsManager?.createManagementPanel();
          case 'settings':
            return settings(components);
          case 'help':
            return help;
          default:
            return projectInformationPanel;
        }
      };

      // Use consistent container style - let CSS handle the visibility
      const containerStyle = "display: flex; flex-direction: column; height: 100%;";

      return html`
        <div class="custom-tabs-container" style="${containerStyle}">
          <!-- Custom Tab Headers with Minimize Button -->
          <div class="custom-tab-headers" style="display: flex; border-bottom: 1px solid #333; margin-bottom: 1rem; flex-shrink: 0;">
            ${tabButtons.map(tab => html`
              <button 
                class="custom-tab-button ${currentActiveTab === tab.name ? 'active' : ''}" 
                @click=${() => switchTab(tab.name)}
                style="
                  flex: 1; 
                  padding: 12px 8px; 
                  background: ${currentActiveTab === tab.name ? '#444' : '#222'}; 
                  color: white; 
                  border: none; 
                  cursor: pointer;
                  font-size: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 4px;
                "
              >
                <bim-icon icon="${tab.icon}" style="font-size: 14px;"></bim-icon>
                ${tab.label}
              </button>
            `)}
            <!-- Minimize Button -->
            <button 
              class="left-panel-minimize-btn" 
              id="minimize-panel-btn"
              style="
                width: 40px; 
                padding: 12px 8px; 
                background: #333; 
                color: white; 
                border: none; 
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                border-left: 1px solid #555;
              "
              title="Minimize Panel"
            >
              <bim-icon icon="material-symbols:chevron-left" style="font-size: 16px;"></bim-icon>
            </button>
          </div>
          
          <!-- Tab Content Area -->
          <div class="custom-tab-content" style="flex: 1; overflow-y: auto;">
            ${getCurrentTabContent()}
          </div>
        </div>
      `;
    }, dataState);

    // Function to toggle left panel visibility (instant, no delays)
    const toggleLeftPanel = () => {
      const gridApp = document.getElementById('app') as Grid;
      const expandButton = document.querySelector('.left-panel-expand-btn') as HTMLElement;

      // Toggle state and apply changes instantly via CSS classes only
      dataState.leftPanelMinimized = !dataState.leftPanelMinimized;

      if (dataState.leftPanelMinimized) {
        // Hide panel
        gridApp?.classList.add('left-panel-minimized');
        if (expandButton) expandButton.style.display = 'block';
      } else {
        // Show panel
        gridApp?.classList.remove('left-panel-minimized');
        if (expandButton) expandButton.style.display = 'none';
      }

      console.log('Panel toggled instantly. Minimized:', dataState.leftPanelMinimized);
    };

    const app = document.getElementsByTagName("world-viewer")[0];
    const grid = document.createElement("bim-grid") as Grid;
    app.classList.add("world-viewer");
    grid.id = "app";
    app.appendChild(grid);

    const gridApp = grid as Grid;

    // Store grid reference globally for the toggle function
    (window as any).bimGridApp = gridApp;

    // Create floating expand button (hamburger menu)
    const createExpandButton = () => {
      const expandButton = document.createElement('button');
      expandButton.className = 'left-panel-expand-btn bim-expand-button';
      expandButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 12H21M3 6H21M3 18H21" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      expandButton.title = 'Expand Panel';
      expandButton.style.cssText = `
        position: fixed;
        top: 80px;
        left: 10px;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.8);
        border: none;
        border-radius: 8px;
        cursor: pointer;
        padding: 12px;
        transition: none;
        display: none;
        backdrop-filter: blur(4px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `;

      // Event listener will be added after toggleLeftPanel is defined

      expandButton.addEventListener('mouseenter', () => {
        expandButton.style.background = 'rgba(0, 0, 0, 0.9)';
        expandButton.style.transform = 'none';
      });

      expandButton.addEventListener('mouseleave', () => {
        expandButton.style.background = 'rgba(0, 0, 0, 0.8)';
        expandButton.style.transform = 'none';
      });

      return expandButton;
    };

    const expandButton = createExpandButton();
    app.appendChild(expandButton);

    // Add the ZoomOptions component to the body only if in orthographic mode
    const updateZoomOptionsVisibility = () => {
      const currentMode = getCurrentProjection();
      const existingZoomPanel = document.getElementById('zoom-options-panel');
      
      if (currentMode === 'Orthographic') {
        if (!existingZoomPanel) {
          document.body.appendChild(zoomOptionsComponent);
          console.log('ZoomOptions component added to DOM body for orthographic mode');
        }
      } else {
        if (existingZoomPanel) {
          document.body.removeChild(existingZoomPanel);
          console.log('ZoomOptions component removed from DOM body for perspective mode');
        }
      }
    };
    
    // Initial setup - check current projection
    updateZoomOptionsVisibility();
    
    // Listen for projection changes and update zoom options visibility
    window.addEventListener('projectionChanged', (event: any) => {
      console.log('Projection changed event received:', event.detail.mode);
      updateZoomOptionsVisibility();
    });

    // Add the NaviCube component to the body
    document.body.appendChild(naviCubeComponent);
    console.log('NaviCube component added to DOM body:', document.getElementById('navi-cube'));

    // Add event listeners after all elements are created
    setTimeout(() => {
      // Add expand button click listener
      expandButton.addEventListener('click', toggleLeftPanel);

      // Add minimize button click listener
      const minimizeBtn = document.getElementById('minimize-panel-btn');
      if (minimizeBtn) {
        minimizeBtn.addEventListener('click', toggleLeftPanel);
      }
    }, 100);

    // // Add tab switching event listener to fix aspect controls visibility
    // setTimeout(() => {
    //   const leftPanelElement = document.querySelector('[data-name="leftPanel"]');
    //   if (leftPanelElement) {
    //     const tabButtons = leftPanelElement.querySelectorAll('bim-tab');
    //     tabButtons.forEach((tab: any) => {
    //       tab.addEventListener('click', () => {
    //         setTimeout(() => {
    //           // Hide all aspect controls first
    //           const allAspectSections = leftPanelElement.querySelectorAll('bim-panel-section[label*="Aspect"], bim-panel-section[label*="aspect"]');
    //           allAspectSections.forEach((section: any) => {
    //             section.style.display = 'none';
    //           });

    //           // Only show aspect controls if settings tab is active
    //           const activeTab = leftPanelElement.querySelector('bim-tab[active]');
    //           if (activeTab && activeTab.getAttribute('name') === 'settings') {
    //             const settingsAspectSections = activeTab.querySelectorAll('bim-panel-section[label*="Aspect"], bim-panel-section[label*="aspect"]');
    //             settingsAspectSections.forEach((section: any) => {
    //               section.style.display = '';
    //             });
    //           }
    //         }, 10);
    //       });
    //     });

    //     // Initial setup - hide aspect controls if not on settings tab
    //     setTimeout(() => {
    //       const activeTab = leftPanelElement.querySelector('bim-tab[active]');
    //       if (!activeTab || activeTab.getAttribute('name') !== 'settings') {
    //         const allAspectSections = leftPanelElement.querySelectorAll('bim-panel-section[label*="Aspect"], bim-panel-section[label*="aspect"]');
    //         allAspectSections.forEach((section: any) => {
    //           section.style.display = 'none';
    //         });
    //       }
    //     }, 100);
    //   }
    // }, 500);



    gridApp.layouts = {
      main: {
        template: `
        "leftPanel viewport" 1fr
           /26rem 1fr
            `,
        elements: {
          leftPanel,
          viewport,
        },
      },
      minimized: {
        template: `
        "viewport" 1fr
           /1fr
            `,
        elements: {
          viewport,
        },
      },
    }

    gridApp.layout = "main";
    viewportGrid.layouts = {
      main: {
        template: `
        "empty" 1fr
        "toolbar" auto
          / 1fr
            `,
        elements: { toolbar },
      },
      second: {
        template: `
        "empty elementDataPanel" 1fr
        "toolbar elementDataPanel" auto
          / 1fr 24rem
            `,
        elements: {
          toolbar,
          elementDataPanel,
        },
      },
    };

    viewportGrid.layout = "main";
    updateLoadingText('Loading IFC model...');
    const model = await loadIfc(components);
    console.log('Model loaded:', model);
    if (model) {
      setModel(model);
      
      // Trigger initial light highlighting based on Loytec device state
      setTimeout(() => {
        const projectInfoPanel = document.querySelector('[data-panel="project"]');
        if (projectInfoPanel && (projectInfoPanel as any).triggerInitialHighlighting) {
          console.log('🔥 Triggering initial light highlighting after model load...');
          (projectInfoPanel as any).triggerInitialHighlighting();
        } else {
          // Fallback: Dispatch custom event
          window.dispatchEvent(new CustomEvent('modelLoadedForLighting'));
        }
      }, 500); // Small delay to ensure model is fully processed
    }

    // Debug: Check if fragments were added
    console.log('Fragments count:', fragments.list.size);
    console.log('Fragments list:', Array.from(fragments.list.keys()));

    // Position camera to see the model if it exists
    if (model && fragments.list.size > 0) {
      try {
        // IMPORTANT: Trigger NaviCube view change ONCE after model loads
        if (!this.hasTriggeredInitialView) {
          this.hasTriggeredInitialView = true;
          
          console.log('Model loaded - triggering NaviCube TOP view initialization...');
          
          // Wait a moment for all fragments to be fully processed
          setTimeout(() => {
            // Find and trigger NaviCube initialization to TOP view
            const naviCubeElement = document.getElementById('navi-cube');
            if (naviCubeElement && (naviCubeElement as any).triggerTopView) {
              console.log('Triggering NaviCube TOP view via exposed method');
              (naviCubeElement as any).triggerTopView();
            } else {
              // Fallback: Dispatch custom event for NaviCube to handle
              console.log('Dispatching modelLoaded event for NaviCube');
              window.dispatchEvent(new CustomEvent('modelLoaded', {
                detail: { 
                  modelBounds: {
                    fragments: fragments.list.size,
                    meshCount: world.meshes.size
                  }
                }
              }));
            }
          }, 300); // Small delay to ensure fragments are fully processed
        } else {
          console.log('Initial view already triggered - skipping NaviCube view change');
        }
      } catch (error) {
        console.error('Error triggering NaviCube view change:', error);
      }
    } else {
      console.warn('No model or fragments loaded - cannot trigger NaviCube view change');
    }

    // Speed controls are now handled by the SpeedControls component
    // Warning panels functionality has been replaced with speed controls

    // Hide the loading overlay now that everything is initialized
    hideLoadingOverlay(loadingOverlay);
  }
}

customElements.define("world-viewer", WorldViewer);