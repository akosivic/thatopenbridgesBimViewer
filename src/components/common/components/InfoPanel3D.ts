import * as THREE from "three";
import { InfoPanelData } from "../types/InfoPanelTypes";

export class InfoPanel3D {
  private static panelId = 0;
  
  public id: string;
  public data: InfoPanelData;
  public group: THREE.Group;
  public htmlElement!: HTMLElement;
  public isEditable: boolean = false;
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private dragOffset: THREE.Vector3;
  private scene: THREE.Scene;
  private onPositionChange?: (panel: InfoPanel3D) => void;

  constructor(
    data: InfoPanelData,
    scene: THREE.Scene,
    _camera: THREE.Camera,
    onPositionChange?: (panel: InfoPanel3D) => void
  ) {
    this.id = data.id || `info-panel-${InfoPanel3D.panelId++}`;
    this.data = { ...data };
    this.scene = scene;
    this.onPositionChange = onPositionChange;
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragOffset = new THREE.Vector3();
    
    this.group = new THREE.Group();
    this.group.name = `InfoPanel-${this.id}`;
    
    this.createPanelVisuals();
    this.createHTMLElement();
    this.updatePosition();
    
    // Add to scene
    scene.add(this.group);
  }

  private createPanelVisuals() {
    // Create a connector line from ground to panel
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 2, 0)
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00aaff, 
      transparent: true, 
      opacity: 0.6 
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.name = "connector-line";
    this.group.add(line);

