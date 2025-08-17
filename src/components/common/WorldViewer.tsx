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

    // Set initial camera position and rotation from user preference
    const defaultX = 0.18;
    const defaultY = 1.63;
    const defaultZ = -10.51;
    const defaultAzimuth = 178.8 * Math.PI / 180; // Convert 178.8° to radians
    const defaultPolar = 77.90 * Math.PI / 180; // Convert 77.90° to radians

    // Initialize the camera controls first
    world.camera.controls.setPosition(defaultX, defaultY, defaultZ);
    
    // Set angles after position
    world.camera.controls.azimuthAngle = defaultAzimuth;
    world.camera.controls.polarAngle = defaultPolar;
    
    // Set default zoom
    if (world.camera.controls.camera) {
      world.camera.controls.camera.zoom = 1.00;
      world.camera.controls.camera.updateProjectionMatrix();
    }

    // Force camera controls to update and render properly
    world.camera.controls.update(0);
    
    // Force a render update after setting camera position
    setTimeout(() => {
      world.camera.controls.update(0);
      if (world.renderer) {
        world.renderer.update();
      }
    }, 100);

    console.log('Initial camera position set:', world.camera.controls.getPosition(new THREE.Vector3()));
    console.log('Initial camera azimuth:', world.camera.controls.azimuthAngle * 180 / Math.PI, '°');
    console.log('Initial camera polar:', world.camera.controls.polarAngle * 180 / Math.PI, '°');

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
      document.body.appendChild(positionDisplay);
    }

    // Remove camera movement restrictions - allow full freedom
    // Previously locked polar angles are now removed for full 3D movement
    world.camera.controls.maxPolarAngle = Math.PI; // Allow full rotation up/down
    world.camera.controls.minPolarAngle = 0; // Allow full rotation up/down

    // Enhanced FPS-style controls with additional keys
    const moveSpeed = 0.1; // Speed of camera movement per frame
    const enableCollisionDetection = false; // Configurable collision detection (default: false)
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
      shift: false, // Fast movement
    };

    // Collision detection function
    const checkCollision = (newPosition: THREE.Vector3): boolean => {
      if (!enableCollisionDetection) return false;

      const raycaster = new THREE.Raycaster();
      const direction = new THREE.Vector3();
      const currentPos = world.camera.controls.getPosition(new THREE.Vector3());

      direction.subVectors(newPosition, currentPos).normalize();
      raycaster.set(currentPos, direction);

      const intersects = raycaster.intersectObjects(world.scene.three.children, true);
      return intersects.length > 0 && intersects[0].distance < 0.5; // 0.5m collision buffer
    };

    // Continuous movement update function with enhanced controls
    const updateMovement = () => {
      const currentSpeed = keys.shift ? moveSpeed * 3 : moveSpeed; // 3x speed with shift
      
      if (keys.arrowup || keys.arrowdown || keys.arrowleft || keys.arrowright || 
          keys.w || keys.a || keys.s || keys.d || keys.q || keys.e) {
        
        // Clear highlighter selection when camera moves via keyboard
        highlighter.clear("select");
        
        const currentPosition = world.camera.controls.getPosition(new THREE.Vector3());
        const newPosition = currentPosition.clone();
        const azimuth = world.camera.controls.azimuthAngle;

        // Forward/backward movement (Arrow keys and W/S)
        if (keys.arrowup || keys.w) {
          newPosition.x -= Math.sin(azimuth) * currentSpeed;
          newPosition.z -= Math.cos(azimuth) * currentSpeed;
        }
        if (keys.arrowdown || keys.s) {
          newPosition.x += Math.sin(azimuth) * currentSpeed;
          newPosition.z += Math.cos(azimuth) * currentSpeed;
        }

        // Left/right strafing (Arrow keys and A/D)
        if (keys.arrowleft || keys.a) {
          newPosition.x -= Math.cos(azimuth) * currentSpeed;
          newPosition.z += Math.sin(azimuth) * currentSpeed;
        }
        if (keys.arrowright || keys.d) {
          newPosition.x += Math.cos(azimuth) * currentSpeed;
          newPosition.z -= Math.sin(azimuth) * currentSpeed;
        }

        // Vertical movement (Q/E keys)
        if (keys.q) {
          newPosition.y += currentSpeed;
        }
        if (keys.e) {
          newPosition.y -= currentSpeed;
        }

        // Apply movement with optional collision check
        if (!checkCollision(newPosition)) {
          // No position restrictions - allow free movement
          world.camera.controls.setPosition(newPosition.x, newPosition.y, newPosition.z);
          
          // Allow normal zoom behavior
          if (world.camera.controls.camera) {
            // Don't force zoom reset - allow user to control zoom
          }
        }

        // Update position display with comprehensive camera information (only in debug mode)
        if (positionDisplay) {
          const pos = world.camera.controls.getPosition(new THREE.Vector3());
          const azimuthdisplay = world.camera.controls.azimuthAngle;
          const polardisplay = world.camera.controls.polarAngle;
          const zoom = world.camera.controls.camera ? world.camera.controls.camera.zoom : 1;
          
          positionDisplay.innerHTML = `
            <div style="font-weight: bold; color: #00ff00; margin-bottom: 5px;">Camera Controls</div>
            Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}<br>
            Azimuth: ${(azimuthdisplay * 180 / Math.PI).toFixed(1)}°<br>
            Polar: ${(polardisplay * 180 / Math.PI).toFixed(1)}°<br>
            Zoom: ${zoom.toFixed(2)}<br>
            Speed: ${keys.shift ? 'FAST' : 'Normal'}<br>
            <div style="font-size: 10px; color: #ccc; margin-top: 5px;">
              WASD/Arrows: Move | Q/E: Up/Down | Shift: Fast<br>
              Mouse: Look | Wheel: Zoom | 
          `;
        }
      }
      requestAnimationFrame(updateMovement);
    };
    updateMovement();

    // Continuous position display update for all camera changes (including mouse drag)
    const updatePositionDisplay = () => {
      if (positionDisplay) {
        const pos = world.camera.controls.getPosition(new THREE.Vector3());
        const azimuthdisplay = world.camera.controls.azimuthAngle;
        const polardisplay = world.camera.controls.polarAngle;
        const zoom = world.camera.controls.camera ? world.camera.controls.camera.zoom : 1;
        
        positionDisplay.innerHTML = `
          <div style="font-weight: bold; color: #00ff00; margin-bottom: 5px;">Camera Controls</div>
          Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}<br>
          Azimuth: ${(azimuthdisplay * 180 / Math.PI).toFixed(1)}°<br>
          Polar: ${(polardisplay * 180 / Math.PI).toFixed(1)}°<br>
          Zoom: ${zoom.toFixed(2)}<br>
          Speed: ${keys.shift ? 'FAST' : 'Normal'}<br>
          <div style="font-size: 10px; color: #ccc; margin-top: 5px;">
            WASD/Arrows: Move | Q/E: Up/Down | Shift: Fast<br>
            Mouse: Look | Wheel: Zoom |
          </div>
        `;
      }
      
      requestAnimationFrame(updatePositionDisplay);
    };
    if (isDebugMode) {
      updatePositionDisplay();
    }

    // Camera controls are now unrestricted - removed eye level enforcement

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

    // Enable normal mouse wheel zooming - remove movement restrictions
    // Note: Default wheel behavior is now handled by the camera controls

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
    world.camera.controls.restThreshold = 0.25;
    world.camera.controls.addEventListener("rest", () => {
      culler.needsUpdate = true;
      tilesLoader.cancel = true;
      tilesLoader.culler.needsUpdate = true;

      // Remove eye level enforcement - allow free camera positioning
    });

    // Add camera movement detection to clear selection when camera moves
    const lastCameraPosition = world.camera.controls.getPosition(new THREE.Vector3());
    let lastCameraAzimuth = world.camera.controls.azimuthAngle;
    let lastCameraPolar = world.camera.controls.polarAngle;
    
    // Check for camera movement changes and clear selection
    const checkCameraMovement = () => {
      const currentPosition = world.camera.controls.getPosition(new THREE.Vector3());
      const currentAzimuth = world.camera.controls.azimuthAngle;
      const currentPolar = world.camera.controls.polarAngle;
      
      const positionChanged = !lastCameraPosition.equals(currentPosition);
      const rotationChanged = Math.abs(lastCameraAzimuth - currentAzimuth) > 0.01 || 
                             Math.abs(lastCameraPolar - currentPolar) > 0.01;
      
      if (positionChanged || rotationChanged) {
        // highlighter.clear("select");
        lastCameraPosition.copy(currentPosition);
        lastCameraAzimuth = currentAzimuth;
        lastCameraPolar = currentPolar;
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
          console.log('Camera position before fit:', world.camera.controls.getPosition(new THREE.Vector3()));
          // Skip automatic camera fitting to maintain default position
          // world.camera.fit(world.meshes, 0.8);
          
          // Restore the desired default position instead
          const defaultX = 0.18;
          const defaultY = 1.63;
          const defaultZ = -10.51;
          const defaultAzimuth = 178.8 * Math.PI / 180;
          const defaultPolar = 77.90 * Math.PI / 180;
          
          world.camera.controls.setPosition(defaultX, defaultY, defaultZ);
          world.camera.controls.azimuthAngle = defaultAzimuth;
          world.camera.controls.polarAngle = defaultPolar;
          
          if (world.camera.controls.camera) {
            world.camera.controls.camera.zoom = 1.00;
            world.camera.controls.camera.updateProjectionMatrix();
          }
          
          // Force camera controls to update after restoration
          world.camera.controls.update(0);
          if (world.renderer) {
            world.renderer.update();
          }
          
          console.log('Camera position restored to default:', world.camera.controls.getPosition(new THREE.Vector3()));
        }, 50);
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