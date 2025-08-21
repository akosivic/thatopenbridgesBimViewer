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
import { AppManager } from "./components/bim-components";
import { loadIfc } from "./components/Toolbars/Sections/Import";

interface State {
  update: [];
}

const dataState: State = {
  update: [],
};
export class WorldViewer extends HTMLElement {
  constructor() {
    super();
  }

  public fragmentIdMap = function () {
    return new Map<string, Set<number>>();
  }
  async connectedCallback() {
    await this.initializeWorldViewer();
  }

  private async initializeWorldViewer() {
    // Show loading overlay immediately when app initializes
    const loadingOverlay = showLoadingOverlay('initializing');

    // Check if debug mode is enabled via URL parameter
    const isDebugMode = window.location.search.includes('debug');
    console.log('Debug mode detected:', isDebugMode, 'URL:', window.location.search);

    // FORCE create position display for testing (will always show now)
    const forceDebugDisplay = true;

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
    const defaultX = -1.29;
    const defaultY = 1.60; // Eye level height - LOCKED, never changes
    const defaultZ = 1.14;
    
    // Create pointer lock controls for first-person navigation
    let fpControls: PointerLockControls | null = null;
    
    // Set camera position directly in world coordinates (Y is locked to 1.6)
    world.camera.three.position.set(defaultX, defaultY, defaultZ);
    
    // Set camera to look slightly downward (more natural for walking)
    const lookDirection = new THREE.Vector3(0, -0.1, -1).normalize();
    world.camera.three.lookAt(
      world.camera.three.position.x + lookDirection.x,
      world.camera.three.position.y + lookDirection.y,
      world.camera.three.position.z + lookDirection.z
    );

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
    
    // Add press-and-hold functionality for FPS mode
    let isMousePressed = false;
    
    viewport.addEventListener('mousedown', (e) => {
      if (fpControls && e.button === 0) { // Left mouse button
        isMousePressed = true;
        fpControls.lock();
        console.log('Mouse pressed - FPS mode ACTIVATED');
      }
    });
    
    viewport.addEventListener('mouseup', (e) => {
      if (fpControls && e.button === 0) { // Left mouse button
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
    if (isDebugMode || forceDebugDisplay) {
      positionDisplay = document.createElement('div');
      positionDisplay.id = 'fps-position-display';
      positionDisplay.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0,0,0,0.9);
        color: #00ff00;
        padding: 15px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        border-radius: 8px;
        z-index: 9999;
        border: 2px solid #00ff00;
        box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
        min-width: 300px;
        pointer-events: none;
        max-height: 400px;
        overflow-y: auto;
      `;
      positionDisplay.innerHTML = `<div style="font-weight: bold; color: #00ff00;">🎮 FPS DEBUG MODE</div><div>Initializing...</div>`;
      document.body.appendChild(positionDisplay);
      console.log('Position display created and added to BOTTOM RIGHT');
      console.log('Position display element:', positionDisplay);
      console.log('Position display in DOM:', document.getElementById('fps-position-display'));
    } else {
      console.log('Debug mode is OFF - no position display created');
    }

    // FPS-style movement controls
    const moveSpeed = 5.0; // Units per second for FPS movement
    const sprintMultiplier = 2.0; // Sprint speed multiplier
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

      // Always update position display (debug mode) regardless of movement
      if (positionDisplay && (isDebugMode || forceDebugDisplay)) {
        const pos = world.camera.three.position;
        const rot = world.camera.three.rotation;
        const isLocked = fpControls.isLocked;
        
        try {
          positionDisplay.innerHTML = `
            <div style="font-weight: bold; color: #00ff00; margin-bottom: 8px; font-size: 16px;">🎮 FPS DEBUG MODE</div>
            <div style="font-weight: bold; color: ${isLocked ? '#00ff00' : '#ff8800'}; font-size: 14px; margin-bottom: 8px;">
              ${isLocked ? '🔒 MOUSE HELD - FPS ACTIVE' : '🔓 HOLD LEFT MOUSE TO ACTIVATE'}
            </div>
            <div style="margin-bottom: 4px;"><strong>Position:</strong></div>
            <div style="margin-left: 10px; margin-bottom: 8px;">
              X: ${pos.x.toFixed(3)}<br>
              Y: ${pos.y.toFixed(3)} <span style="color: #ff0000;">(LOCKED)</span><br>
              Z: ${pos.z.toFixed(3)}
            </div>
            <div style="margin-bottom: 4px;"><strong>Rotation:</strong></div>
            <div style="margin-left: 10px; margin-bottom: 8px;">
              Azimuth: ${(rot.y * 180 / Math.PI).toFixed(1)}°<br>
              Polar: ${(90 - rot.x * 180 / Math.PI).toFixed(1)}°
            </div>
            <div style="margin-bottom: 8px;"><strong>Speed:</strong> ${keys.shift ? 'FAST' : 'NORMAL'}</div>
            <div style="font-size: 11px; color: #ccc; border-top: 1px solid #333; padding-top: 8px;">
              <strong>Controls:</strong><br>
              WASD/Arrows: Move | <span style="color: #ff0000;">Y-Height: LOCKED to 1.6m</span> | Shift: Sprint<br>
              <span style="color: #00ff00;">HOLD Left Mouse: Activate FPS Look</span> | Release: Deactivate
            </div>
          `;
          
          // Make sure it's visible
          positionDisplay.style.display = 'block';
          positionDisplay.style.visibility = 'visible';
          
        } catch (error) {
          console.error('Error updating position display:', error);
        }
        } else if (isDebugMode || forceDebugDisplay) {
          console.warn('Position display not available, positionDisplay:', positionDisplay);
        }      if (keys.arrowup || keys.arrowdown || keys.arrowleft || keys.arrowright || 
          keys.w || keys.a || keys.s || keys.d || keys.q || keys.e) {
        
        // Clear highlighter selection when camera moves
        highlighter.clear("select");
        
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

        // Vertical movement (Q/E keys) - DISABLED, Y locked to eye level
        // if (keys.q) {
        //   world.camera.three.position.y += moveDistance;
        // }
        // if (keys.e) {
        //   world.camera.three.position.y -= moveDistance;
        // }
        
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
    if ((isDebugMode || forceDebugDisplay) && positionDisplay) {
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
    } else if (isDebugMode || forceDebugDisplay) {
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

    // Enable normal mouse wheel zooming for camera
    viewport.addEventListener('wheel', (event: WheelEvent) => {
      if (!fpControls || !fpControls.isLocked) return;
      
      console.log('=== MOUSEWHEEL EVENT (FPS Mode) ===');
      console.log('Delta:', event.deltaY);
      
      // In FPS mode, wheel can adjust movement speed or other features if needed
      
      console.log('FPS wheel event processed');
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
    
    // Note: Original orbit controls are disabled, using FPS controls instead
    // world.camera.controls.restThreshold = 0.25;
    // world.camera.controls.addEventListener("rest", () => {
    //   culler.needsUpdate = true;
    //   tilesLoader.cancel = true;
    //   tilesLoader.culler.needsUpdate = true;
    //   // Remove eye level enforcement - allow free camera positioning
    // });
    
    // For FPS mode, we'll handle culling updates differently
    // The culler will update based on FPS camera movement instead

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
        // highlighter.clear("select");
        lastCameraPosition.copy(currentPosition);
      }
      
      requestAnimationFrame(checkCameraMovement);
    };
    checkCameraMovement();

    fragments.onFragmentsLoaded.add(async (model) => {
      if (model.hasProperties) {
        await indexer.process(model);
        classifier.byEntity(model);
      }

      if (!model.isStreamed) {
        for (const fragment of model.items) {
          world.meshes.add(fragment.mesh);
          culler.add(fragment.mesh);
        }
      }

      world.scene.three.add(model);

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
          
          if (world.renderer) {
            world.renderer.update();
          }
          
          console.log('FPS Camera Position:', world.camera.three.position);
          console.log('FPS Camera Rotation:', world.camera.three.rotation);
        }, 200);
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
              ${camera(world, highlighter)} ${selection(components, world)}
            </bim-toolbar>
          </bim-tab>
          <bim-tab label="Measurement">
            <bim-toolbar> ${measurement(world, components)} </bim-toolbar>
          </bim-tab>
        </bim-tabs>
      `;
      }
      else {
        return html`
        <bim-tabs floating style="justify-self: center; border-radius: 0.5rem;padding:30px">
          <bim-tab label="${i18n.t('options')}">
            <bim-toolbar>
              ${camera(world, highlighter)} 
            </bim-toolbar>
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
      if (isDebugMode) {
        return html`
        <bim-tabs switchers-full>
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
      `;
      }
      else {
        return html` <bim-tabs switchers-full>
          <bim-tab name="project" label="${i18n.t('project')}" icon="ph:building-fill">
            ${projectInformationPanel}
          </bim-tab>
          <bim-tab name="settings" label="${i18n.t('settings')}" icon="solar:settings-bold">
            ${settings(components, isDebugMode)}
          </bim-tab>
        </bim-tabs>
        `
      }
    }, dataState);

    const app = document.getElementsByTagName("world-viewer")[0];
    const grid = document.createElement("bim-grid") as Grid;
    app.classList.add("world-viewer");
    grid.id = "app";
    app.appendChild(grid);

    const gridApp = grid as Grid;

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
    setModel(model);

    // Debug: Check if fragments were added
    console.log('Fragments count:', fragments.list.size);
    console.log('Fragments list:', Array.from(fragments.list.keys()));

    // Position camera to see the model if it exists
    if (model && fragments.list.size > 0) {
      try {
        // Get the first fragment and its bounding box
        const firstFragment = Array.from(fragments.list.values())[0];
        if (firstFragment && firstFragment.mesh) {
          console.log('First fragment mesh:', firstFragment.mesh);
          
          // Make sure the fragment mesh is added to the scene
          if (!world.scene.three.children.includes(firstFragment.mesh)) {
            world.scene.three.add(firstFragment.mesh);
            console.log('Fragment mesh added to scene');
          } else {
            console.log('Fragment mesh already in scene');
          }
          
          // Make sure the mesh is visible
          firstFragment.mesh.visible = true;
          console.log('Fragment mesh visibility:', firstFragment.mesh.visible);
          
          // Calculate bounding box
          const box = new THREE.Box3().setFromObject(firstFragment.mesh);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          console.log('Model bounding box center:', center);
          console.log('Model bounding box size:', size);
          
          // Position camera to look at the model center from a distance
          const maxDim = Math.max(size.x, size.y, size.z);
          const distance = maxDim * 1.5;
          
          const cameraPosition = new THREE.Vector3(
            center.x + distance,
            1.6, // FORCE Y to eye level - never change this
            center.z + distance
          );
          
          world.camera.controls.setLookAt(
            cameraPosition.x, 1.6, cameraPosition.z, // Y always 1.6
            center.x, center.y, center.z,
            true
          );
          
          console.log('Camera positioned at:', cameraPosition, 'looking at:', center);
          
          // Debug scene contents
          console.log('Scene children count:', world.scene.three.children.length);
          console.log('Scene children:', world.scene.three.children);
          console.log('Fragment mesh material:', firstFragment.mesh.material);
          console.log('Fragment mesh geometry:', firstFragment.mesh.geometry);
        }
      } catch (error) {
        console.error('Error positioning camera:', error);
      }
    } else {
      console.warn('No model or fragments loaded');
    }

    // Hide the loading overlay now that everything is initialized
    hideLoadingOverlay(loadingOverlay);
  }
}

customElements.define("world-viewer", WorldViewer);