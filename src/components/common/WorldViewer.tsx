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
import camera from "./components/Toolbars/Sections/Camera";
import measurement from "./components/Toolbars/Sections/Measurement";
import selection from "./components/Toolbars/Sections/Selection";
import speedControls, { setBaseSpeed } from "./components/Toolbars/Sections/SpeedControls";
import { AppManager } from "./components/bim-components";
import { loadIfc } from "./components/Toolbars/Sections/Import";
import { setGlobalCamera } from "./components/Panels/ProjectInformation";

interface State {
  update: [];
  leftPanelMinimized: boolean;
}

const dataState: State = {
  update: [],
  leftPanelMinimized: false,
};
export class WorldViewer extends HTMLElement {
  constructor() {
    super();
  }

  public fragmentIdMap = function () {
    return new Map<string, Set<number>>();
  }
  async connectedCallback() {
    try {
      // Initialize WASM modules first
      console.log('Pre-loading WebAssembly modules...');

      // Pre-initialize web-ifc WASM module
      try {
        await import('web-ifc');
        console.log('web-ifc WASM module loaded successfully');
      } catch (wasmError) {
        console.warn('Failed to pre-load web-ifc WASM module:', wasmError);
        // Continue with initialization even if pre-loading fails
      }

      await this.initializeWorldViewer();
    } catch (error) {
      console.error('Failed to initialize WorldViewer:', error);
    }
  }

  private async initializeWorldViewer() {
    // Show loading overlay immediately when app initializes
    const loadingOverlay = showLoadingOverlay('initializing');

    // Check if debug mode is enabled via URL parameter
    const isDebugMode = window.location.search.toLowerCase().includes('debug');
    console.log('Debug mode detected:', isDebugMode, 'URL:', window.location.search);

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

    world.camera = new OrthoPerspectiveCamera(components);

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

    // Set global camera reference for ProjectInformation zoom functionality
    setGlobalCamera(world.camera.three);

    // Initialize pointer lock controls
    fpControls = new PointerLockControls(world.camera.three, viewport);

    // Store FPS controls reference for Camera.ts
    const { setFPControls } = await import('./components/Toolbars/Sections/Camera');
    setFPControls(fpControls);

    // DISABLE the original orbit controls to prevent conflicts
    if (world.camera.controls) {
      world.camera.controls.enabled = false;
      console.log('Original orbit controls disabled');
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
      // Check for toolbar/tab/button classes
      return !!target.closest('.bim-tabs, .bim-tab, .bim-toolbar, .bim-toolbar-btn, .bim-toolbar-button, .screenshot-btn');
    }

    viewport.addEventListener('mousedown', (e) => {
      if (isToolbarButton(e.target)) return;
      if (fpControls && e.button === 0) {
        isMousePressed = true;
        fpControls.lock();
        console.log('Mouse pressed - FPS mode ACTIVATED');
      }
    });

    viewport.addEventListener('mouseup', (e) => {
      if (isToolbarButton(e.target)) return;
      if (fpControls && e.button === 0) {
        isMousePressed = false;
        fpControls.unlock();
        console.log('Mouse released - FPS mode DEACTIVATED');
      }
    });

    // Also handle mouse leave to deactivate FPS if mouse leaves the viewport
    viewport.addEventListener('mouseleave', () => {
      if (fpControls && isMousePressed) {
        isMousePressed = false;
        fpControls.unlock();
        console.log('Mouse left viewport - FPS mode DEACTIVATED');
      }
    });

    // Handle pointer lock events
    fpControls.addEventListener('lock', () => {
      console.log('First-person controls locked - mouse look active');
    });

    fpControls.addEventListener('unlock', () => {
      console.log('First-person controls unlocked - mouse look inactive');
    });

    // Set default camera properties
    if (world.camera.controls && world.camera.controls.camera) {
      world.camera.controls.camera.zoom = 1.00;
      world.camera.controls.camera.updateProjectionMatrix();
    }

    console.log('First-person camera initialized at position:', world.camera.three.position);

    // Create camera position display only in debug mode
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
      console.log('Position display created and added to BOTTOM RIGHT');
    }

