# BIM Model Viewer Features

Comprehensive 3D model viewing and analysis capabilities for IFC files.

## Overview

The BIM Viewer provides professional-grade 3D model visualization using ThatOpen Components, optimized for bridge infrastructure and building models.

## Core Features

### 🏗️ Model Loading & Streaming
- **IFC Format Support**: Native IFC 2x3 and IFC 4 support
- **Streaming Architecture**: Load large models progressively
- **Memory Optimization**: Efficient handling of complex geometries
- **Multiple Models**: Support for multiple simultaneous models

### 🎨 3D Visualization
- **High-Quality Rendering**: Advanced WebGL-based rendering
- **Material Support**: PBR materials with textures
- **Lighting System**: Realistic lighting and shadows
- **Performance Optimization**: LOD and frustum culling

### 📐 Measurement Tools
- **Distance Measurement**: Point-to-point measurements
- **Area Calculation**: Surface area measurement
- **Volume Analysis**: 3D volume calculations
- **Angle Measurement**: Angular measurements between elements

### 🔍 Element Analysis
- **Property Inspection**: View IFC properties and attributes
- **Element Selection**: Click-to-select model elements
- **Hierarchical Structure**: Navigate model tree structure
- **Search Functionality**: Find elements by name or property

## Model Loading

### Supported Formats
- **IFC Files**: `.ifc` (primary format)
- **Compressed IFC**: `.ifczip`
- **Large Models**: Files up to 500MB+

### Loading Methods

#### Local File Upload
```typescript
// File upload interface
const handleFileUpload = async (file: File) => {
  if (file.name.endsWith('.ifc')) {
    await viewer.loadModel(file);
  }
};
```

#### API Streaming
```typescript
// Stream from API endpoint
const loadModelFromAPI = async () => {
  const response = await fetch('/ws/node/api/streamIfc');
  const modelData = await response.arrayBuffer();
  await viewer.loadModel(modelData);
};
```

#### Pre-configured Models
- Default model loaded from `server/ifc-files/bim.ifc`
- Configurable model library
- Automatic model detection

### Loading Performance

| Model Size | Load Time | Memory Usage |
|------------|-----------|--------------|
| < 10MB | 2-5 seconds | 50-100MB |
| 10-50MB | 5-15 seconds | 100-300MB |
| 50-200MB | 15-45 seconds | 300-800MB |
| > 200MB | 45+ seconds | 800MB+ |

## 3D Visualization Features

### Rendering Capabilities
- **Real-time 3D**: 60 FPS rendering on modern hardware
- **Anti-aliasing**: MSAA for smooth edges
- **Transparency**: Alpha blending for glass and transparent materials
- **Shadows**: Real-time shadow mapping
- **Reflections**: Screen-space reflections for metallic surfaces

### Visual Modes

#### Standard Rendering
```typescript
viewer.setRenderMode('standard');
```
- Full materials and lighting
- Highest visual quality
- Best for presentations

#### Wireframe Mode
```typescript
viewer.setRenderMode('wireframe');
```
- Show model structure
- Performance optimized
- Technical analysis

#### X-Ray Mode
```typescript
viewer.setRenderMode('xray');
```
- See through walls
- Internal structure visible
- Useful for MEP systems

### Lighting System
- **Ambient Lighting**: Overall scene illumination
- **Directional Light**: Sun simulation
- **Point Lights**: Local light sources
- **HDRI Environment**: Realistic environment lighting

## Element Interaction

### Selection System
- **Click Selection**: Single-click to select elements
- **Multi-Selection**: Ctrl+Click for multiple elements
- **Box Selection**: Drag to select area
- **Hierarchy Selection**: Select entire assemblies

### Property Panel
```typescript
interface ElementProperties {
  globalId: string;
  name: string;
  type: string;
  material: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  customProperties: Record<string, any>;
}
```

### Element Highlighting
- **Hover Effects**: Visual feedback on mouse over
- **Selection Outline**: Clear selection indication
- **Color Coding**: Custom element coloring
- **Transparency Control**: Show/hide elements

## Measurement Tools

### Distance Measurement
1. **Activate Tool**: Click measurement button
2. **First Point**: Click on model element
3. **Second Point**: Click destination
4. **Result**: Distance displayed in real-time

```typescript
const measureDistance = (point1: Vector3, point2: Vector3) => {
  const distance = point1.distanceTo(point2);
  return {
    distance,
    units: 'meters',
    formatted: `${distance.toFixed(2)} m`
  };
};
```

### Area Measurement
- **Planar Surfaces**: Calculate surface areas
- **Complex Shapes**: Polygon-based area calculation
- **Unit Conversion**: Multiple measurement units

### Advanced Measurements
- **Volume Calculation**: 3D volume of selected elements
- **Angular Measurements**: Angles between surfaces
- **Coordinate Display**: Show exact 3D coordinates

## Navigation Features

