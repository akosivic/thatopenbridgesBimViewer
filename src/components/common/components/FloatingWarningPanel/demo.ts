import { FloatingWarningPanel } from './FloatingWarningPanel';
import * as THREE from 'three';

/**
 * Demo/Test utility for the FloatingWarningPanel
 */
export class FloatingWarningPanelDemo {
  private warningPanel!: FloatingWarningPanel;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    
    this.setupDemo();
  }

  private setupDemo(): void {
    // Create a simple scene
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Add some basic geometry to the scene
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);

    // Position camera
    this.camera.position.z = 5;

    // Initialize warning panel
    this.warningPanel = new FloatingWarningPanel(document.body, this.camera);

    // Add some demo warnings
    this.addDemoWarnings();

    // Start render loop
    this.animate();
  }

  private addDemoWarnings(): void {
    // Demo warning 1 - near the cube
    this.warningPanel.addWarning(new THREE.Vector3(2, 1, 0));
    
    // Demo warning 2 - on the other side
    this.warningPanel.addWarning(new THREE.Vector3(-2, -1, 0));
    
    console.log('Demo warnings added. Total warnings:', this.warningPanel.getWarnings().length);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    // Rotate the cube for visual effect
    const cube = this.scene.children[0] as THREE.Mesh;
    if (cube) {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
    }

    this.renderer.render(this.scene, this.camera);
  };

  public toggleConfigMode(): void {
    this.warningPanel.toggleConfigMode();
  }

  public getWarningPanel(): FloatingWarningPanel {
    return this.warningPanel;
  }

  public cleanup(): void {
    this.warningPanel.destroy();
    document.body.removeChild(this.renderer.domElement);
  }
}

// Export for global access in browser console
(window as any).FloatingWarningPanelDemo = FloatingWarningPanelDemo;
