import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import { InfoPanel3D } from "./InfoPanel3D";
import { InfoPanelsConfig, InfoPanelData, defaultInfoPanelsConfig } from "../types/InfoPanelTypes";

export class InfoPanelsManager {
  private panels: Map<string, InfoPanel3D> = new Map();
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private config: InfoPanelsConfig;
  private isEditMode: boolean = false;
  private configFilePath: string = '/data/info-panels-config.json';
  private hasValidConfig: boolean = false;
  
  // UI Elements
  private editButton?: HTMLElement;
  private onConfigChange?: (config: InfoPanelsConfig) => void;
  
  // Performance optimization for position updates
  private lastCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private lastCameraRotation: THREE.Euler = new THREE.Euler();
  private lastUpdateTime: number = 0;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    onConfigChange?: (config: InfoPanelsConfig) => void
  ) {
    console.log('🚀 InfoPanelsManager constructor called');
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.config = { ...defaultInfoPanelsConfig };
    this.onConfigChange = onConfigChange;
    
    console.log('Setting up event listeners and edit button...');
    this.setupEventListeners();
    this.createEditModeButton();
    console.log('✅ InfoPanelsManager initialized');
  }

  private setupEventListeners() {
    // Mouse events for dragging panels in edit mode
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Animation loop for updating HTML positions
    this.animate();
  }

  private createEditModeButton() {
    // Only create button if we have a valid config
    if (!this.hasValidConfig) return;

    this.editButton = document.createElement('button');
    this.editButton.innerHTML = '⚙️';
    this.editButton.title = 'Toggle Edit Mode for Info Panels';
    this.editButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: rgba(0, 120, 180, 0.9);
      border: none;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      font-size: 20px;
      color: white;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
      backdrop-filter: blur(4px);
      display: none;
    `;
    
    this.editButton.addEventListener('mouseenter', () => {
      if (this.editButton) {
        this.editButton.style.transform = 'scale(1.1)';
        this.editButton.style.background = 'rgba(0, 150, 220, 0.9)';
      }
    });
    
    this.editButton.addEventListener('mouseleave', () => {
      if (this.editButton) {
        this.editButton.style.transform = 'scale(1)';
        this.editButton.style.background = this.isEditMode 
          ? 'rgba(255, 170, 0, 0.9)' 
          : 'rgba(0, 120, 180, 0.9)';
      }
    });
    
    this.editButton.addEventListener('click', () => {
      this.toggleEditMode();
    });
    
    document.body.appendChild(this.editButton);
  }

  private onMouseDown(event: MouseEvent) {
    if (!this.isEditMode) return;
    
    // Check if any panel handles the mouse down
    for (const panel of this.panels.values()) {
      if (panel.onMouseDown(event, this.camera)) {
        break; // Only one panel can be dragged at a time
      }
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.isEditMode) return;
    
    // Update all panels with mouse move
    for (const panel of this.panels.values()) {
      panel.onMouseMove(event, this.camera);
    }
  }

  private onMouseUp() {
    if (!this.isEditMode) return;
    
    // Notify all panels of mouse up
    for (const panel of this.panels.values()) {
      panel.onMouseUp();
    }
    
    // Save configuration after dragging
    this.saveConfig();
  }

  private animate() {
    const currentTime = performance.now();
    
    // More aggressive throttling - skip more frames for smoother experience
    const throttleTime = this.isEditMode ? 16 : 50; // 20fps when not editing, 60fps when editing
    if (currentTime - this.lastUpdateTime < throttleTime) {
      requestAnimationFrame(() => this.animate());
      return;
    }
    
    // Check if camera has actually moved with threshold to avoid micro-updates
    const currentPosition = this.camera.position.clone();
    const currentRotation = this.camera.rotation.clone();
    
    // Use distance threshold to prevent tiny movements from triggering updates
    const minDistance = 0.01;
    const minRotation = 0.01;
    
    const positionChanged = this.lastCameraPosition.distanceTo(currentPosition) > minDistance;
    const rotationChanged = (
      Math.abs(this.lastCameraRotation.x - currentRotation.x) > minRotation ||
      Math.abs(this.lastCameraRotation.y - currentRotation.y) > minRotation ||
      Math.abs(this.lastCameraRotation.z - currentRotation.z) > minRotation
    );
    
    // Only update if significant change occurred
    if (positionChanged || rotationChanged || this.isEditMode) {
      // Use requestIdleCallback for smooth updates, fallback to setTimeout
      const updatePanels = () => {
        for (const panel of this.panels.values()) {
          panel.updateHTMLPosition(this.camera, this.renderer);
        }
      };

      if (window.requestIdleCallback) {
        window.requestIdleCallback(updatePanels, { timeout: 16 });
      } else {
        setTimeout(updatePanels, 0);
      }
      
      // Store current camera state
      this.lastCameraPosition.copy(currentPosition);
      this.lastCameraRotation.copy(currentRotation);
      this.lastUpdateTime = currentTime;
    }
    
    requestAnimationFrame(() => this.animate());
  }

  public toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    this.config.editMode = this.isEditMode;
    
    // Update all panels
    for (const panel of this.panels.values()) {
      panel.setEditMode(this.isEditMode);
    }
    
    // Update button appearance
    if (this.editButton) {
      this.editButton.style.background = this.isEditMode 
        ? 'rgba(255, 170, 0, 0.9)' 
        : 'rgba(0, 120, 180, 0.9)';
      this.editButton.title = this.isEditMode 
        ? 'Exit Edit Mode (panels can be moved)' 
        : 'Enter Edit Mode (drag panels to reposition)';
    }
    
    console.log(`Edit mode ${this.isEditMode ? 'enabled' : 'disabled'}`);
    this.saveConfig();
  }

  public addPanel(data: InfoPanelData): InfoPanel3D {
    const panel = new InfoPanel3D(
      data,
      this.scene,
      this.camera,
      (panel) => this.onPanelPositionChange(panel)
    );
    
    this.panels.set(panel.id, panel);
    this.config.panels.push(panel.data);
    
    // Set edit mode if currently enabled
    if (this.isEditMode) {
      panel.setEditMode(true);
    }
    
    this.saveConfig();
    return panel;
  }

  public removePanel(id: string): boolean {
    const panel = this.panels.get(id);
    if (panel) {
      panel.dispose();
      this.panels.delete(id);
      
      // Remove from config
      this.config.panels = this.config.panels.filter(p => p.id !== id);
      this.saveConfig();
      return true;
    }
    return false;
  }

  public getPanel(id: string): InfoPanel3D | undefined {
    return this.panels.get(id);
  }

  public getAllPanels(): InfoPanel3D[] {
    return Array.from(this.panels.values());
  }

  public updatePanelContent(id: string, content: Partial<InfoPanelData['content']>) {
    const panel = this.panels.get(id);
    if (panel) {
      panel.updateContent(content);
      
      // Update config
      const configPanel = this.config.panels.find(p => p.id === id);
      if (configPanel) {
        configPanel.content = { ...configPanel.content, ...content };
        configPanel.modified = new Date();
      }
      
      this.saveConfig();
    }
  }

  private onPanelPositionChange(panel: InfoPanel3D) {
    // Update config when panel position changes
    const configPanel = this.config.panels.find(p => p.id === panel.id);
    if (configPanel) {
      configPanel.position = { ...panel.data.position };
      configPanel.modified = new Date();
    }
  }

  public async loadConfig(): Promise<boolean> {
    console.log('Attempting to load info panels config from:', this.configFilePath);
    
    try {
      const response = await fetch(this.configFilePath);
      console.log('Fetch response status:', response.status, response.statusText);
      
      if (response.ok) {
        const config: InfoPanelsConfig = await response.json();
        console.log('Config loaded successfully:', config);
        
        this.config = config;
        this.hasValidConfig = true;
        
        // Clear existing panels
        this.clearAllPanels();
        
        // Load panels from config
        for (const panelData of config.panels) {
          console.log('Creating panel:', panelData);
          const panel = new InfoPanel3D(
            panelData,
            this.scene,
            this.camera,
            (panel) => this.onPanelPositionChange(panel)
          );
          this.panels.set(panel.id, panel);
          
          if (this.isEditMode) {
            panel.setEditMode(true);
          }
        }
        
        console.log(`✅ Successfully loaded ${config.panels.length} info panels from config`);
        
        // Show edit button now that we have valid config
        if (this.editButton) {
          this.editButton.style.display = 'block';
        }
        
        return true;
      } else {
        console.warn('Failed to load config - HTTP status:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error loading info panels config:', error);
      console.error('Full error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        configPath: this.configFilePath
      });
    }
    
    // Don't load anything if config file doesn't exist
    this.hasValidConfig = false;
    console.log('❌ No info panels config found - panels will not be displayed');
    return false;
  }

  public async saveConfig(): Promise<boolean> {
    try {
      // Update config with current panel states
      this.config.panels = [];
      for (const panel of this.panels.values()) {
        this.config.panels.push({ ...panel.data });
      }
      
      const response = await fetch(this.configFilePath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.config, null, 2)
      });
      
      if (response.ok) {
        console.log('Info panels configuration saved successfully');
        if (this.onConfigChange) {
          this.onConfigChange(this.config);
        }
        return true;
      } else {
        console.error('Failed to save info panels configuration');
      }
    } catch (error) {
      console.error('Error saving info panels configuration:', error);
    }
    return false;
  }



  private clearAllPanels() {
    for (const panel of this.panels.values()) {
      panel.dispose();
    }
    this.panels.clear();
  }

  public dispose() {
    this.clearAllPanels();
    
    if (this.editButton && this.editButton.parentNode) {
      this.editButton.parentNode.removeChild(this.editButton);
    }
  }

  // Utility methods for creating panels with specific content types

  public createZonePanel(
    name: string, 
    position: { x: number, y: number, z: number },
    temperature?: number,
    humidity?: number
  ): InfoPanel3D {
    const panelData: InfoPanelData = {
      id: `zone-${Date.now()}`,
      name,
      position,
      content: {
        zone: name,
        temperature,
        humidity
      },
      visible: true,
      created: new Date(),
      modified: new Date()
    };
    
    return this.addPanel(panelData);
  }

  // Method to create a UI panel for managing info panels
  public createManagementPanel(): BUI.TemplateResult {
    console.log('🎨 Creating management panel - hasValidConfig:', this.hasValidConfig, 'panels count:', this.panels.size);
    
    if (!this.hasValidConfig) {
      console.log('🚫 No valid config - showing no config message');
      return BUI.html`
        <bim-panel-section label="Information Panels" icon="material-symbols:info">
          <div style="padding: 12px; text-align: center; color: #666;">
            <div style="margin-bottom: 8px;">No info panels configuration found.</div>
            <div style="font-size: 12px;">Place a config file at: /data/info-panels-config.json</div>
            <div style="font-size: 10px; margin-top: 8px; color: #888;">Debug: hasValidConfig = ${this.hasValidConfig}</div>
          </div>
        </bim-panel-section>
      `;
    }

    return BUI.html`
      <bim-panel-section label="Info Panels Management" icon="material-symbols:info">
        <div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <bim-button 
              @click=${() => this.toggleEditMode()} 
              icon="solar:settings-bold"
              style="flex: 1;"
            >
              ${this.isEditMode ? 'Exit Edit Mode' : 'Edit Panels'}
            </bim-button>
          </div>
          
          <div style="border-top: 1px solid #333; padding-top: 12px;">
            <bim-button 
              @click=${() => this.createSamplePanel()}
              icon="material-symbols:add"
              style="width: 100%;"
            >
              Add Sample Panel
            </bim-button>
          </div>
          
          <div style="font-size: 12px; color: #666; margin-top: 8px;">
            ${this.panels.size} panel(s) active
            ${this.isEditMode ? ' • Drag blue icons to reposition' : ''}
          </div>
        </div>
      </bim-panel-section>
    `;
  }

  private createSamplePanel() {
    const position = {
      x: Math.random() * 10 - 5,
      y: 2,
      z: Math.random() * 10 - 5
    };
    
    this.createZonePanel(
      `Zone ${this.panels.size + 1}`,
      position,
      Math.round((Math.random() * 10 + 18) * 10) / 10, // 18-28°C
      Math.round((Math.random() * 40 + 30)) // 30-70%
    );
  }
}