    // FPS-style movement controls
    let moveSpeed = 5.0; // Units per second for FPS movement (now variable)
    const sprintMultiplier = 2.0; // Sprint speed multiplier
    
    // Set up speed control integration
    setBaseSpeed(moveSpeed);
    
    // Listen for speed change events from SpeedControls
    window.addEventListener('moveSpeedChange', (event: any) => {
      const { effectiveSpeed } = event.detail;
      moveSpeed = effectiveSpeed;
      console.log(`WorldViewer moveSpeed updated to: ${moveSpeed}`);
    });
    
    const keys: Record<string, boolean> = {
      // Arrow keys
      arrowup: false,
      arrowdown: false,
      arrowleft: false,
      arrowright: false,
      // WASD keys
      w: false,
      a: false,
      s: false,
      d: false,
      // Vertical movement
      q: false, // Up
      e: false, // Down
      // Speed modifier
      shift: false, // Sprint
    };

    // Movement vectors for FPS navigation
    const direction = new THREE.Vector3();
    const sideways = new THREE.Vector3();
    const upVector = new THREE.Vector3(0, 1, 0);

    // FPS movement update function
    const updateFPSMovement = () => {
      if (!fpControls) {
        requestAnimationFrame(updateFPSMovement);
        return;
      }

      const currentSpeed = keys.shift ? moveSpeed * sprintMultiplier : moveSpeed;
      const deltaTime = 0.016; // Approximate 60 FPS
      const moveDistance = currentSpeed * deltaTime;

      // Always update position display in debug mode
      if (isDebugMode && positionDisplay) {
        const pos = world.camera.three.position;
        const rot = world.camera.three.rotation;
        const isLocked = fpControls.isLocked;

        try {
          positionDisplay.innerHTML = `
            <div style="font-weight: bold; color: #00ff00; margin-bottom: 4px; font-size: 12px;">🎮 DEBUG</div>
            <div style="font-weight: bold; color: ${isLocked ? '#00ff00' : '#ff8800'}; font-size: 11px; margin-bottom: 4px;">
              ${isLocked ? '🔒 FPS ON' : '🔓 HOLD MOUSE'}
            </div>
            <div style="margin-bottom: 2px;"><strong>Pos:</strong></div>
            <div style="margin-left: 8px; margin-bottom: 4px; font-size: 10px;">
              X: ${pos.x.toFixed(2)}<br>
              Y: ${pos.y.toFixed(2)} <span style="color: #ff0000;">(LOCKED)</span><br>
              Z: ${pos.z.toFixed(2)}
            </div>
            <div style="margin-bottom: 2px;"><strong>Rot:</strong></div>
            <div style="margin-left: 8px; margin-bottom: 4px; font-size: 10px;">
              H: ${(rot.y * 180 / Math.PI).toFixed(1)}°<br>
              V: ${(90 - rot.x * 180 / Math.PI).toFixed(1)}°
            </div>
            <div style="margin-bottom: 4px; font-size: 10px;"><strong>Speed:</strong> ${keys.shift ? 'FAST' : 'NORM'}</div>
            <div style="font-size: 9px; color: #ccc; border-top: 1px solid #333; padding-top: 4px;">
              WASD: Move | Shift: Sprint<br>
              <span style="color: #00ff00;">Hold Mouse: Look</span>
            </div>
          `;

          // Make sure it's visible
          positionDisplay.style.display = 'block';
          positionDisplay.style.visibility = 'visible';

        } catch (error) {
          console.error('Error updating position display:', error);
        }
      }

      if (keys.arrowup || keys.arrowdown || keys.arrowleft || keys.arrowright ||
        keys.w || keys.a || keys.s || keys.d || keys.q || keys.e) {

        // Get camera's current orientation
        world.camera.three.getWorldDirection(direction);
        sideways.crossVectors(direction, upVector).normalize();

        // Forward/backward movement (W/S or Arrow Up/Down)
        if (keys.arrowup || keys.w) {
          world.camera.three.position.addScaledVector(direction, moveDistance);
        }
        if (keys.arrowdown || keys.s) {
          world.camera.three.position.addScaledVector(direction, -moveDistance);
        }

        // Left/right strafing (A/D or Arrow Left/Right)
        if (keys.arrowleft || keys.a) {
          world.camera.three.position.addScaledVector(sideways, -moveDistance);
        }
        if (keys.arrowright || keys.d) {
          world.camera.three.position.addScaledVector(sideways, moveDistance);
        }

        // FORCE Y position to always be at eye level (1.6 meters)
        world.camera.three.position.y = 1.6;
      }

      // SAFETY: Always enforce Y position to be at eye level, regardless of any other operations
      world.camera.three.position.y = 1.6;

      requestAnimationFrame(updateFPSMovement);
    };
    // Start the FPS movement update loop
    updateFPSMovement();

