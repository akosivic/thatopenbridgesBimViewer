import * as THREE from "three";
import { InfoPanelData } from "../types/InfoPanelTypes";
import i18n from "../utils/i18n";

export class InfoPanel3D {
  private static panelCount = 0;

  public readonly id: string;
  public data: InfoPanelData;
  
  // 3D Scene elements
  private scene: THREE.Scene;
  private group: THREE.Group;
  
  // HTML elements
  private htmlContainer: HTMLDivElement;
  private iconElement: HTMLDivElement;
  private panelElement: HTMLDivElement;
  
  // Panel state
  private isPanelVisible: boolean = false;
  private isEditMode: boolean = false;
  private isDragging: boolean = false;
  
  // Content editing state
  private isContentEditMode: boolean = false;
  private isInlineTitleEdit: boolean = false;
  
  // Distance-based visibility settings
  private readonly VISIBILITY_DISTANCE = 2; // Distance at which icons start to appear (very close)
  private readonly MAX_VISIBILITY_DISTANCE = 15; // Distance at which icons completely fade out
  private readonly FADE_START_DISTANCE = 8; // Distance at which fade begins
  
  // Event callbacks
  private onPositionChange?: (panel: InfoPanel3D) => void;
  
  // Drag state
  private dragOffset = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(
    data: InfoPanelData,
    scene: THREE.Scene,
    _camera: THREE.Camera,
    onPositionChange?: (panel: InfoPanel3D) => void
  ) {
    this.id = data.id || `info-panel-${InfoPanel3D.panelCount++}`;
    this.data = { ...data };
    this.scene = scene;
    this.onPositionChange = onPositionChange;
    
    console.log('🎨 [InfoPanel3D] Creating panel:', this.id, 'at position:', this.data.position);

    // Create 3D group for the panel marker
    this.group = new THREE.Group();
    this.group.name = `InfoPanel3D-${this.id}`;
    
    // Create HTML elements
    this.htmlContainer = this.createHTMLContainer();
    this.iconElement = this.createIconElement();
    this.panelElement = this.createPanelElement();
    
    // Setup the panel
    this.setupPanelElements();
    this.create3DMarker();
    this.updatePosition();
    
    // Setup event listeners for panel controls
    this.setupPanelEventListeners();
    
    // Add to scene
    this.scene.add(this.group);
    document.body.appendChild(this.htmlContainer);
    
    // Add to global reference for onclick handlers
    if (!(window as any).infoPanels) {
      (window as any).infoPanels = new Map();
    }
    (window as any).infoPanels.set(this.id, this);
    
    console.log('✅ [InfoPanel3D] Panel fully created:', this.id, 'HTML added to body');
  }