    // Create a point indicator at ground level
    const pointGeometry = new THREE.CircleGeometry(0.1, 16);
    const pointMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00aaff, 
      transparent: true, 
      opacity: 0.8 
    });
    const point = new THREE.Mesh(pointGeometry, pointMaterial);
    point.rotation.x = -Math.PI / 2; // Lay flat on ground
    point.name = "ground-point";
    this.group.add(point);

    // Create interaction sphere for dragging (invisible in non-edit mode)
    const sphereGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff4444, 
      transparent: true, 
      opacity: 0.3,
      visible: false
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0, 2, 0);
    sphere.name = "drag-handle";
    sphere.userData = { panelId: this.id, isDragHandle: true };
    this.group.add(sphere);
  }

  private createHTMLElement() {
    // Create container for both icon and panel
    this.htmlElement = document.createElement('div');
    this.htmlElement.className = 'info-panel-3d-container';
    this.htmlElement.style.cssText = `
      position: absolute;
      transform: translate(-50%, -100%);
      z-index: 1000;
      pointer-events: auto;
    `;
    
    this.createIconAndPanel();
    document.body.appendChild(this.htmlElement);
  }

  private createIconAndPanel() {
    // Create the blue circular (!) icon that's always visible
    const iconElement = document.createElement('div');
    iconElement.className = 'info-panel-icon';
    iconElement.style.cssText = `
      width: 32px;
      height: 32px;
      background: #0078B4;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 18px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      margin: 0 auto 8px auto;
      transition: all 0.2s ease;
    `;
    iconElement.innerHTML = '!';
    iconElement.title = 'Click to show/hide panel information';

    // Create the expandable panel (hidden by default)
    const panelElement = document.createElement('div');
    panelElement.className = 'info-panel-content';
    panelElement.style.cssText = `
      background: rgba(0, 120, 180, 0.95);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      min-width: 160px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
      display: none;
      position: relative;
    `;

    // Add click handler to toggle panel
    let isPanelVisible = false;
    iconElement.addEventListener('click', (e) => {
      e.stopPropagation();
      isPanelVisible = !isPanelVisible;
      panelElement.style.display = isPanelVisible ? 'block' : 'none';
      
      // Update icon appearance
      iconElement.style.background = isPanelVisible ? '#005a9e' : '#0078B4';
    });

    this.htmlElement.appendChild(iconElement);
    this.htmlElement.appendChild(panelElement);
    
    // Store references for later updates
    (this.htmlElement as any).iconElement = iconElement;
    (this.htmlElement as any).panelElement = panelElement;
    
    this.updateHTMLContent();
  }

  private updateHTMLContent() {
    const { zone, temperature, humidity } = this.data.content;
    const panelElement = (this.htmlElement as any).panelElement;
    
    if (panelElement) {
      panelElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-size: 16px; font-weight: bold;">${zone || 'Zone'}</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${this.isEditable ? '<span style="font-size: 14px; cursor: move;">⚙️</span>' : ''}
            <span style="font-size: 18px; cursor: pointer; line-height: 1;" onclick="this.parentElement.parentElement.parentElement.style.display='none'">×</span>
          </div>
        </div>
        ${temperature !== undefined ? `
          <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
            <strong>Temperature</strong> 
            <span>${temperature}°C</span>
          </div>
        ` : ''}
        ${humidity !== undefined ? `
          <div style="display: flex; justify-content: space-between;">
            <strong>Humidity</strong> 
            <span>${humidity}%</span>
          </div>
        ` : ''}
      `;
    }
  }

  public updatePosition() {
    this.group.position.set(
      this.data.position.x,
      0, // Group stays at ground level
      this.data.position.z
    );
  }

  public updateHTMLPosition(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    const panelWorldPosition = new THREE.Vector3(
      this.data.position.x,
      this.data.position.y,
      this.data.position.z
    );

    // Project 3D position to 2D screen coordinates
    const screenPosition = panelWorldPosition.clone().project(camera);
    
    // Convert normalized device coordinates to screen pixels
    const canvas = renderer.domElement;
    const x = (screenPosition.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (screenPosition.y * -0.5 + 0.5) * canvas.clientHeight;
    
    // Update HTML element position
    this.htmlElement.style.left = `${x}px`;
    this.htmlElement.style.top = `${y}px`;
    
    // Hide if behind camera or too far, but only hide the icon
    const distance = camera.position.distanceTo(panelWorldPosition);
    const isVisible = screenPosition.z < 1 && distance < 100 && this.data.visible;
    
    const iconElement = (this.htmlElement as any).iconElement;
    if (iconElement) {
      iconElement.style.display = isVisible ? 'flex' : 'none';
    }
  }

  public setEditMode(enabled: boolean) {
    this.isEditable = enabled;
    const dragHandle = this.group.getObjectByName("drag-handle") as THREE.Mesh;
    if (dragHandle && dragHandle.material) {
      if (Array.isArray(dragHandle.material)) {
        dragHandle.material.forEach(mat => mat.visible = enabled);
      } else {
        (dragHandle.material as THREE.MeshBasicMaterial).visible = enabled;
      }
    }
    
    // Update HTML content to show/hide edit controls
    this.updateHTMLContent();
    
    // Update icon styling for edit mode
    const iconElement = (this.htmlElement as any).iconElement;
    if (iconElement) {
      if (enabled) {
        iconElement.style.border = "2px solid #ffaa00";
        iconElement.style.cursor = "move";
      } else {
        iconElement.style.border = "none";
        iconElement.style.cursor = "pointer";
      }
    }
  }

  public onMouseDown(event: MouseEvent, camera: THREE.Camera) {
    if (!this.isEditable) return false;
    
    // Convert mouse position to normalized device coordinates
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Check if we clicked on the drag handle
    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObject(this.group.getObjectByName("drag-handle")!);
    
    if (intersects.length > 0) {
      this.isDragging = true;
      
      // Calculate offset from panel position to intersection point
      const intersectPoint = intersects[0].point;
      this.dragOffset.copy(intersectPoint).sub(this.group.position);
      
      return true; // Event handled
    }
    
    return false;
  }

  public onMouseMove(event: MouseEvent, camera: THREE.Camera) {
    if (!this.isDragging || !this.isEditable) return;
    
    // Convert mouse position to world coordinates on the ground plane
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, camera);
    
    // Create a ground plane for intersection
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    
    if (this.raycaster.ray.intersectPlane(groundPlane, intersectPoint)) {
      // Update position, accounting for drag offset
      const newPosition = intersectPoint.sub(this.dragOffset);
      
      this.data.position.x = newPosition.x;
      this.data.position.z = newPosition.z;
      this.data.modified = new Date();
      
      this.updatePosition();
      
      // Notify of position change
      if (this.onPositionChange) {
        this.onPositionChange(this);
      }
    }
  }

  public onMouseUp() {
    this.isDragging = false;
  }

  public updateContent(newContent: Partial<InfoPanelData['content']>) {
    this.data.content = { ...this.data.content, ...newContent };
    this.data.modified = new Date();
    this.updateHTMLContent();
  }

  public setVisible(visible: boolean) {
    this.data.visible = visible;
    this.group.visible = visible;
    // Only hide the icon, keep the structure
    const iconElement = (this.htmlElement as any).iconElement;
    if (iconElement) {
      iconElement.style.display = visible ? 'flex' : 'none';
    }
  }

  public dispose() {
    // Remove from scene
    this.scene.remove(this.group);
    
    // Clean up geometries and materials
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
    
    // Remove HTML element
    if (this.htmlElement && this.htmlElement.parentNode) {
      this.htmlElement.parentNode.removeChild(this.htmlElement);
    }
  }
}