### Standard Navigation
- **Orbit**: Rotate around model center
- **Pan**: Move view laterally
- **Zoom**: Zoom in/out on model
- **Fit to View**: Auto-fit model to screen

### Advanced Navigation
- **Walk Mode**: First-person navigation
- **Fly Mode**: Free camera movement
- **Sectioning**: Cut through model with planes
- **Saved Views**: Store and recall camera positions

## Model Tree & Hierarchy

### Hierarchical Structure
```
Project
├── Site
│   ├── Building
│   │   ├── Storey 1
│   │   │   ├── Walls
│   │   │   ├── Floors
│   │   │   └── Doors
│   │   └── Storey 2
│   └── External Works
```

### Tree Operations
- **Expand/Collapse**: Navigate model hierarchy
- **Visibility Control**: Show/hide elements
- **Selection Sync**: Tree selection updates 3D view
- **Search**: Find elements in tree

## Performance Features

### Optimization Techniques
- **Level of Detail (LOD)**: Reduce geometry complexity at distance
- **Frustum Culling**: Only render visible objects
- **Occlusion Culling**: Hide objects behind others
- **Instance Rendering**: Efficient repeated elements

### Memory Management
- **Progressive Loading**: Load model in chunks
- **Texture Streaming**: Load textures on demand
- **Garbage Collection**: Automatic memory cleanup
- **Cache Management**: Smart caching of model data

### Performance Monitoring
```typescript
interface PerformanceMetrics {
  fps: number;
  drawCalls: number;
  triangles: number;
  memoryUsage: number;
  loadTime: number;
}
```

## Data Integration

### IFC Property Access
```typescript
// Access IFC properties
const getElementProperties = (elementId: string) => {
  const element = model.getElement(elementId);
  return {
    ifcType: element.type,
    properties: element.properties,
    materials: element.materials,
    geometry: element.geometry
  };
};
```

### Custom Data Integration
- **External Databases**: Link to external data sources
- **IoT Sensors**: Real-time sensor data overlay
- **Maintenance Records**: Associate maintenance data
- **Document Links**: Attach related documents

## Export & Sharing

### Export Options
- **Screenshots**: High-resolution image export
- **3D Scenes**: Export viewer state
- **Measurements**: Export measurement data
- **Reports**: Generate property reports

### Sharing Features
- **Permalink URLs**: Share specific views
- **Embedded Views**: Embed viewer in other applications
- **Collaboration**: Multi-user viewing sessions

## Configuration & Customization

### Viewer Settings
```typescript
interface ViewerConfig {
  // Rendering settings
  antialias: boolean;
  shadows: boolean;
  reflections: boolean;
  
  // Performance settings
  maxMemory: number;
  lodEnabled: boolean;
  cullingEnabled: boolean;
  
  // UI settings
  showGrid: boolean;
  showAxes: boolean;
  showStats: boolean;
}
```

### Theme Customization
- **Color Schemes**: Light/dark themes
- **UI Layout**: Customizable interface
- **Toolbar Configuration**: Show/hide tools
- **Measurement Units**: Metric/Imperial units

## API Integration

### REST Endpoints
```typescript
// Model management API
GET    /ws/node/api/streamIfc          // Load model
GET    /ws/node/api/getInfoPanelsConfig // Get UI config
POST   /ws/node/api/updateInfoPanel    // Update config
GET    /ws/node/api/getAllDatapoints   // Get data points
```

### WebSocket Support
- **Real-time Updates**: Live model updates
- **Collaborative Viewing**: Multiple users
- **Data Streaming**: Continuous data feeds

## Browser Compatibility

### Supported Browsers
| Browser | Version | Performance | Notes |
|---------|---------|-------------|-------|
| Chrome | 90+ | ⭐⭐⭐⭐⭐ | Recommended |
| Firefox | 85+ | ⭐⭐⭐⭐ | Good performance |
| Safari | 14+ | ⭐⭐⭐ | WebGL limitations |
| Edge | 90+ | ⭐⭐⭐⭐⭐ | Excellent support |

### Hardware Requirements
- **GPU**: Dedicated graphics card recommended
- **RAM**: Minimum 4GB, 8GB+ for large models
- **CPU**: Modern multi-core processor
- **Storage**: 100MB+ available space

## Troubleshooting

### Common Issues

#### Model Won't Load
- **Check File Format**: Ensure valid IFC file
- **File Size**: Large files may need more time
- **Browser Memory**: Close other tabs
- **Network**: Check API connectivity

#### Poor Performance
- **Reduce Quality**: Lower rendering settings
- **Close Applications**: Free system resources
- **Update Drivers**: Ensure latest graphics drivers
- **Clear Cache**: Browser cache cleanup

#### Display Issues
- **WebGL Support**: Check browser WebGL status
- **Hardware Acceleration**: Enable in browser settings
- **Color Profiles**: Check monitor color settings

This BIM viewer provides comprehensive model visualization and analysis capabilities suitable for professional AEC workflows.