  /**
   * Create the main HTML container for the floating panel
   */
  private createHTMLContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'info-panel-3d-container';
    container.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      transform: translate(-50%, 0);
      z-index: 1000;
      pointer-events: auto;
      will-change: transform;
      visibility: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    return container;
  }

  /**
   * Create the blue circular icon with exclamation mark
   */
  private createIconElement(): HTMLDivElement {
    const icon = document.createElement('div');
    icon.className = 'info-panel-icon';
    icon.style.cssText = `
      width: 32px;
      height: 32px;
      background: #0078D4;
      border: 2px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 18px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 120, 212, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
      margin-bottom: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      position: relative;
      z-index: 1001;
    `;
    icon.innerHTML = '!';
    icon.title = 'Click to show/hide panel information';
    
    // Add click handler to toggle panel
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePanel();
    });

    // Add hover effects
    icon.addEventListener('mouseenter', () => {
      icon.style.transform = 'scale(1.15)';
      icon.style.background = 'linear-gradient(135deg, #005a9e 0%, #003d6b 100%)';
      icon.style.boxShadow = '0 6px 16px rgba(0, 120, 212, 0.6), 0 3px 6px rgba(0, 0, 0, 0.3)';
    });

    icon.addEventListener('mouseleave', () => {
      icon.style.transform = 'scale(1)';
      if (this.isPanelVisible) {
        icon.style.background = 'linear-gradient(135deg, #005a9e 0%, #003d6b 100%)';
        icon.style.boxShadow = '0 6px 16px rgba(0, 90, 158, 0.5), 0 2px 4px rgba(0, 0, 0, 0.2)';
      } else {
        icon.style.background = 'linear-gradient(135deg, #0078D4 0%, #005a9e 100%)';
        icon.style.boxShadow = '0 4px 12px rgba(0, 120, 212, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)';
      }
    });

    return icon;
  }

  /**
   * Create the expandable information panel
   */
  private createPanelElement(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'info-panel-content';
    panel.style.cssText = `
      background: linear-gradient(135deg, rgba(0, 120, 212, 0.98) 0%, rgba(0, 95, 169, 0.98) 100%);
      color: white;
      padding: 16px;
      border-radius: 12px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 14px;
      min-width: 220px;
      max-width: 300px;
      box-shadow: 
        0 8px 32px rgba(0, 120, 212, 0.3),
        0 4px 16px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      display: none;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.15);
      animation: panelFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1002;
      margin-top: 8px;
    `;
    
    // Don't call updatePanelContent here - it will be called after setup
    return panel;
  }

  /**
   * Setup the HTML panel elements and their relationships
   */
  private setupPanelElements(): void {
    this.htmlContainer.appendChild(this.iconElement);
    this.htmlContainer.appendChild(this.panelElement);
    
    // Now that panelElement is properly set up, update its content
    this.updatePanelContent();
  }

  /**
   * Setup event listeners for panel controls (edit and close buttons)
   */
  private setupPanelEventListeners(): void {
    // Listen for edit button clicks
    this.htmlContainer.addEventListener('panel-edit', (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.panelId === this.id) {
        this.toggleEditMode();
      }
    });

    // Listen for close button clicks  
    this.htmlContainer.addEventListener('panel-close', (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.panelId === this.id) {
        this.closePanel();
      }
    });
  }

  /**
   * Toggle edit mode for this individual panel - now supports inline title editing
   */
  private toggleEditMode(): void {
    if (this.isEditMode) {
      // If already in position edit mode, switch to inline title edit mode
      this.isEditMode = false;
      this.isInlineTitleEdit = true;
      this.setEditMode(false);
      this.updatePanelContent();
      console.log(`✏️ [InfoPanel3D] Panel ${this.id} inline title edit mode enabled`);
    } else if (this.isInlineTitleEdit) {
      // If in inline title edit mode, disable edit mode
      this.isInlineTitleEdit = false;
      this.updatePanelContent();
      console.log(`🛠️ [InfoPanel3D] Panel ${this.id} edit mode disabled`);
    } else {
      // If not in any edit mode, enable position edit mode
      this.isEditMode = true;
      this.setEditMode(true);
      console.log(`🛠️ [InfoPanel3D] Panel ${this.id} position edit mode enabled`);
    }
  }

  /**
   * Show edit modal for panel title
   */
  public showEditModal(): void {
    const overlay = document.createElement('div');
    overlay.className = 'edit-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    
    modal.innerHTML = `
      <h3>${i18n.t('edit')} ${this.data.name}</h3>
      <input type="text" class="edit-modal-input" value="${this.data.name}" placeholder="${i18n.t('enterTitle')}">
      <div class="edit-modal-buttons">
        <button class="edit-modal-button secondary" data-action="cancel">${i18n.t('cancel')}</button>
        <button class="edit-modal-button primary" data-action="save">${i18n.t('save')}</button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const input = modal.querySelector('.edit-modal-input') as HTMLInputElement;
    input.focus();
    input.select();
    
    const handleAction = (action: string) => {
      if (action === 'save') {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== this.data.name) {
          this.data.name = newTitle;
          this.updatePanelContent();
        }
      }
      document.body.removeChild(overlay);
    };
    
    modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action');
      if (action) {
        handleAction(action);
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleAction('save');
      } else if (e.key === 'Escape') {
        handleAction('cancel');
      }
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        handleAction('cancel');
      }
    });
  }

  /**
   * Show point list modal
   */
  public showPointListModal(): void {
    const overlay = document.createElement('div');
    overlay.className = 'point-list-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'point-list-modal';
    
    modal.innerHTML = `
      <div class="point-list-header">
        <h3 class="point-list-title">${i18n.t('pointList')}</h3>
        <button class="point-list-close">&times;</button>
      </div>
      <div class="point-list-content">
        <div class="point-list-loading">${i18n.t('loadingPoints')}</div>
      </div>
      <button class="point-list-add-button">${i18n.t('newItem')}</button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const closeModal = () => {
      document.body.removeChild(overlay);
    };
    
    modal.querySelector('.point-list-close')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
    
    // Simulate loading points from DPAL
    setTimeout(() => {
      this.loadPointsFromDPAL(modal.querySelector('.point-list-content') as HTMLElement);
    }, 1500);
    
    modal.querySelector('.point-list-add-button')?.addEventListener('click', () => {
      this.addNewPoint();
    });
  }

  /**
   * Simulate loading points from DPAL device
   */
  private loadPointsFromDPAL(container: HTMLElement): void {
    // Placeholder for DPAL integration
    const mockPoints = [
      { name: 'Temperature Sensor 1', x: 10.5, y: 2.3, z: 5.8 },
      { name: 'Humidity Sensor 1', x: 12.1, y: 2.3, z: 6.2 },
      { name: 'Pressure Sensor 1', x: 11.0, y: 2.5, z: 5.0 }
    ];
    
    container.innerHTML = mockPoints.map(point => `
      <div class="point-list-item">
        <div class="point-list-item-info">
          <div class="point-list-item-name">${point.name}</div>
          <div class="point-list-item-coords">x: ${point.x}, y: ${point.y}, z: ${point.z}</div>
        </div>
        <div class="point-list-actions">
          <button class="content-edit-button" onclick="console.log('Add point: ${point.name}')">${i18n.t('addPoint')}</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Add a new point (placeholder for DPAL integration)
   */
  private addNewPoint(): void {
    console.log('🔗 [InfoPanel3D] Add new point - DPAL integration placeholder');
    // TODO: Implement DPAL device communication
  }

  /**
   * Save title changes to the info-panels JSON file
   */
  private async saveTitleToFile(newTitle: string): Promise<void> {
    try {
      // Update the local data
      this.data.name = newTitle;
      
      // Prepare the update payload
      const updatePayload = {
        id: this.id,
        name: newTitle,
        position: this.data.position,
        content: this.data.content,
        visible: this.data.visible,
        modified: new Date()
      };

      // Send update to server
      const response = await fetch('/ws/node/api/updateInfoPanel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        console.log(`✅ [InfoPanel3D] Panel ${this.id} title updated to "${newTitle}"`);
      } else {
        console.error(`❌ [InfoPanel3D] Failed to update panel ${this.id} title`);
        // Could revert the local change here if needed
      }
    } catch (error) {
      console.error(`❌ [InfoPanel3D] Error updating panel ${this.id} title:`, error);
    }
  }

  /**
   * Handle inline title editing completion (save)
   */
  public async finishInlineTitleEdit(newTitle: string): Promise<void> {
    if (newTitle.trim() && newTitle !== this.data.name) {
      await this.saveTitleToFile(newTitle.trim());
    }
    this.isInlineTitleEdit = false;
    this.updatePanelContent();
  }

  /**
   * Cancel inline title editing
   */
  public cancelInlineTitleEdit(): void {
    this.isInlineTitleEdit = false;
    this.updatePanelContent();
  }

  /**
   * Close the panel (hide the popup but keep the icon visible)
   */
  private closePanel(): void {
    this.isPanelVisible = false;
    this.panelElement.style.animation = 'panelFadeOut 0.2s ease-in-out';
    setTimeout(() => {
      this.panelElement.style.display = 'none';
    }, 200);
    this.iconElement.style.background = 'linear-gradient(135deg, #0078D4 0%, #005a9e 100%)';
    this.iconElement.style.boxShadow = '0 4px 12px rgba(0, 120, 212, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)';
    console.log(`❌ [InfoPanel3D] Panel ${this.id} closed`);
  }

  /**
   * Create 3D marker in the scene for edit mode (invisible by default)
   */
  private create3DMarker(): void {
    // Create an invisible interaction sphere for edit mode
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.3,
      visible: false
    });
    
    const marker = new THREE.Mesh(geometry, material);
    marker.name = 'edit-marker';
    marker.userData = { panelId: this.id, isDragHandle: true };
    
    this.group.add(marker);
  }

  /**
   * Update the position of the 3D group and HTML elements
   */
  public updatePosition(): void {
    // Position the 3D group at the exact coordinates from the config
    // Note: The config uses x,y,z where y is typically depth and z is height
    // THREE.js uses x,y,z where y is height and z is depth (negative)
    const { x, y, z } = this.data.position;
    
    console.log(`📍 [InfoPanel3D] Positioning panel ${this.id} at config coords: x=${x}, y=${y}, z=${z}`);
    
    this.group.position.set(
      x,      // X stays the same
      z,      // Config Z becomes THREE.js Y (height)
      -y      // Config Y becomes negative THREE.js Z (depth, inverted)
    );
    
    console.log(`📍 [InfoPanel3D] THREE.js position set to: x=${this.group.position.x}, y=${this.group.position.y}, z=${this.group.position.z}`);
    
    this.group.updateMatrixWorld();
  }

  /**
   * Update the HTML position based on 3D world position
   */
  public updateHTMLPosition(camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    if (!this.data.visible) {
      this.htmlContainer.style.visibility = 'hidden';
      console.log(`👁️ [InfoPanel3D] Panel ${this.id} is not visible (data.visible = false)`);
      return;
    }

    // Get the 3D world position
    const worldPosition = new THREE.Vector3();
    this.group.getWorldPosition(worldPosition);

    // Check distance to camera for distance-based visibility
    const distance = camera.position.distanceTo(worldPosition);
    
    // Hide if too far away
    if (distance > this.MAX_VISIBILITY_DISTANCE) {
      this.htmlContainer.style.visibility = 'hidden';
      // Reduce console spam - only log occasionally
      if (Math.random() < 0.01) {
        console.log(`� [InfoPanel3D] Panel ${this.id} hidden - too far (${distance.toFixed(1)} > ${this.MAX_VISIBILITY_DISTANCE})`);
      }
      return;
    }

    // Hide if very close (within visibility threshold)
    if (distance < this.VISIBILITY_DISTANCE) {
      this.htmlContainer.style.visibility = 'hidden';
      // Reduce console spam - only log occasionally  
      if (Math.random() < 0.01) {
        console.log(`� [InfoPanel3D] Panel ${this.id} hidden - too close (${distance.toFixed(1)} < ${this.VISIBILITY_DISTANCE})`);
      }
      return;
    }

    // Project to screen coordinates
    const screenPosition = worldPosition.clone().project(camera);
    
    // Check if behind camera
    if (screenPosition.z >= 1) {
      this.htmlContainer.style.visibility = 'hidden';
      return;
    }

    // Convert to pixel coordinates
    const canvas = renderer.domElement;
    const x = (screenPosition.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (screenPosition.y * -0.5 + 0.5) * canvas.clientHeight;

    // Update HTML position - center horizontally, position at the point vertically (icon at the point, panel below)
    const transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, 0)`;
    if (this.htmlContainer.style.transform !== transform) {
      this.htmlContainer.style.transform = transform;
    }

    // Show the container
    this.htmlContainer.style.visibility = 'visible';
    
    // Reduce console spam - only log occasionally for visible panels
    if (Math.random() < 0.005) {
      console.log(`✅ [InfoPanel3D] Panel ${this.id} visible at distance: ${distance.toFixed(1)} (range: ${this.VISIBILITY_DISTANCE}-${this.MAX_VISIBILITY_DISTANCE})`);
    }

    // Apply distance-based scaling and opacity with smooth transitions
    let opacity = 1.0;
    let scale = 1.0;

    // Calculate fade based on distance ranges
    if (distance > this.FADE_START_DISTANCE && distance <= this.MAX_VISIBILITY_DISTANCE) {
      // Fade out as distance increases beyond FADE_START_DISTANCE
      const fadeRange = this.MAX_VISIBILITY_DISTANCE - this.FADE_START_DISTANCE;
      const fadeProgress = (distance - this.FADE_START_DISTANCE) / fadeRange;
      opacity = Math.max(0.3, 1.0 - fadeProgress);
      scale = Math.max(0.6, 1.0 - fadeProgress * 0.4);
    } else if (distance >= this.VISIBILITY_DISTANCE && distance <= this.FADE_START_DISTANCE) {
      // Full opacity and scale in the optimal viewing range
      opacity = 1.0;
      scale = 1.0;
    }
    
    this.iconElement.style.opacity = opacity.toString();
    this.iconElement.style.transform = `scale(${scale})`;
    
    // Add smooth transition for opacity and scale changes
    if (!this.iconElement.style.transition.includes('opacity') || !this.iconElement.style.transition.includes('transform')) {
      this.iconElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    }
  }

  /**
   * Update the panel content based on current data
   */
  private updatePanelContent(): void {
    const { content } = this.data;
    const temperature = content.temperature;
    const humidity = content.humidity;
    
    // Add content editing class if in content edit mode
    const panelClass = this.isContentEditMode ? ' panel-content-editing' : '';
    
    this.panelElement.innerHTML = `
      <style>
        @keyframes panelFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes panelFadeOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-5px) scale(0.98);
          }
        }
        
        .info-metric {
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          transition: background-color 0.2s ease;
        }
        
        .info-metric:last-child {
          border-bottom: none;
        }
        
        .info-metric:hover {
          background-color: rgba(255, 255, 255, 0.05);
          margin: 0 -8px;
          padding-left: 8px;
          padding-right: 8px;
          border-radius: 6px;
        }
      </style>
      
      <div class="panel-content${panelClass}">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
          <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
            ${this.isInlineTitleEdit ? `
              <input 
                type="text" 
                value="${this.data.name}" 
                id="panel-title-input-${this.id}"
                style="font-size: 18px; font-weight: 600; background: rgba(255,255,255,0.9); color: #333; border: 2px solid #007acc; border-radius: 4px; padding: 4px 8px; flex: 1; outline: none;"
                onkeydown="
                  if (event.key === 'Enter') {
                    window.infoPanels?.get('${this.id}')?.finishInlineTitleEdit?.(this.value);
                  } else if (event.key === 'Escape') {
                    window.infoPanels?.get('${this.id}')?.cancelInlineTitleEdit?.();
                  }
                "
                onblur="window.infoPanels?.get('${this.id}')?.finishInlineTitleEdit?.(this.value)"
                placeholder="${i18n.t('enterTitle')}"
              />
            ` : `
              <span style="font-size: 18px; font-weight: 600; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);">${this.data.name}</span>
            `}
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-size: 16px; cursor: pointer; opacity: 0.7; transition: all 0.2s ease; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px;" 
                  onmouseover="this.style.opacity='1'; this.style.background='rgba(255,255,255,0.1)'" 
                  onmouseout="this.style.opacity='0.7'; this.style.background='transparent'"
                  onclick="this.dispatchEvent(new CustomEvent('panel-edit', { bubbles: true, detail: { panelId: '${this.id}' } }))"
                  title="Edit panel">⚙️</span>
            <span style="font-size: 18px; cursor: pointer; line-height: 1; opacity: 0.7; transition: all 0.2s ease; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px;" 
                  onmouseover="this.style.opacity='1'; this.style.background='rgba(255,255,255,0.1)'" 
                  onmouseout="this.style.opacity='0.7'; this.style.background='transparent'"
                  onclick="this.dispatchEvent(new CustomEvent('panel-close', { bubbles: true, detail: { panelId: '${this.id}' } }))"
                  title="Close panel">×</span>
          </div>
        </div>
        
        ${temperature !== undefined ? `
          <div class="info-metric" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">🌡️</span>
              <strong>Temperature</strong>
            </div>
            <span style="font-size: 16px; font-weight: 600; color: #fff;">${temperature}°C</span>
          </div>
        ` : ''}
        
        ${humidity !== undefined ? `
          <div class="info-metric" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">💧</span>
              <strong>Humidity</strong>
            </div>
            <span style="font-size: 16px; font-weight: 600; color: #fff;">${humidity}%</span>
          </div>
        ` : ''}
        
        ${content.coordinates ? `
          <div style="margin-top: 12px; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 6px; font-size: 11px; color: rgba(255,255,255,0.8); font-family: 'Consolas', 'Monaco', monospace;">
            📍 ${content.coordinates}
          </div>
        ` : ''}
        
        ${this.isContentEditMode ? `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
            <button class="point-list-add-button" onclick="window.infoPanels?.get('${this.id}')?.showPointListModal?.()" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">${i18n.t('newItem')}</button>
          </div>
        ` : ''}
      </div>
    `;
    
    // Auto-focus and select text when entering inline edit mode
    if (this.isInlineTitleEdit) {
      setTimeout(() => {
        const input = document.getElementById(`panel-title-input-${this.id}`) as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      }, 10);
    }
  }

  /**
   * Toggle the visibility of the information panel
   */
  private togglePanel(): void {
    this.isPanelVisible = !this.isPanelVisible;
    
    if (this.isPanelVisible) {
      this.panelElement.style.display = 'block';
      this.panelElement.style.animation = 'panelFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      this.iconElement.style.background = 'linear-gradient(135deg, #005a9e 0%, #003d6b 100%)';
      this.iconElement.style.boxShadow = '0 6px 16px rgba(0, 90, 158, 0.5), 0 2px 4px rgba(0, 0, 0, 0.2)';
    } else {
      this.panelElement.style.animation = 'panelFadeOut 0.2s ease-in-out';
      setTimeout(() => {
        this.panelElement.style.display = 'none';
      }, 200);
      this.iconElement.style.background = 'linear-gradient(135deg, #0078D4 0%, #005a9e 100%)';
      this.iconElement.style.boxShadow = '0 4px 12px rgba(0, 120, 212, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)';
    }
  }

  /**
   * Set edit mode state
   */
  public setEditMode(enabled: boolean): void {
    this.isEditMode = enabled;
    
    // Show/hide the 3D marker
    const marker = this.group.getObjectByName('edit-marker') as THREE.Mesh;
    if (marker && marker.material) {
      if (Array.isArray(marker.material)) {
        marker.material.forEach(mat => mat.visible = enabled);
      } else {
        marker.material.visible = enabled;
      }
    }
    
    // Update panel content to show/hide edit controls
    this.updatePanelContent();
  }

  /**
   * Handle mouse down for dragging in edit mode
   */
  public onMouseDown(event: MouseEvent, camera: THREE.Camera): boolean {
    if (!this.isEditMode) return false;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObject(this.group, true);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      if (intersection.object.userData.isDragHandle) {
        this.isDragging = true;
        this.dragOffset.copy(intersection.point).sub(this.group.position);
        return true;
      }
    }

    return false;
  }

  /**
   * Handle mouse move for dragging
   */
  public onMouseMove(event: MouseEvent, camera: THREE.Camera): void {
    if (!this.isDragging) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    
    // Create a ground plane for raycasting
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    
    if (this.raycaster.ray.intersectPlane(groundPlane, intersection)) {
      const newPosition = intersection.sub(this.dragOffset);
      
      // Update the data position (convert back from THREE.js coordinates)
      this.data.position.x = newPosition.x;
      this.data.position.y = -newPosition.z;  // Convert back to config coordinate system
      this.data.position.z = Math.max(0.5, newPosition.y);  // Ensure minimum height
      
      this.updatePosition();
      this.data.modified = new Date();
      
      // Notify position change
      if (this.onPositionChange) {
        this.onPositionChange(this);
      }
    }
  }

  /**
   * Handle mouse up to end dragging
   */
  public onMouseUp(): void {
    this.isDragging = false;
  }

  /**
   * Update panel content
   */
  public updateContent(newContent: Partial<InfoPanelData['content']>): void {
    this.data.content = { ...this.data.content, ...newContent };
    this.data.modified = new Date();
    this.updatePanelContent();
  }

  /**
   * Set panel visibility
   */
  public setVisible(visible: boolean): void {
    this.data.visible = visible;
    this.group.visible = visible;
    
    if (!visible) {
      this.htmlContainer.style.visibility = 'hidden';
    }
  }

  /**
   * Update distance-based visibility thresholds
   */
  public updateVisibilitySettings(minDistance: number, maxDistance: number, fadeStartDistance?: number): void {
    (this as any).VISIBILITY_DISTANCE = minDistance;
    (this as any).MAX_VISIBILITY_DISTANCE = maxDistance;
    (this as any).FADE_START_DISTANCE = fadeStartDistance || minDistance + ((maxDistance - minDistance) * 0.7);
    
    console.log(`🔧 [InfoPanel3D] Panel ${this.id} visibility updated: min=${minDistance}, max=${maxDistance}, fade=${(this as any).FADE_START_DISTANCE}`);
  }

  /**
   * Get current distance from camera (for debugging)
   */
  public getDistanceFromCamera(camera: THREE.Camera): number {
    const worldPosition = new THREE.Vector3();
    this.group.getWorldPosition(worldPosition);
    return camera.position.distanceTo(worldPosition);
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Remove from scene
    this.scene.remove(this.group);
    
    // Clean up 3D objects
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    
    // Remove HTML elements
    if (this.htmlContainer && this.htmlContainer.parentNode) {
      this.htmlContainer.parentNode.removeChild(this.htmlContainer);
    }
    
    // Clean up global reference
    if ((window as any).infoPanels) {
      (window as any).infoPanels.delete(this.id);
    }
  }
}