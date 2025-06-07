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
import {
  PostproductionRenderer,
  IfcStreamer,
  Highlighter,
} from "@thatopen/components-front";
import { Manager, Viewport, Component, html, Grid } from "@thatopen/ui";
import * as THREE from "three";
import projectInformation from "./components/Panels/ProjectInformation";
import elementData from "./components/Panels/Selection";
import settings from "./components/Panels/Settings";
import load from "./components/Toolbars/Sections/Import";
import help from "./components/Panels/Help";
import camera from "./components/Toolbars/Sections/Camera";
import measurement from "./components/Toolbars/Sections/Measurement";
import selection from "./components/Toolbars/Sections/Selection";
import { AppManager } from "./components/bim-components";
import { loadIfc } from "./components/Toolbars/Sections/Import";

export class WorldViewer extends HTMLElement {
  constructor() {
    super();
  }

  async connectedCallback() {
    await this.initializeWorldViewer();
  }

  private async initializeWorldViewer() {
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
    world.camera.controls.setPosition(0, 1.6, 5); // Set initial position (x, y, z) - y is eye level
    world.camera.controls.azimuthAngle = Math.PI / 2; // Set initial rotation to look forward horizontally
    world.camera.controls.polarAngle = Math.PI / 2; // Set polar angle to horizontal view

    // Add walking mode camera controls
    world.camera.controls.maxPolarAngle = Math.PI / 2; // Restrict vertical rotation to horizontal plane
    world.camera.controls.minPolarAngle = Math.PI / 2; // Restrict vertical rotation to horizontal plane

    // Add keyboard controls for walking
    const moveSpeed = 5; // Speed of camera movement
    const keys: Record<string, boolean> = {
      w: false,
      s: false,
      a: false,
      d: false
    };

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

    // Update camera position based on key presses
    const updateCameraPosition = () => {
      const direction = new THREE.Vector3();
      const rotation = world.camera.controls.azimuthAngle;

      if (keys.w) {
        direction.z = -Math.cos(rotation);
        direction.x = -Math.sin(rotation);
      }
      if (keys.s) {
        direction.z = Math.cos(rotation);
        direction.x = Math.sin(rotation);
      }
      if (keys.a) {
        direction.x = -Math.cos(rotation);
        direction.z = Math.sin(rotation);
      }
      if (keys.d) {
        direction.x = Math.cos(rotation);
        direction.z = -Math.sin(rotation);
      }

      direction.normalize();
      const position = world.camera.controls.getPosition(new THREE.Vector3());
      position.x += direction.x * moveSpeed;
      position.z += direction.z * moveSpeed;
      world.camera.controls.setPosition(position.x, position.y, position.z);
    };

    // Add animation loop for smooth movement
    const animate = () => {
      requestAnimationFrame(animate);
      updateCameraPosition();
    };
    animate();

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
    await ifcLoader.setup();

    const tilesLoader = components.get(IfcStreamer);
    tilesLoader.world = world;
    tilesLoader.culler.threshold = 10;
    tilesLoader.culler.maxHiddenTime = 1000;
    tilesLoader.culler.maxLostTime = 40000;

    const highlighter = components.get(Highlighter);
    highlighter.setup({ world });
    highlighter.zoomToSelection = false;
    // Set up HighlighterConfig according to the type definition
    highlighter.config = {
      selectName: "select",
      /** Toggles the select functionality. */
      selectEnabled: true,
      /** Name of the hover event. */
      hoverName: "hover",
      /** Toggles the hover functionality. */
      hoverEnabled: false,
      /** Color used for selection. */
      selectionColor: new THREE.Color(1, 0, 0),
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
          world.camera.fit(world.meshes, 0.8);
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

    const projectInformationPanel = await projectInformation(components, isDebugMode, world);
    const elementDataPanel = elementData(components);

    const toolbar = Component.create(() => {
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
          <bim-tab label="Options">
            <bim-toolbar>
              ${camera(world)} ${selection(components, world)}
            </bim-toolbar>
          </bim-tab>
        </bim-tabs>
      `;
      }
    });

    const leftPanel = Component.create(() => {
      if (isDebugMode) {
        return html`
        <bim-tabs>
          <bim-tab name="project" label="Project" icon="ph:building-fill">
            ${projectInformationPanel}
          </bim-tab>
          <bim-tab name="settings" label="Settings" icon="solar:settings-bold">
            ${settings(components, isDebugMode)}
          </bim-tab>
          <bim-tab name="help" label="Help" icon="material-symbols:help">
            ${help}
          </bim-tab>
        </bim-tabs>
      `;
      }
      else {
        return html` <bim-tabs>
          <bim-tab name="project" label="Project" icon="ph:building-fill">
            ${projectInformationPanel}
          </bim-tab>
          <bim-tab name="settings" label="Settings" icon="solar:settings-bold">
            ${settings(components, isDebugMode)}
          </bim-tab>
        </bim-tabs>
        `
      }
    });

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
          /12rem
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
    await loadIfc(components);
  }
}

customElements.define("world-viewer", WorldViewer);