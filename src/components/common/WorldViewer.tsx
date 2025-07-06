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

    // Set initial camera position and rotation for horizontal view
    const eyeLevel = 1.6; // Eye level at 1600mm (1.6m)


    world.camera.controls.setPosition(0, eyeLevel, 5); // Set initial position (x, y, z) - y is eye level
    world.camera.controls.azimuthAngle = Math.PI / 2; // Set initial rotation to look forward horizontally
    world.camera.controls.polarAngle = Math.PI / 2; // Set polar angle to horizontal view

    console.log('Initial camera position set:', world.camera.controls.getPosition(new THREE.Vector3()));

    // Lock vertical movement completely
    world.camera.controls.maxPolarAngle = Math.PI / 2; // Lock to horizontal view
    world.camera.controls.minPolarAngle = Math.PI / 2; // Lock to horizontal view

    // Add keyboard controls for walking
    const moveSpeed = 2; // Speed of camera movement
    const keys: Record<string, boolean> = {
      arrowup: false,
      arrowdown: false,
      arrowleft: false,
      arrowright: false
    };

    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key in keys) {
        keys[key] = true;
        // Update camera position based on key presses
        const updateCameraPosition = () => {
          const direction = new THREE.Vector3();
          const rotation = world.camera.controls.azimuthAngle;

          if (keys.arrowup) {
            direction.z = -Math.cos(rotation);
            direction.x = -Math.sin(rotation);
          }
          if (keys.arrowdown) {
            direction.z = Math.cos(rotation);
            direction.x = Math.sin(rotation);
          }
          if (keys.arrowleft) {
            direction.x = -Math.cos(rotation);
            direction.z = Math.sin(rotation);
          }
          if (keys.arrowright) {
            direction.x = Math.cos(rotation);
            direction.z = -Math.sin(rotation);
          }

          direction.normalize();
          const position = world.camera.controls.getPosition(new THREE.Vector3());
          position.x += direction.x * moveSpeed;
          position.z += direction.z * moveSpeed;
          world.camera.controls.setPosition(position.x, position.y, position.z); // Maintain constant eye level
        };

        // Add animation loop for smooth movement
        const animate = () => {
          //requestAnimationFrame(animate);
          updateCameraPosition();
        };
        animate();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key in keys) {
        keys[key] = false;
      }
    });

    // Disable mouse wheel zooming
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const direction = new THREE.Vector3();
      const rotation = world.camera.controls.azimuthAngle;

      // Determine zoom direction based on wheel delta
      // Negative delta means zoom in (forward movement like arrow up key)
      if (e.deltaY < 0) {
        direction.z = -Math.cos(rotation);
        direction.x = -Math.sin(rotation);
      }
      // Positive delta means zoom out (backward movement like arrow down key)
      else if (e.deltaY > 0) {
        direction.z = Math.cos(rotation);
        direction.x = Math.sin(rotation);
      }

      direction.normalize();
      const position = world.camera.controls.getPosition(new THREE.Vector3());
      position.x += direction.x * moveSpeed * 0.5; // Reduced speed for smoother zooming
      position.z += direction.z * moveSpeed * 0.5;
      world.camera.controls.setPosition(position.x, eyeLevel, position.z); // Maintain constant eye level
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

    // Calculate zoom factor based on the distance from light to eye and ground
    // This creates a proportional zoom effect based on the viewing geometry
    const zoomDistance = distanceFromLight / (eyeElevationZ - groundLevelZ);
    highlighter.zoomFactor = zoomDistance;

    // Set up HighlighterConfig according to the type definition
    highlighter.config = {
      selectName: "select",
      /** Toggles the select functionality. */
      selectEnabled: false,
      /** Name of the hover event. */
      hoverName: "hover",
      /** Toggles the hover functionality. */
      hoverEnabled: false,
      /** Color used for selection. */
      selectionColor: new THREE.Color(1, 1, 0),
      /** Color used for hover. */
      hoverColor: new THREE.Color(1, 1, 1),
      /** Whether to automatically highlight fragments on click. */
      autoHighlightOnClick: true,
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
          world.camera.fit(world.meshes, 0.8);
          console.log('Camera position after fit:', world.camera.controls.getPosition(new THREE.Vector3()));

          // Restore eye level after camera fit
          const position = world.camera.controls.getPosition(new THREE.Vector3());
          world.camera.controls.setPosition(position.x, eyeLevel, position.z);
          console.log('Camera position after eye level correction:', world.camera.controls.getPosition(new THREE.Vector3()));
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
              ${camera(world)} ${selection(components, world)}
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