import * as THREE from 'three';
import { debugLog, debugError } from "../../../../utils/debugLogger";

export interface WarningConfig {
  id: string;
  position: THREE.Vector3;
  title: string;
  temperature: string;
  humidity: string;
  isVisible: boolean;
  isConfigMode: boolean;
}

export interface WarningData {
  warnings: WarningConfig[];
  version: string;
}

export class FloatingWarningPanel {
  private static CONFIG_FILE = 'warning-config.json';
  private warnings: Map<string, WarningConfig> = new Map();
  private camera: THREE.Camera | null = null;
  private container: HTMLElement | null = null;
  private configMode: boolean = false;

  constructor(container: HTMLElement, camera: THREE.Camera) {
    debugLog('FloatingWarningPanel constructor called with container:', container, 'camera:', camera);
    this.container = container;
    this.camera = camera;
    this.loadConfiguration();
    this.createWarningPanels();
    debugLog('FloatingWarningPanel initialized with', this.warnings.size, 'warnings');
  }

  /**
   * Load configuration from localStorage or create default
   * Cross-platform solution using localStorage (works on Linux and Windows)
   */
  private loadConfiguration(): void {
    try {
      const savedConfig = localStorage.getItem(FloatingWarningPanel.CONFIG_FILE);
      if (savedConfig) {
        const data: WarningData = JSON.parse(savedConfig);
        data.warnings.forEach(warning => {
          // Convert plain object back to Vector3
          warning.position = new THREE.Vector3(
            warning.position.x,
            warning.position.y,
            warning.position.z
          );
          this.warnings.set(warning.id, warning);
        });
      } else {
        // Create default warning
        this.createDefaultWarning();
      }
    } catch (error) {
      debugError('Error loading warning configuration:', error);
      this.createDefaultWarning();
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfiguration(): void {
    try {
      const data: WarningData = {
        version: '1.0.0',
        warnings: Array.from(this.warnings.values())
      };
      localStorage.setItem(FloatingWarningPanel.CONFIG_FILE, JSON.stringify(data, null, 2));
      debugLog('Warning configuration saved');
    } catch (error) {
      debugError('Error saving warning configuration:', error);
    }
  }

  /**
   * Create a default warning configuration
   */
  private createDefaultWarning(): void {
    // Load sample configuration instead of single default warning
    this.loadSampleConfiguration();
  }

  /**
   * Load sample configuration with multiple realistic warnings
   */
  public loadSampleConfiguration(): void {
    const sampleWarnings: WarningConfig[] = [
      {
        id: 'warning-1',
        position: new THREE.Vector3(0, 2.0, -5.0),
        title: 'HVAC Zone A',
        temperature: '23.5°C',
        humidity: '45%',
        isVisible: true,
        isConfigMode: false
      },
      {
        id: 'warning-2',
        position: new THREE.Vector3(2.0, 1.8, -3.0),
        title: 'Server Room',
        temperature: '18.2°C',
        humidity: '38%',
        isVisible: true,
        isConfigMode: false
      },
      {
        id: 'warning-3',
        position: new THREE.Vector3(-2.0, 2.5, -4.0),
        title: 'Conference Room',
        temperature: '22.1°C',
        humidity: '52%',
        isVisible: true,
        isConfigMode: false
      }
    ];

    // Clear existing warnings
    this.warnings.clear();

    // Add sample warnings
    sampleWarnings.forEach(warning => {
      this.warnings.set(warning.id, warning);
    });

    // Save the sample configuration
    this.saveConfiguration();
    
    debugLog('Sample configuration loaded with', sampleWarnings.length, 'warnings');
  }

  /**
   * Create warning panel HTML elements
   */
  private createWarningPanels(): void {
    if (!this.container) return;

    this.warnings.forEach((warning) => {
      this.createWarningElement(warning);
    });

    // Start the update loop
    this.updatePositions();
  }

  /**
   * Create individual warning element
   */
  private createWarningElement(warning: WarningConfig): HTMLElement {
    const warningElement = document.createElement('div');
    warningElement.id = `floating-warning-${warning.id}`;
    warningElement.className = 'floating-warning-panel';
    warningElement.style.cssText = `
      position: absolute;
      z-index: 1000;
      pointer-events: auto;
      user-select: none;
      transition: opacity 0.3s ease;
    `;

    this.updateWarningContent(warningElement, warning);
    
    if (this.container) {
      this.container.appendChild(warningElement);
    }

    return warningElement;
  }

  /**
   * Update warning element content
   */
  private updateWarningContent(element: HTMLElement, warning: WarningConfig): void {
    element.innerHTML = `
      <div style="position: relative;">
        <!-- Warning Icon -->
        <div class="warning-icon" style="
          position: absolute;
          left: -20px;
          top: -20px;
          width: 40px;
          height: 40px;
          background: #ff6b35;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 20px;
          box-shadow: 0 2px 10px rgba(255, 107, 53, 0.4);
          cursor: pointer;
          border: 2px solid white;
        ">!</div>
        
        <!-- Info Panel -->
        <div class="info-panel" style="
          background: #2c5aa0;
          color: white;
          border-radius: 8px;
          padding: 12px 16px;
          min-width: 120px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          font-family: Arial, sans-serif;
          font-size: 12px;
          margin-left: 25px;
          display: none;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: bold; font-size: 14px;">${warning.title}</span>
            <div class="control-buttons" style="display: ${this.configMode ? 'flex' : 'none'}; gap: 4px;">
              <button class="config-btn" style="
                background: #4a90e2;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                padding: 2px 6px;
                font-size: 10px;
              ">⚙️</button>
              <button class="close-btn" style="
                background: #e74c3c;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                padding: 2px 6px;
                font-size: 10px;
              ">×</button>
            </div>
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Temperature:</strong> ${warning.temperature}
          </div>
          <div>
            <strong>Humidity:</strong> ${warning.humidity}
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    this.addWarningEventListeners(element, warning);
  }

  /**
   * Add event listeners to warning elements
   */
  private addWarningEventListeners(element: HTMLElement, warning: WarningConfig): void {
    const icon = element.querySelector('.warning-icon') as HTMLElement;
    const panel = element.querySelector('.info-panel') as HTMLElement;
    const configBtn = element.querySelector('.config-btn') as HTMLElement;
    const closeBtn = element.querySelector('.close-btn') as HTMLElement;

    // Show/hide panel on icon click
    icon?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = panel.style.display !== 'none';
      panel.style.display = isVisible ? 'none' : 'block';
    });

    // Config button click
    configBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openConfigDialog(warning);
    });

    // Close button click
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeWarning(warning.id);
    });

    // Make draggable in config mode
    if (this.configMode) {
      this.makeDraggable(element, warning);
    }
  }

  /**
   * Make element draggable to change 3D position
   */
  private makeDraggable(element: HTMLElement, warning: WarningConfig): void {
    let isDragging = false;
    let startPos = { x: 0, y: 0 };

    element.addEventListener('mousedown', (e) => {
      if (!this.configMode) return;
      isDragging = true;
      startPos.x = e.clientX;
      startPos.y = e.clientY;
      element.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !this.camera) return;

      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;

      // Convert screen delta to world space movement
      const vector = new THREE.Vector3(deltaX * 0.01, -deltaY * 0.01, 0);
      vector.applyQuaternion(this.camera.quaternion);
      
      warning.position.add(vector);
      
      startPos.x = e.clientX;
      startPos.y = e.clientY;
      
      this.saveConfiguration();
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      element.style.cursor = 'pointer';
    });
  }

  /**
   * Open configuration dialog
   */
  private openConfigDialog(warning: WarningConfig): void {
    const dialog = document.createElement('div');
    dialog.className = 'warning-config-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-family: Arial, sans-serif;
      min-width: 300px;
    `;

    dialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #333;">Configure Warning</h3>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Title:</label>
        <input type="text" id="warning-title" value="${warning.title}" style="
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        ">
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Temperature:</label>
        <input type="text" id="warning-temperature" value="${warning.temperature}" style="
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        ">
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Humidity:</label>
        <input type="text" id="warning-humidity" value="${warning.humidity}" style="
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        ">
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 4px; font-weight: bold;">Position:</label>
        <div style="display: flex; gap: 8px;">
          <input type="number" id="pos-x" value="${warning.position.x.toFixed(2)}" step="0.1" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          <input type="number" id="pos-y" value="${warning.position.y.toFixed(2)}" step="0.1" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          <input type="number" id="pos-z" value="${warning.position.z.toFixed(2)}" step="0.1" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="cancel-btn" style="
          padding: 8px 16px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
        ">Cancel</button>
        <button id="save-btn" style="
          padding: 8px 16px;
          border: none;
          background: #4a90e2;
          color: white;
          border-radius: 4px;
          cursor: pointer;
        ">Save</button>
      </div>
    `;

    document.body.appendChild(dialog);

    // Event listeners
    const saveBtn = dialog.querySelector('#save-btn') as HTMLElement;
    const cancelBtn = dialog.querySelector('#cancel-btn') as HTMLElement;

    saveBtn.addEventListener('click', () => {
      const title = (dialog.querySelector('#warning-title') as HTMLInputElement).value;
      const temperature = (dialog.querySelector('#warning-temperature') as HTMLInputElement).value;
      const humidity = (dialog.querySelector('#warning-humidity') as HTMLInputElement).value;
      const posX = parseFloat((dialog.querySelector('#pos-x') as HTMLInputElement).value);
      const posY = parseFloat((dialog.querySelector('#pos-y') as HTMLInputElement).value);
      const posZ = parseFloat((dialog.querySelector('#pos-z') as HTMLInputElement).value);

      warning.title = title;
      warning.temperature = temperature;
      warning.humidity = humidity;
      warning.position.set(posX, posY, posZ);

      this.saveConfiguration();
      this.updateWarningDisplay(warning);
      document.body.removeChild(dialog);
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  }

  /**
   * Update warning display after configuration change
   */
  private updateWarningDisplay(warning: WarningConfig): void {
    const element = document.getElementById(`floating-warning-${warning.id}`);
    if (element) {
      this.updateWarningContent(element, warning);
    }
  }

  /**
   * Update 3D to 2D position mapping
   */
  private updatePositions(): void {
    if (!this.camera || !this.container) {
      requestAnimationFrame(() => this.updatePositions());
      return;
    }

    const containerRect = this.container.getBoundingClientRect();

    this.warnings.forEach((warning, id) => {
      if (!warning.isVisible) return;

      const element = document.getElementById(`floating-warning-${id}`);
      if (!element) return;

      // Project 3D position to screen coordinates
      const vector = warning.position.clone();
      if (this.camera) {
        vector.project(this.camera);
      }

      // Convert to screen coordinates
      const x = (vector.x * 0.5 + 0.5) * containerRect.width;
      const y = (-vector.y * 0.5 + 0.5) * containerRect.height;

      // Check if position is in front of camera (z < 1)
      const isVisible = vector.z < 1;

      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.opacity = isVisible ? '1' : '0';
      element.style.pointerEvents = isVisible ? 'auto' : 'none';
    });

    requestAnimationFrame(() => this.updatePositions());
  }

  /**
   * Toggle configuration mode
   */
  public toggleConfigMode(): void {
    this.configMode = !this.configMode;
    
    // Update all warning elements to show/hide config controls
    this.warnings.forEach((warning) => {
      const element = document.getElementById(`floating-warning-${warning.id}`);
      if (element) {
        const controlButtons = element.querySelector('.control-buttons') as HTMLElement;
        if (controlButtons) {
          controlButtons.style.display = this.configMode ? 'flex' : 'none';
        }
        
        if (this.configMode) {
          this.makeDraggable(element, warning);
        }
      }
    });

    debugLog('Configuration mode:', this.configMode ? 'ON' : 'OFF');
  }

  /**
   * Add new warning
   */
  public addWarning(position?: THREE.Vector3): string {
    const id = `warning-${Date.now()}`;
    const warning: WarningConfig = {
      id,
      position: position || new THREE.Vector3(0, 2, 0),
      title: 'New Zone',
      temperature: 'XX.X°C',
      humidity: 'XX%',
      isVisible: true,
      isConfigMode: false
    };

    this.warnings.set(id, warning);
    this.createWarningElement(warning);
    this.saveConfiguration();
    
    return id;
  }

  /**
   * Remove warning
   */
  public removeWarning(id: string): void {
    const element = document.getElementById(`floating-warning-${id}`);
    if (element) {
      element.remove();
    }
    this.warnings.delete(id);
    this.saveConfiguration();
  }

  /**
   * Get all warnings
   */
  public getWarnings(): WarningConfig[] {
    return Array.from(this.warnings.values());
  }

  /**
   * Reset to sample configuration (can be called from toolbar)
   */
  public resetToSampleConfiguration(): void {
    // Remove existing warning elements from DOM
    this.warnings.forEach((_, id) => {
      const element = document.getElementById(`floating-warning-${id}`);
      if (element) {
        element.remove();
      }
    });

    // Load sample configuration
    this.loadSampleConfiguration();

    // Recreate warning elements
    this.warnings.forEach((warning) => {
      this.createWarningElement(warning);
    });

    debugLog('Configuration reset to sample data');
  }

  /**
   * Set update callback
   */
  public onUpdate(callback: () => void): void {
    // Reserved for future use
    debugLog('Update callback set:', callback);
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.warnings.forEach((_, id) => {
      const element = document.getElementById(`floating-warning-${id}`);
      if (element) {
        element.remove();
      }
    });
    this.warnings.clear();
  }
}

