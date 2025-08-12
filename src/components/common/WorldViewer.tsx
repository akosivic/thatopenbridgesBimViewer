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

    // Define model bounds and cardinal direction positions
    const eyeLevel = 1.6; // Eye level at 1600mm (1.6m)
    const modelCenterX = 5.5; // Approximate model center X
    const modelCenterZ = -2.0; // Approximate model center Z
    const viewDistance = 15.0; // Distance from model center (bigger than model)

    // Cardinal direction viewpoints around the model
    interface ViewPoint {
      name: string;
      x: number;
      z: number;
      lookAtX: number;
      lookAtZ: number;
      direction: string;
    }

    const cardinalPositions: ViewPoint[] = [
      {
        name: "North",
        x: modelCenterX,
        z: modelCenterZ + viewDistance, // North is positive Z
        lookAtX: modelCenterX,
        lookAtZ: modelCenterZ,
        direction: "south" // Looking south towards model
      },
      {
        name: "South",
        x: modelCenterX,
        z: modelCenterZ - viewDistance, // South is negative Z
        lookAtX: modelCenterX,
        lookAtZ: modelCenterZ,
        direction: "north" // Looking north towards model
      },
      {
        name: "East",
        x: modelCenterX + viewDistance, // East is positive X
        z: modelCenterZ,
        lookAtX: modelCenterX,
        lookAtZ: modelCenterZ,
        direction: "west" // Looking west towards model
      },
      {
        name: "West",
        x: modelCenterX - viewDistance, // West is negative X
        z: modelCenterZ,
        lookAtX: modelCenterX,
        lookAtZ: modelCenterZ,
        direction: "east" // Looking east towards model
      }
    ];

    // Set initial camera position to North viewpoint (looking south at model)
    const initialPosition = cardinalPositions[0]; // North position
    world.camera.controls.setPosition(initialPosition.x, eyeLevel, initialPosition.z);
    world.camera.controls.lookInDirectionOf(initialPosition.lookAtX, eyeLevel, initialPosition.lookAtZ, true);
    world.camera.controls.polarAngle = Math.PI / 2; // Set polar angle to horizontal view

    console.log('Initial camera position set to North viewpoint:', world.camera.controls.getPosition(new THREE.Vector3()));

    // Function to find nearest cardinal position
    const findNearestCardinalPosition = (currentX: number, currentZ: number): ViewPoint => {
      let nearestPosition = cardinalPositions[0];
      let minDistance = Number.MAX_VALUE;

      for (const position of cardinalPositions) {
        const dx = currentX - position.x;
        const dz = currentZ - position.z;
        const distance = dx * dx + dz * dz; // Squared distance for performance

        if (distance < minDistance) {
          minDistance = distance;
          nearestPosition = position;
        }
      }

      return nearestPosition;
    };

    // Function to smoothly move camera to cardinal position
    const moveToCardinalPosition = (targetPosition: ViewPoint, smooth: boolean = true) => {
      if (smooth) {
        // Smooth transition to target position
        const currentPos = world.camera.controls.getPosition(new THREE.Vector3());
        const steps = 30; // Number of animation steps
        let step = 0;

        const animate = () => {
          step++;
          const progress = step / steps;
          const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic

          const x = currentPos.x + (targetPosition.x - currentPos.x) * easeProgress;
          const z = currentPos.z + (targetPosition.z - currentPos.z) * easeProgress;

          world.camera.controls.setPosition(x, eyeLevel, z);
          world.camera.controls.lookInDirectionOf(targetPosition.lookAtX, eyeLevel, targetPosition.lookAtZ, true);

          if (step < steps) {
            requestAnimationFrame(animate);
          }
        };
        animate();
      } else {
        // Instant movement
        world.camera.controls.setPosition(targetPosition.x, eyeLevel, targetPosition.z);
        world.camera.controls.lookInDirectionOf(targetPosition.lookAtX, eyeLevel, targetPosition.lookAtZ, true);
      }
    };

    // Create camera position display
    const positionDisplay = document.createElement('div');
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

    // Lock vertical movement completely
    world.camera.controls.maxPolarAngle = Math.PI / 2; // Lock to horizontal view
    world.camera.controls.minPolarAngle = Math.PI / 2; // Lock to horizontal view

    // FPS-style controls with cardinal position navigation
    const moveSpeed = 0.1; // Speed of camera movement per frame
    const enableCollisionDetection = false; // Configurable collision detection (default: false)
    const keys: Record<string, boolean> = {
      arrowup: false,
      arrowdown: false,
      arrowleft: false,
      arrowright: false
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

    // Continuous movement update function
    // Continuous movement update function with cardinal position navigation
    const updateMovement = () => {
      if (keys.arrowup || keys.arrowdown || keys.arrowleft || keys.arrowright) {
        const currentPosition = world.camera.controls.getPosition(new THREE.Vector3());
        const newPosition = currentPosition.clone();
        const azimuth = world.camera.controls.azimuthAngle;

        // Forward/backward movement
        if (keys.arrowup) {
          newPosition.x -= Math.sin(azimuth) * moveSpeed;
          newPosition.z -= Math.cos(azimuth) * moveSpeed;
        }
        if (keys.arrowdown) {
          newPosition.x += Math.sin(azimuth) * moveSpeed;
          newPosition.z += Math.cos(azimuth) * moveSpeed;
        }

        // Left/right strafing (perpendicular to view direction)
        if (keys.arrowleft) {
          newPosition.x -= Math.cos(azimuth) * moveSpeed;
          newPosition.z += Math.sin(azimuth) * moveSpeed;
        }
        if (keys.arrowright) {
          newPosition.x += Math.cos(azimuth) * moveSpeed;
          newPosition.z -= Math.sin(azimuth) * moveSpeed;
        }

        // Apply movement with optional collision check
        if (!checkCollision(newPosition)) {
          // Prevent camera from being at forbidden positions
          let finalX = newPosition.x;
          let finalZ = newPosition.z;

          // Forbidden position 1: X: -0.03, Z: 0.00
          if (Math.abs(finalX - (-0.03)) < 0.03 && Math.abs(finalZ - 0.00) < 2.20) {
            finalX = 1.43;
            finalZ = -1.82;
          }

          // Forbidden position 2: X: 10.96, Z: -0.99
          if (Math.abs(finalX - 10.96) < 0.02 && Math.abs(finalZ - (-0.99)) < 0.02) {
            finalX = finalX < 10.96 ? 10.94 : 10.98;
            finalZ = finalZ < -0.99 ? -1.01 : -0.97;
          }
          // Reset zoom when moving with arrow keys
          if (world.camera.controls.camera) {
            if (highlighter.zoomFactor !== 1.5) {
              const nearestPosition = findNearestCardinalPosition(currentPosition.x, currentPosition.z);
              if (nearestPosition) {
                moveToCardinalPosition(nearestPosition, true);
              }
            }
            world.camera.controls.camera.zoom = 1;
            world.camera.controls.camera.updateProjectionMatrix();
          }
          world.camera.controls.lookInDirectionOf(finalX, eyeLevel, finalZ, true); // Look north (positive Z direction)
          world.camera.controls.setPosition(finalX, eyeLevel, finalZ); // Force eye level
          // Reset zoom when moving with arrow keys
          if (world.camera.controls.camera) {
            world.camera.controls.camera.zoom = 1;
            world.camera.controls.camera.updateProjectionMatrix();
          }
        }

        // Update position display
        const pos = world.camera.controls.getPosition(new THREE.Vector3());
        const azimuthdisplay = world.camera.controls.azimuthAngle;
        positionDisplay.innerHTML = `
          Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}<br>
          Rotation: ${(azimuthdisplay * 180 / Math.PI).toFixed(1)}°
        `;
      }
      requestAnimationFrame(updateMovement);
    };
    updateMovement();

    // Continuous eye level enforcement - runs every frame
    const enforceEyeLevel = () => {
      const currentPosition = world.camera.controls.getPosition(new THREE.Vector3());
      if (Math.abs(currentPosition.y - eyeLevel) > 0.01) { // Only update if significantly different
        world.camera.controls.setPosition(currentPosition.x, eyeLevel, currentPosition.z);
      }
      requestAnimationFrame(enforceEyeLevel);
    };
    enforceEyeLevel();

    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key in keys) {
        keys[key] = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key in keys) {
        keys[key] = false;
      }
    });

    // Disable mouse wheel zooming and implement cardinal position navigation
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();

      const currentPosition = world.camera.controls.getPosition(new THREE.Vector3());

      // Determine direction for cardinal position selection
      // Negative delta means zoom in (forward movement), positive means zoom out (backward)
      if (e.deltaY < 0) {
        // Forward movement - find closest cardinal position in forward direction
        const nearestPosition = findNearestCardinalPosition(currentPosition.x, currentPosition.z);
        if (nearestPosition) {
          moveToCardinalPosition(nearestPosition, true);
        }
      } else if (e.deltaY > 0) {
        // Backward movement - cycle to next cardinal position
        const nearestPosition = findNearestCardinalPosition(currentPosition.x, currentPosition.z);
        if (nearestPosition) {
          // Find next cardinal position in cycle
          const currentIndex = cardinalPositions.findIndex(p => p.name === nearestPosition.name);
          const nextIndex = (currentIndex + 1) % cardinalPositions.length;
          moveToCardinalPosition(cardinalPositions[nextIndex], true);
        }
      }

      // Reset selection when using mouse wheel
      if (highlighter) {
        highlighter.clear("select");
      }

      // Reset zoom when scrolling with mouse wheel
      if (world.camera.controls.camera) {
        world.camera.controls.camera.zoom = 1;
        world.camera.controls.camera.updateProjectionMatrix();
      }
    }, { passive: false });

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
    console.log('Zoom distance:', highlighter.zoomFactor);
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

      // Force eye level to 1.6m
      const position = world.camera.controls.getPosition(new THREE.Vector3());
      world.camera.controls.setPosition(position.x, eyeLevel, position.z);
    });

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
          // Skip automatic camera fitting to maintain cardinal position
          // world.camera.fit(world.meshes, 0.8);
          console.log('Camera position maintained at cardinal position:', world.camera.controls.getPosition(new THREE.Vector3()));

          // Ensure we maintain the North cardinal position and eye level
          const northPosition = cardinalPositions[0]; // North viewpoint
          world.camera.controls.setPosition(northPosition.x, eyeLevel, northPosition.z);
          world.camera.controls.lookInDirectionOf(northPosition.lookAtX, eyeLevel, northPosition.lookAtZ, true);
          console.log('Camera position after North cardinal restoration:', world.camera.controls.getPosition(new THREE.Vector3()));
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
              ${camera(world)} ${selection(components, world)}
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
              ${camera(world)} 
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