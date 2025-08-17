import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import i18n from "../../../utils/i18n";

export default (world: OBC.World, highlighter?: OBF.Highlighter) => {
  const { camera } = world;

  const onFitModel = () => {
    if (camera instanceof OBC.OrthoPerspectiveCamera && world.meshes.size > 0) {
      camera.fit(world.meshes, 0.5);
    }
  };

  const onLock = (e: Event) => {
    const button = e.target as BUI.Button;
    camera.enabled = !camera.enabled;
    button.active = !camera.enabled;
    button.label = camera.enabled ? i18n.t('disable') : i18n.t('enable');
    button.icon = camera.enabled
      ? "tabler:lock-filled"
      : "majesticons:unlock-open";
  };

  // Camera position controls
  const moveStep = 1.0;
  const rotationStep = 15; // degrees
  const zoomStep = 0.1;

  const moveCamera = (direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down') => {
    if (!camera.controls) return;

    const currentPos = camera.controls.getPosition(new THREE.Vector3());
    const azimuth = camera.controls.azimuthAngle;
    const newPos = currentPos.clone();

    switch (direction) {
      case 'forward':
        newPos.x -= Math.sin(azimuth) * moveStep;
        newPos.z -= Math.cos(azimuth) * moveStep;
        // Clear highlighter selection when camera moves via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
      case 'backward':
        newPos.x += Math.sin(azimuth) * moveStep;
        newPos.z += Math.cos(azimuth) * moveStep;
        // Clear highlighter selection when camera moves via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
      case 'left':
        newPos.x -= Math.cos(azimuth) * moveStep;
        newPos.z += Math.sin(azimuth) * moveStep;
        // Clear highlighter selection when camera moves via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
      case 'right':
        newPos.x += Math.cos(azimuth) * moveStep;
        newPos.z -= Math.sin(azimuth) * moveStep;
        // Clear highlighter selection when camera moves via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
      case 'up':
        newPos.y += moveStep;
        // Clear highlighter selection when camera moves via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
      case 'down':
        newPos.y -= moveStep;
        // Clear highlighter selection when camera moves via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
    }

    camera.controls.setPosition(newPos.x, newPos.y, newPos.z);
  };

  const rotateCamera = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (!camera.controls) return;

    const currentAzimuth = camera.controls.azimuthAngle;
    const currentPolar = camera.controls.polarAngle;
    const radStep = (rotationStep * Math.PI) / 180;

    switch (direction) {
      case 'left':
        camera.controls.azimuthAngle = currentAzimuth - radStep;
        // Clear highlighter selection when camera rotates via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
      case 'right':
        camera.controls.azimuthAngle = currentAzimuth + radStep;
        // Clear highlighter selection when camera rotates via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
      case 'up':
        camera.controls.polarAngle = Math.max(0.1, currentPolar - radStep);
        // Clear highlighter selection when camera rotates via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
      case 'down':
        camera.controls.polarAngle = Math.min(Math.PI - 0.1, currentPolar + radStep);
        // Clear highlighter selection when camera rotates via UI controls
        if (highlighter) {
          highlighter.clear("select");
        }
        break;
    }
  };

  const zoomCamera = (direction: 'in' | 'out') => {
    if (!camera.controls?.camera) return;

    // Clear highlighter selection when camera zooms via UI controls
    if (highlighter) {
      highlighter.clear("select");
    }

    const currentZoom = camera.controls.camera.zoom;
    const newZoom = direction === 'in' ?
      currentZoom + zoomStep :
      Math.max(0.1, currentZoom - zoomStep);

    camera.controls.camera.zoom = newZoom;
    camera.controls.camera.updateProjectionMatrix();
  };

  const resetCamera = () => {
    if (!camera.controls) return;

    // Use the same default position as set on load
    const defaultPos = new THREE.Vector3(-0.42, 0.39, 1.36);
    camera.controls.setPosition(defaultPos.x, defaultPos.y, defaultPos.z);
    camera.controls.azimuthAngle = 343.1 * Math.PI / 180; // 343.1°
    camera.controls.polarAngle = 74.7 * Math.PI / 180; // 74.7°
    if (camera.controls.camera) {
      camera.controls.camera.zoom = 1.00;
      camera.controls.camera.updateProjectionMatrix();
    }
  };

  const toggleProjection = () => {
    if (camera instanceof OBC.OrthoPerspectiveCamera) {
      const current = camera.projection.current;
      camera.projection.set(current === "Perspective" ? "Orthographic" : "Perspective");
    }
  };

  // Position preset functions
  const setTopView = () => {
    if (!camera.controls) return;

    const currentPos = camera.controls.getPosition(new THREE.Vector3());
    camera.controls.setPosition(currentPos.x, currentPos.y + 10, currentPos.z);
    camera.controls.polarAngle = 0.1; // Almost top-down
    if (camera.controls.camera) {
      camera.controls.camera.zoom = 0.5;
      camera.controls.camera.updateProjectionMatrix();
    }
  };

  const setFrontView = () => {
    if (!camera.controls) return;

    camera.controls.azimuthAngle = 0;
    camera.controls.polarAngle = Math.PI / 2;
  };

  const setSideView = () => {
    if (!camera.controls) return;

    camera.controls.azimuthAngle = Math.PI / 2;
    camera.controls.polarAngle = Math.PI / 2;
  };

  return BUI.Component.create<BUI.PanelSection>(() => {
    const t = (key: string) => i18n.t(key);
    return BUI.html`
      <bim-toolbar-section label="${t('camera')}" icon="ph:camera-fill" style="pointer-events: auto">
        <bim-button label="${t('fitModel')}" icon="material-symbols:fit-screen-rounded" @click=${onFitModel}></bim-button>
        <bim-button label="${t('disable')}" icon="tabler:lock-filled" @click=${onLock} .active=${!camera.enabled}></bim-button>
        
        <!-- Position Controls -->
        <div style="display: flex; flex-direction: column; gap: 5px; margin: 10px 0; padding: 10px; border: 1px solid #333; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #ccc;">Position Controls</div>
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto auto; gap: 2px; align-items: center;">
            <div></div>
            <bim-button icon="material-symbols:keyboard-arrow-up" @click=${() => moveCamera('forward')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:keyboard-arrow-up" @click=${() => moveCamera('up')} style="width: 30px; height: 30px;"></bim-button>
            
            <bim-button icon="material-symbols:keyboard-arrow-left" @click=${() => moveCamera('left')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:keyboard-arrow-down" @click=${() => moveCamera('backward')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:keyboard-arrow-right" @click=${() => moveCamera('right')} style="width: 30px; height: 30px;"></bim-button>
            
            <div></div>
            <div></div>
            <bim-button icon="material-symbols:keyboard-arrow-down" @click=${() => moveCamera('down')} style="width: 30px; height: 30px;"></bim-button>
          </div>
        </div>

        <!-- Rotation Controls -->
        <div style="display: flex; flex-direction: column; gap: 5px; margin: 10px 0; padding: 10px; border: 1px solid #333; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #ccc;">Rotation Controls</div>
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; grid-template-rows: auto auto; gap: 2px; align-items: center;">
            <div></div>
            <bim-button icon="material-symbols:rotate-left" @click=${() => rotateCamera('up')} style="width: 30px; height: 30px;"></bim-button>
            <div></div>
            
            <bim-button icon="material-symbols:rotate-left" @click=${() => rotateCamera('left')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:rotate-right" @click=${() => rotateCamera('down')} style="width: 30px; height: 30px;"></bim-button>
            <bim-button icon="material-symbols:rotate-right" @click=${() => rotateCamera('right')} style="width: 30px; height: 30px;"></bim-button>
          </div>
        </div>

        <!-- Camera Presets -->
        <div style="display: flex; flex-direction: column; gap: 5px; margin: 10px 0; padding: 10px; border: 1px solid #333; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #ccc;">Camera Presets</div>
          <div style="display: flex; flex-direction: column; gap: 3px;">
            <bim-button label="Top View" icon="material-symbols:vertical-align-top" @click=${setTopView} style="width: 100%;"></bim-button>
            <bim-button label="Front View" icon="material-symbols:view-in-ar" @click=${setFrontView} style="width: 100%;"></bim-button>
            <bim-button label="Side View" icon="material-symbols:view-sidebar" @click=${setSideView} style="width: 100%;"></bim-button>
            <bim-button label="Reset" icon="material-symbols:refresh" @click=${resetCamera} style="width: 100%;"></bim-button>
          </div>
        </div>

        <!-- Projection Toggle -->
        <div style="display: flex; flex-direction: column; gap: 5px; margin: 10px 0; padding: 10px; border: 1px solid #333; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: bold; color: #ccc;">Projection</div>
          <bim-button label="Toggle Perspective/Orthographic" icon="material-symbols:3d-rotation" @click=${toggleProjection} style="width: 100%;"></bim-button>
        </div>
      </bim-toolbar-section>
    `;
  });
};
