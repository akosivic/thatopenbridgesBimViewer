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
    const isDebugMode = window.location.search.includes('?debug') ||
      window.location.search.includes('&debug');

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
    // Set initial camera position at eye level (1.6m height)
    const defaultX = -1.29;
    const defaultY = 1.60; // Eye level height
    const defaultZ = 1.14;
    
    // Create pointer lock controls for first-person navigation
    let fpControls: PointerLockControls | null = null;
    
    // Set camera position directly in world coordinates
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
    (world.camera as any).fpControls = fpControls;
    
    // Add click-to-lock functionality
    viewport.addEventListener('click', () => {
      if (fpControls && !fpControls.isLocked) {
        fpControls.lock();
      }
    });
    
    // Handle pointer lock events
    fpControls.addEventListener('lock', () => {
      console.log('First-person controls locked - use mouse to look around');
    });
    
    fpControls.addEventListener('unlock', () => {
      console.log('First-person controls unlocked - click to re-enter first-person mode');
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
      positionDisplay.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        border-radius: 4px;
        z-index: 1000;
      `;
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
      if (!fpControls || !fpControls.isLocked) {
        requestAnimationFrame(updateFPSMovement);
        return;
      }

      const currentSpeed = keys.shift ? moveSpeed * sprintMultiplier : moveSpeed;
      const deltaTime = 0.016; // Approximate 60 FPS
      const moveDistance = currentSpeed * deltaTime;

      if (keys.arrowup || keys.arrowdown || keys.arrowleft || keys.arrowright || 
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

        // Vertical movement (Q/E keys)
        if (keys.q) {
          world.camera.three.position.y += moveDistance;
        }
        if (keys.e) {
          world.camera.three.position.y -= moveDistance;
        }

        // Update position display (debug mode)
        if (positionDisplay) {
          const pos = world.camera.three.position;
          const rot = world.camera.three.rotation;
          const isLocked = fpControls.isLocked;
          
          positionDisplay.innerHTML = `
            <div style="font-weight: bold; color: #00ff00; margin-bottom: 5px;">Camera Controls 2</div>
            <div style="font-weight: bold; color: ${isLocked ? '#00ff00' : '#ff8800'}; font-size: 14px; margin-bottom: 5px;">
              ${isLocked ? '🔒 FPS MODE ACTIVE' : '🔓 FPS MODE INACTIVE'}
            </div>
            Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}<br>
            Azimuth: ${(rot.y * 180 / Math.PI).toFixed(1)}°<br>
            Polar: ${(90 - rot.x * 180 / Math.PI).toFixed(1)}°<br>
            Zoom: ${world.camera.controls?.camera?.zoom?.toFixed(2) || '1.00'}<br>
            Speed: ${keys.shift ? 'Fast' : 'Normal'}<br>
            <div style="font-size: 10px; color: #ccc; margin-top: 5px;">
              WASD/Arrows: Move | Q/E: Up/Down | Shift: Fast<br>
              Mouse: Look | Wheel: Zoom |
            </div>
          `;
        }
      }
      
      requestAnimationFrame(updateFPSMovement);
    };
    updateFPSMovement();

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

    const ifcLoader = components.get(IfcLoader);
    updateLoadingText('settingUpIfcLoader');
    await ifcLoader.setup();

    const tilesLoader = components.get(IfcStreamer);
    tilesLoader.world = world;
    tilesLoader.culler.threshold = 10;
    tilesLoader.culler.maxHiddenTime = 1000;
    tilesLoader.culler.maxLostTime = 40000;

    const highlighter = components.get(Highlighter);
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
          console.log('Model loaded - FPS camera already initialized');
          
          // FPS camera is already set up - no need for automatic fitting
          // The camera will be controlled by the user via FPS controls
          
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
    setModel(model);

    // Hide the loading overlay now that everything is initialized
    hideLoadingOverlay(loadingOverlay);
  }
}

customElements.define("world-viewer", WorldViewer);