    // Ensure position display is visible after a short delay (debug mode)
    if (isDebugMode && positionDisplay) {
      setTimeout(() => {
        const displayElement = document.getElementById('fps-position-display');
        if (displayElement) {
          displayElement.style.display = 'block';
          displayElement.style.visibility = 'visible';
          console.log('Position display forced visible in BOTTOM RIGHT after delay');
        } else {
          console.error('Position display element not found in DOM after delay');
        }
      }, 1000);
    } else if (isDebugMode) {
      console.log('Debug mode is on but positionDisplay is null');
    }

    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key in keys) {
        keys[key] = true;
        e.preventDefault(); // Prevent default browser behavior for these keys
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key in keys) {
        keys[key] = false;
        e.preventDefault(); // Prevent default browser behavior for these keys
      }
    });

    // Enable scroll wheel movement: scroll up = forward, scroll down = backward
    viewport.addEventListener('wheel', (event: WheelEvent) => {
      if (!fpControls) return;

      event.preventDefault(); // Prevent default scroll behavior

      console.log('=== MOUSEWHEEL MOVEMENT ===');
      console.log('Delta:', event.deltaY);

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
        console.log('Scroll down: Moving BACKWARD');
      }

      // FORCE Y position to always be at eye level (1.6 meters)
      world.camera.three.position.y = 1.6;

      console.log('New position:', world.camera.three.position);
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
          world.meshes.add(fragment.mesh);
          culler.add(fragment.mesh);

          // Ensure fragment mesh is visible and has proper material
          if (fragment.mesh) {
            fragment.mesh.visible = true;
            fragment.mesh.castShadow = true;
            fragment.mesh.receiveShadow = true;

            // Force material update
            if (fragment.mesh.material) {
              if (Array.isArray(fragment.mesh.material)) {
                fragment.mesh.material.forEach(mat => {
                  if (mat && 'needsUpdate' in mat) {
                    (mat as THREE.Material).needsUpdate = true;
                  }
                });
              } else if ('needsUpdate' in fragment.mesh.material) {
                (fragment.mesh.material as THREE.Material).needsUpdate = true;
              }
            }

            fragmentCount++;
          }
        }
        console.log(`Added ${fragmentCount} fragments to scene`);
      }

      // Add model to scene
      world.scene.three.add(model);
      console.log('Model added to Three.js scene');

      // Force renderer update
      if (world.renderer) {
        world.renderer.update();
        console.log('Renderer updated');
      }

      if (!model.isStreamed) {
        setTimeout(async () => {
          console.log('Model loaded - positioning FPS camera to view model');

          // Get the model's bounding box to position camera appropriately
          const bbox = new THREE.Box3();
          world.meshes.forEach(mesh => {
            bbox.expandByObject(mesh);
          });

          if (!bbox.isEmpty()) {
            const center = bbox.getCenter(new THREE.Vector3());
            const size = bbox.getSize(new THREE.Vector3());

            console.log('Model center:', center);
            console.log('Model size:', size);

            // Position FPS camera to look at the model center
            // Keep Y locked to 1.6m (eye level), only orient the look direction
            world.camera.three.position.y = 1.6; // FORCE eye level before lookAt
            world.camera.three.lookAt(center);

            console.log('FPS camera oriented toward model center');
          }

          // Force another renderer update
          if (world.renderer) {
            world.renderer.update();
          }

          console.log('FPS Camera Position:', world.camera.three.position);
          console.log('FPS Camera Rotation:', world.camera.three.rotation);

          // Log scene statistics
          console.log('=== SCENE STATISTICS ===');
          console.log('Total scene children:', world.scene.three.children.length);
          console.log('Total meshes in world.meshes:', world.meshes.size);
          console.log('Visible meshes:', Array.from(world.meshes).filter(mesh => mesh.visible).length);
          console.log('========================');

        }, 500); // Increased delay to ensure everything is loaded
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
        <bim-tabs floating style="justify-self: center; border-radius: 0.5rem;padding:30px">
          <bim-tab label="Import">
            <bim-toolbar>${load(components)}</bim-toolbar>
          </bim-tab>
          <bim-tab label="Selection">
            <bim-toolbar>
              ${camera(world)} ${selection(components, world)}
            </bim-toolbar>
          </bim-tab>
          <bim-tab label="Measurement">
            <bim-toolbar> ${measurement(world, components)} </bim-toolbar>
          </bim-tab>
          <bim-tab label="Speed">
            <bim-toolbar> ${speedControls()} </bim-toolbar>
          </bim-tab>
        </bim-tabs>
      `;
      }
      else {
        return html`
        <bim-tabs floating style="justify-self: center; border-radius: 0.5rem;padding:30px">
          <bim-tab label="Speed">
            <bim-toolbar> ${speedControls()} </bim-toolbar>
          </bim-tab>
        </bim-tabs>
      `;
      }
    }, dataState);

    // Create a function to update the panel when language changes
    const updatePanelOnLanguageChange = () => {
      updateLeftPanel();
      updateToolbar();
    };

    // Add language change listener
    i18n.on('languageChanged', updatePanelOnLanguageChange);

    const [leftPanel, updateLeftPanel] = Component.create<HTMLElement, State>((state) => {
      console.log('Updating left panel with state:', state);
      
      const createExpandButton = () => {
        console.log('Creating expand button...');
        
        // Remove any existing expand button first
        const existingButton = document.querySelector('.bim-expand-button');
        if (existingButton) {
          console.log('Removing existing expand button');
          existingButton.remove();
        }
        
        // Create the expand button and append to body
        const expandButton = document.createElement('div');
        expandButton.className = 'bim-expand-button';
        expandButton.style.position = 'fixed';
        expandButton.style.top = '80px';
        expandButton.style.left = '10px';
        expandButton.style.zIndex = '10000';
        expandButton.style.background = 'rgba(0,0,0,0.8)';
        expandButton.style.padding = '8px';
        expandButton.style.borderRadius = '8px';
        expandButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        expandButton.style.cursor = 'pointer';
        expandButton.style.color = 'white';
        expandButton.style.fontSize = '16px';
        expandButton.style.width = '44px';
        expandButton.style.height = '44px';
        expandButton.style.display = 'flex';
        expandButton.style.alignItems = 'center';
        expandButton.style.justifyContent = 'center';
        expandButton.style.textAlign = 'center';
        expandButton.style.lineHeight = '2';
        expandButton.style.fontFamily = 'monospace';
        expandButton.innerHTML = '☰';
        expandButton.title = 'Expand Panel';
        
        expandButton.addEventListener('click', () => {
          toggleLeftPanel();
        });
        
        document.body.appendChild(expandButton);
      };
      
      const removeExpandButton = () => {
        const existingButton = document.querySelector('.bim-expand-button');
        if (existingButton) {
          existingButton.remove();
        }
      };

      const toggleLeftPanel = () => {
        dataState.leftPanelMinimized = !dataState.leftPanelMinimized;
        
        // Handle expand button creation/removal immediately
        if (dataState.leftPanelMinimized) {
          // Panel is being minimized - create expand button
          setTimeout(createExpandButton, 100);
        } else {
          // Panel is being expanded - remove expand button
          removeExpandButton();
        }
        
        updateLeftPanel();
        
        // Update the layout using CSS classes
        const gridApp = (window as any).bimGridApp as Grid;
        if (gridApp) {
          console.log('Grid app found, updating layout with CSS classes...');
          
          if (dataState.leftPanelMinimized) {
            console.log('Minimizing left panel');
            gridApp.classList.add('left-panel-minimized');
          } else {
            console.log('Expanding left panel');
            gridApp.classList.remove('left-panel-minimized');
          }
          
          // Force viewport and camera resize after layout change
          setTimeout(() => {
            console.log('Triggering resize after layout change...');
            
            // Use the existing resizeWorld function
            resizeWorld();
            
            // Also dispatch a resize event to the viewport to trigger any other listeners
            const resizeEvent = new Event('resize');
            viewport.dispatchEvent(resizeEvent);
            
            // Trigger window resize event as well to catch any global handlers
            window.dispatchEvent(new Event('resize'));
            
            console.log('Resize triggered after layout change');
            
          }, 150); // Small delay to let CSS transition complete
          
          console.log('Grid layout updated, minimized:', dataState.leftPanelMinimized);
          console.log('Grid classes:', gridApp.className);
        } else {
          console.error('Grid app reference not found');
        }
      };
      
      if (state.leftPanelMinimized) {
        console.log('Panel is minimized, returning empty div');
        // Return empty content for the left panel area - expand button is handled by toggleLeftPanel
        return html`<div style="display: none;"></div>`;
      }
      
      // Full panel with minimize button
      const minimizeButton = html`
        <div style="display: flex; justify-content: flex-end; padding: 6px; background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(0,0,0,0.1);">
          <bim-button 
            @click=${toggleLeftPanel}
            icon="material-symbols:chevron-left"
            tooltip-title="Minimize Panel"
            style="width: 24px; height: 24px;">
          </bim-button>
        </div>
      `;
      
      if (isDebugMode) {
        return html`
          <div style="height: 100%; display: flex; flex-direction: column;">
            ${minimizeButton}
            <bim-tabs switchers-full style="flex: 1;">
              <bim-tab name="project" label="${i18n.t('project')}" icon="ph:building-fill">
                ${projectInformationPanel}
              </bim-tab>
              <bim-tab name="settings" label="${i18n.t('settings')}" icon="solar:settings-bold">
                ${settings(components, isDebugMode)}
              </bim-tab>
              <bim-tab name="help" label="${i18n.t('help')}" icon="material-symbols:help">
                ${help}
              </bim-tab>
            </bim-tabs>
          </div>
        `;
      }
      else {
        return html`
          <div style="height: 100%; display: flex; flex-direction: column;">
            ${minimizeButton}
            <bim-tabs switchers-full style="flex: 1;">
              <bim-tab name="project" label="${i18n.t('project')}" icon="ph:building-fill">
                ${projectInformationPanel}
              </bim-tab>
              <bim-tab name="settings" label="${i18n.t('settings')}" icon="solar:settings-bold">
                ${settings(components, isDebugMode)}
              </bim-tab>
            </bim-tabs>
          </div>
        `;
      }
    }, dataState);

    const app = document.getElementsByTagName("world-viewer")[0];
    const grid = document.createElement("bim-grid") as Grid;
    app.classList.add("world-viewer");
    grid.id = "app";
    app.appendChild(grid);

    const gridApp = grid as Grid;
    
    // Store grid reference globally for the toggle function
    (window as any).bimGridApp = gridApp;

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
    }

    // Debug: Check if fragments were added
    console.log('Fragments count:', fragments.list.size);
    console.log('Fragments list:', Array.from(fragments.list.keys()));

    // Position camera to see the model if it exists
    if (model && fragments.list.size > 0) {
      try {
        // Get the first fragment and its bounding box
        const firstFragment = Array.from(fragments.list.values())[0];
        if (firstFragment && firstFragment.mesh) {
          // Enforce initial orientation after bounding box positioning
          world.camera.three.rotation.y = -3.7 * Math.PI / 180;
          world.camera.three.rotation.x = -1.6 * Math.PI / 180;
          world.camera.three.rotation.z = 0;
          world.camera.three.updateMatrixWorld();
        }
      } catch (error) {
        console.error('Error positioning camera:', error);
      }
    } else {
      console.warn('No model or fragments loaded');
    }

    // Speed controls are now handled by the SpeedControls component
    // Warning panels functionality has been replaced with speed controls

    // Hide the loading overlay now that everything is initialized
    hideLoadingOverlay(loadingOverlay);
  }
}

customElements.define("world-viewer", WorldViewer);