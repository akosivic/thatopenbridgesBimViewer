// Types for 3D Information Panels
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface InfoPanelData {
  id: string;
  name: string;
  position: Vector3;
  content: {
    zone?: string;
    temperature?: number;
    humidity?: number;
    [key: string]: any; // Allow flexible content
  };
  visible: boolean;
  created: Date;
  modified: Date;
}

export interface InfoPanelsConfig {
  version: string;
  panels: InfoPanelData[];
  editMode: boolean;
  settings: {
    panelScale: number;
    opacity: number;
    showConnectorLines: boolean;
  };
}

// Default configuration
export const defaultInfoPanelsConfig: InfoPanelsConfig = {
  version: "1.0.0",
  panels: [
    {
      id: "sample-panel-1",
      name: "Zone 1",
      position: { x: 0, y: 2, z: 0 },
      content: {
        zone: "Zone",
        temperature: 22.5,
        humidity: 45
      },
      visible: true,
      created: new Date(),
      modified: new Date()
    }
  ],
  editMode: false,
  settings: {
    panelScale: 1.0,
    opacity: 0.9,
    showConnectorLines: true
  }
};