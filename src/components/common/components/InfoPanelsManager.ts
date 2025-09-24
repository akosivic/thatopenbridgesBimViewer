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
  private configFilePath: string = '/ws/node/api/getInfoPanelsConfig';
  private hasValidConfig: boolean = false;
  
  // UI Elements  
  private onConfigChange?: (config: InfoPanelsConfig) => void;
  
  // Performance optimization
  private lastCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private lastCameraRotation: THREE.Euler = new THREE.Euler();
  private lastUpdateTime: number = 0;
  
  // Animation frame
  private animationId?: number;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    onConfigChange?: (config: InfoPanelsConfig) => void
  ) {
    console.log('🚀 InfoPanelsManager (New) constructor called');
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.config = { ...defaultInfoPanelsConfig };
    this.onConfigChange = onConfigChange;
    
    this.setupEventListeners();
    console.log('✅ InfoPanelsManager (New) initialized');
  }

  /**
   * Setup event listeners for mouse interactions
   */
  private setupEventListeners(): void {
    // Mouse events for dragging panels in edit mode
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Start animation loop
    this.startAnimation();
  }



  /**
   * Mouse down handler for edit mode dragging
   */
  private onMouseDown(event: MouseEvent): void {
    if (!this.isEditMode) return;
    
    for (const panel of this.panels.values()) {
      if (panel.onMouseDown(event, this.camera)) {
        break; // Panel handled the event
      }
    }
  }

  /**
   * Mouse move handler for edit mode dragging
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.isEditMode) return;
    
    for (const panel of this.panels.values()) {
      panel.onMouseMove(event, this.camera);
    }
  }

  /**
   * Mouse up handler to end dragging
   */
  private onMouseUp(): void {
    if (!this.isEditMode) return;
    
    for (const panel of this.panels.values()) {
      panel.onMouseUp();
    }
  }

  /**
   * Start the animation loop for updating HTML positions
   */
  private startAnimation(): void {
    const animate = () => {
      this.updatePanelPositions();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Update HTML positions of all panels
   */
  private updatePanelPositions(): void {
    const currentTime = performance.now();
    
    // Throttle updates for performance
    const throttleTime = this.isEditMode ? 16 : 50; // 60fps in edit mode, 20fps otherwise
    if (currentTime - this.lastUpdateTime < throttleTime) {
      return;
    }
    
    // Check if camera has moved significantly
    const currentPosition = this.camera.position.clone();
    const currentRotation = this.camera.rotation.clone();
    
    const minDistance = 0.01;
    const minRotation = 0.01;
    
    const positionChanged = this.lastCameraPosition.distanceTo(currentPosition) > minDistance;
    const rotationChanged = (
      Math.abs(this.lastCameraRotation.x - currentRotation.x) > minRotation ||
      Math.abs(this.lastCameraRotation.y - currentRotation.y) > minRotation ||
      Math.abs(this.lastCameraRotation.z - currentRotation.z) > minRotation
    );
    
    // Only update if camera moved or we're in edit mode
    if (positionChanged || rotationChanged || this.isEditMode) {
      // Update panel positions efficiently
      for (const panel of this.panels.values()) {
        panel.updateHTMLPosition(this.camera, this.renderer);
      }
      
      // Store current camera state
      this.lastCameraPosition.copy(currentPosition);
      this.lastCameraRotation.copy(currentRotation);
      this.lastUpdateTime = currentTime;
    }
  }

  /**
   * Toggle edit mode on/off
   */
  public toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    console.log('Edit mode toggled:', this.isEditMode);
    
    // Update all panels
    for (const panel of this.panels.values()) {
      panel.setEditMode(this.isEditMode);
    }
    
    // Edit mode toggled - panels will handle their own edit state
    
    // Save config when exiting edit mode
    if (!this.isEditMode) {
      this.saveConfig();
    }
  }

  /**
   * Add a new panel
   */
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
    
    console.log(`Added panel ${panel.id} at position:`, data.position);
    this.saveConfig();
    return panel;
  }

  /**
   * Remove a panel
   */
  public removePanel(id: string): boolean {
    const panel = this.panels.get(id);
    if (panel) {
      panel.dispose();
      this.panels.delete(id);
      
      // Remove from config
      this.config.panels = this.config.panels.filter(p => p.id !== id);
      this.saveConfig();
      console.log(`Removed panel ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Configure distance-based visibility for all panels
   */
  public setVisibilityDistance(minDistance: number = 2, maxDistance: number = 15, fadeStartDistance?: number): void {
    console.log(`🔧 [InfoPanelsManager] Setting visibility distances: min=${minDistance}, max=${maxDistance}, fade=${fadeStartDistance || 'auto'}`);
    
    for (const panel of this.panels.values()) {
      panel.updateVisibilitySettings(minDistance, maxDistance, fadeStartDistance);
    }
  }

  /**
   * Get distance information for all panels (debugging)
   */
  public getDistanceInfo(): Array<{id: string, distance: number}> {
    const distances: Array<{id: string, distance: number}> = [];
    
    for (const panel of this.panels.values()) {
      distances.push({
        id: panel.id,
        distance: panel.getDistanceFromCamera(this.camera)
      });
    }
    
    return distances.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get a specific panel
   */
  public getPanel(id: string): InfoPanel3D | undefined {
    return this.panels.get(id);
  }

  /**
   * Get all panels
   */
  public getAllPanels(): InfoPanel3D[] {
    return Array.from(this.panels.values());
  }

  /**
   * Update panel content
   */
  public updatePanelContent(id: string, content: Partial<InfoPanelData['content']>): void {
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

  /**
   * Handle panel position changes
   */
  private onPanelPositionChange(panel: InfoPanel3D): void {
    // Update config when panel position changes
    const configPanel = this.config.panels.find(p => p.id === panel.id);
    if (configPanel) {
      configPanel.position = { ...panel.data.position };
      configPanel.modified = new Date();
    }
  }

  /**
   * Load configuration from server
   */
  public async loadConfig(): Promise<boolean> {
    console.log('🔄 [InfoPanelsManager] Attempting to load info panels config from:', this.configFilePath);
    
    try {
      const response = await fetch(this.configFilePath);
      console.log('Fetch response status:', response.status, response.statusText);
      
      if (response.ok) {
        const config: InfoPanelsConfig = await response.json();
        console.log('✅ [InfoPanelsManager] Config loaded successfully:', config);
        console.log('📊 [InfoPanelsManager] Number of panels to create:', config.panels.length);
        
        this.config = config;
        this.hasValidConfig = true;
        
        // Clear existing panels
        this.clearAllPanels();
        
        // Load panels from config - sort by east coordinate (descending) to start from easternmost panels
        const sortedPanels = [...config.panels].sort((a, b) => {
          const aEast = a.realWorldPosition?.east ?? 0;
          const bEast = b.realWorldPosition?.east ?? 0;
          return bEast - aEast; // Sort descending (easternmost first)
        });
        
        console.log('🧭 [InfoPanelsManager] Loading panels from east to west:', 
          sortedPanels.map(p => ({ id: p.id, east: p.realWorldPosition?.east })));
        
        for (const panelData of sortedPanels) {
          console.log('🎯 [InfoPanelsManager] Creating panel from config:', panelData);
          
          // Ensure dates are properly converted
          const enrichedPanelData: InfoPanelData = {
            ...panelData,
            created: new Date(panelData.created),
            modified: new Date(panelData.modified)
          };
          
          const panel = new InfoPanel3D(
            enrichedPanelData,
            this.scene,
            this.camera,
            (panel) => this.onPanelPositionChange(panel)
          );
          
          this.panels.set(panel.id, panel);
          console.log('✨ [InfoPanelsManager] Panel added to collection:', panel.id, 'Total panels:', this.panels.size);
          
          if (this.isEditMode) {
            panel.setEditMode(true);
          }
        }
        
        console.log(`✅ Successfully loaded ${config.panels.length} info panels from config`);
        console.log('🔍 [InfoPanelsManager] Final panel count in collection:', this.panels.size);
        
        // Config loaded successfully
        
        return true;
      } else {
        console.warn('Failed to load config:', response.status, response.statusText);
        this.hasValidConfig = false;
        

        
        return false;
      }
    } catch (error) {
      console.error('Error loading info panels config:', error);
      this.hasValidConfig = false;
      

      
      return false;
    }
  }

  /**
   * Save configuration to server
   */
  public async saveConfig(): Promise<boolean> {
    // For now, just log the config that would be saved
    // In a real implementation, this would send to a server endpoint
    console.log('Would save config:', JSON.stringify(this.config, null, 2));
    
    if (this.onConfigChange) {
      this.onConfigChange(this.config);
    }
    
    return true;
  }

  /**
   * Clear all panels
   */
  private clearAllPanels(): void {
    for (const panel of this.panels.values()) {
      panel.dispose();
    }
    this.panels.clear();
  }

  /**
   * Create management UI panel
   */
  public createManagementPanel(): BUI.TemplateResult {
    console.log('🎨 Creating management panel - hasValidConfig:', this.hasValidConfig, 'panels count:', this.panels.size);
    
    if (!this.hasValidConfig) {
      return BUI.html`
        <bim-panel-section label="Information Panels" icon="material-symbols:info">
          <div style="padding: 12px; text-align: center; color: #666;">
            <div style="margin-bottom: 8px;">No info panels configuration found.</div>
            <div style="font-size: 12px;">Place a config file at: /server/info-panels-config.json</div>
            <div style="font-size: 10px; margin-top: 8px; color: #888;">Debug: hasValidConfig = ${this.hasValidConfig}</div>
          </div>
        </bim-panel-section>
      `;
    }

    return BUI.html`
      <bim-panel-section label="Information Panels" icon="material-symbols:info">
        <div style="padding: 12px;">
          <div style="margin-bottom: 16px;">
            <bim-button 
              @click=${() => this.toggleEditMode()}
              label="${this.isEditMode ? 'Save & Exit Edit Mode' : 'Edit Panels'}"
              icon="${this.isEditMode ? 'material-symbols:save' : 'material-symbols:edit'}"
              style="width: 100%;"
            >
              ${this.isEditMode ? 'Save & Exit Edit Mode' : 'Edit Panels'}
            </bim-button>
          </div>
          
          <div style="margin-bottom: 16px;">
            <bim-button 
              @click=${() => this.createSamplePanel()}
              label="Add Sample Panel"
              icon="material-symbols:add"
              style="width: 100%;"
            >
              Add Sample Panel
            </bim-button>
          </div>
          
          <div style="font-size: 12px; color: #666; margin-top: 8px;">
            ${this.panels.size} panel(s) active
            ${this.isEditMode ? ' • Drag red spheres to reposition' : ''}
          </div>
          
          <div style="margin-top: 12px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px;">Active Panels:</h4>
            ${Array.from(this.panels.values()).map(panel => BUI.html`
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee;">
                <span style="font-size: 12px;">${panel.data.name}</span>
                <bim-button 
                  @click=${() => this.removePanel(panel.id)}
                  icon="material-symbols:delete"
                  style="padding: 2px 4px; font-size: 10px;"
                >
                  Remove
                </bim-button>
              </div>
            `)}
          </div>
        </div>
      </bim-panel-section>
    `;
  }

  /**
   * Create a sample panel for testing
   */
  private createSamplePanel(): void {
    const sampleData: InfoPanelData = {
      id: `sample-${Date.now()}`,
      name: `Sample Panel ${this.panels.size + 1}`,
      position: {
        x: Math.random() * 10 - 5,
        y: Math.random() * 10 - 5,
        z: 2.5
      },
      content: {
        zone: `Sample Zone ${this.panels.size + 1}`,
        temperature: Math.round((18 + Math.random() * 6) * 10) / 10,
        humidity: Math.round((40 + Math.random() * 20))
      },
      visible: true,
      created: new Date(),
      modified: new Date()
    };
    
    this.addPanel(sampleData);
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Stop animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    // Clear all panels
    this.clearAllPanels();
    
    // UI cleanup complete
    
    console.log('InfoPanelsManager disposed');
  }
}