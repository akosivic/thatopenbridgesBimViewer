/**
 * Coordinate system converter for BIM viewer
 * Handles conversion between different coordinate systems and units
 */

export interface RealWorldCoordinate {
  // N/E or X/Y coordinate system
  north?: number;  // N coordinate (maps to X in scene)
  east?: number;   // E coordinate (maps to Y in scene)
  x?: number;      // Direct X coordinate
  y?: number;      // Direct Y coordinate
  z: number;       // Height coordinate
  unit: 'mm' | 'm' | 'cm' | 'ft' | 'in';
}

export interface SceneCoordinate {
  x: number;  // Scene X coordinate (meters)
  y: number;  // Scene Y coordinate (meters) 
  z: number;  // Scene Z coordinate (meters)
}

export interface CoordinateSystemConfig {
  // Conversion factors to meters
  unitConversions: Record<string, number>;
  
  // Coordinate system transformations
  coordinateMapping: {
    // How to map real-world coordinates to scene coordinates
    northToX: boolean;  // true if North maps to X axis
    eastToY: boolean;   // true if East maps to Y axis
    flipX: boolean;     // true to flip X axis
    flipY: boolean;     // true to flip Y axis
  };
  
  // Origin offset for coordinate system alignment
  origin: {
    x: number;
    y: number; 
    z: number;
  };
}

export class CoordinateConverter {
  private config: CoordinateSystemConfig;

  constructor(config?: Partial<CoordinateSystemConfig>) {
    this.config = {
      unitConversions: {
        'mm': 0.001,
        'cm': 0.01,
        'm': 1.0,
        'ft': 0.3048,
        'in': 0.0254,
        ...config?.unitConversions
      },
      coordinateMapping: {
        northToX: true,
        eastToY: true,
        flipX: false,
        flipY: false,
        ...config?.coordinateMapping
      },
      origin: {
        x: 0,
        y: 0,
        z: 0,
        ...config?.origin
      }
    };
  }

  /**
   * Convert real-world coordinates to 3D scene coordinates
   */
  realWorldToScene(realWorld: RealWorldCoordinate): SceneCoordinate {
    const conversionFactor = this.config.unitConversions[realWorld.unit];
    
    if (!conversionFactor) {
      throw new Error(`Unsupported unit: ${realWorld.unit}`);
    }

    // Determine X coordinate
    let sceneX: number;
    if (realWorld.north !== undefined) {
      sceneX = realWorld.north * conversionFactor;
    } else if (realWorld.x !== undefined) {
      sceneX = realWorld.x * conversionFactor;
    } else {
      throw new Error('Missing X/North coordinate');
    }

    // Determine Y coordinate  
    let sceneY: number;
    if (realWorld.east !== undefined) {
      sceneY = realWorld.east * conversionFactor;
    } else if (realWorld.y !== undefined) {
      sceneY = realWorld.y * conversionFactor;
    } else {
      throw new Error('Missing Y/East coordinate');
    }

    // Convert Z coordinate
    const sceneZ = realWorld.z * conversionFactor;

    // Apply coordinate mapping transformations
    if (!this.config.coordinateMapping.northToX) {
      [sceneX, sceneY] = [sceneY, sceneX]; // Swap if needed
    }

    if (this.config.coordinateMapping.flipX) {
      sceneX = -sceneX;
    }

    if (this.config.coordinateMapping.flipY) {
      sceneY = -sceneY;
    }

    // Apply origin offset
    return {
      x: sceneX + this.config.origin.x,
      y: sceneY + this.config.origin.y,
      z: sceneZ + this.config.origin.z
    };
  }

  /**
   * Convert scene coordinates back to real-world coordinates
   */
  sceneToRealWorld(scene: SceneCoordinate, unit: RealWorldCoordinate['unit'] = 'm'): RealWorldCoordinate {
    const conversionFactor = this.config.unitConversions[unit];
    
    if (!conversionFactor) {
      throw new Error(`Unsupported unit: ${unit}`);
    }

    // Remove origin offset
    let x = scene.x - this.config.origin.x;
    let y = scene.y - this.config.origin.y;
    const z = scene.z - this.config.origin.z;

    // Reverse coordinate mapping transformations
    if (this.config.coordinateMapping.flipX) {
      x = -x;
    }

    if (this.config.coordinateMapping.flipY) {
      y = -y;
    }

    if (!this.config.coordinateMapping.northToX) {
      [x, y] = [y, x]; // Swap back if needed
    }

    // Convert back to specified unit
    return {
      north: x / conversionFactor,
      east: y / conversionFactor,
      z: z / conversionFactor,
      unit
    };
  }

  /**
   * Parse coordinate string like "x=N3614,y=E-13342,z=2500mm"
   */
  parseCoordinateString(coordStr: string): RealWorldCoordinate {
    const parts = coordStr.split(',').map(p => p.trim());
    const result: Partial<RealWorldCoordinate> = {};
    
    for (const part of parts) {
      const match = part.match(/([xyz])=([NE]?)(-?\d+(?:\.\d+)?)(mm|m|cm|ft|in)?/i);
      if (!match) continue;
      
      const [, axis, prefix, value, unit] = match;
      const numValue = parseFloat(value);
      
      if (axis.toLowerCase() === 'x') {
        if (prefix.toUpperCase() === 'N') {
          result.north = numValue;
        } else {
          result.x = numValue;
        }
      } else if (axis.toLowerCase() === 'y') {
        if (prefix.toUpperCase() === 'E') {
          result.east = numValue;
        } else {
          result.y = numValue;
        }
      } else if (axis.toLowerCase() === 'z') {
        result.z = numValue;
      }
      
      if (unit && !result.unit) {
        result.unit = unit as RealWorldCoordinate['unit'];
      }
    }
    
    // Default unit if not specified
    if (!result.unit) {
      result.unit = 'mm';
    }
    
    // Validate we have required coordinates
    if (result.z === undefined) {
      throw new Error('Missing Z coordinate');
    }
    
    if (result.north === undefined && result.x === undefined) {
      throw new Error('Missing X/North coordinate');
    }
    
    if (result.east === undefined && result.y === undefined) {
      throw new Error('Missing Y/East coordinate');
    }
    
    return result as RealWorldCoordinate;
  }

  /**
   * Format scene coordinates as a readable string
   */
  formatCoordinateString(scene: SceneCoordinate, unit: RealWorldCoordinate['unit'] = 'mm'): string {
    const realWorld = this.sceneToRealWorld(scene, unit);
    
    if (realWorld.north !== undefined && realWorld.east !== undefined) {
      return `x=N${realWorld.north},y=E${realWorld.east},z=${realWorld.z}${unit}`;
    } else {
      return `x=${realWorld.x || 0},y=${realWorld.y || 0},z=${realWorld.z}${unit}`;
    }
  }
}

// Default converter instance for the BIM viewer
export const defaultCoordinateConverter = new CoordinateConverter({
  coordinateMapping: {
    northToX: true,
    eastToY: true, 
    flipX: false,
    flipY: false
  },
  origin: {
    x: 0,
    y: 0,
    z: 0
  }
});