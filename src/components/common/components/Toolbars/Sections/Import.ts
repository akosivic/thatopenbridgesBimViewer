/* eslint-disable no-alert */
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import Zip from "jszip";
import { updateLoadingText } from "../../../utils/LoadingOverlay";
import i18n from "../../../utils/i18n";
import { debugLog, debugWarn, debugError } from "../../../../../utils/debugLogger";

// Check if File System Access API is supported
const isFileSystemAccessSupported = () => {
  return 'showDirectoryPicker' in window && 'getFileHandle' in (window as any).FileSystemDirectoryHandle?.prototype;
};

const input = document.createElement("input");
const askForFile = (extension: string) => {
  return new Promise<File | null>((resolve) => {
    input.type = "file";
    input.accept = extension;
    input.multiple = false;
    input.onchange = () => {
      const filesList = input.files;
      if (!(filesList && filesList[0])) {
        resolve(null);
        return;
      }
      const file = filesList[0];
      resolve(file);
    };
    input.click();
  });
};
// Function to fetch a file from a URL
const fetchFile = async (url: string): Promise<File> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }
  const blob = await response.blob();
  return new File([blob], url.substring(url.lastIndexOf('/') + 1), { type: blob.type });
};


export default (components: OBC.Components) => {
  const [loadBtn] = CUI.buttons.loadIfc({ components });
  loadBtn.label = i18n.t('ifc');
  loadBtn.tooltipTitle = i18n.t('loadIfc');
  loadBtn.tooltipText = i18n.t('loadIfcTooltip');

  const fragments = components.get(OBC.FragmentsManager);
  const indexer = components.get(OBC.IfcRelationsIndexer);

  const loadFragments = async () => {
    updateLoadingText('Loading Fragments...');
    try {
      updateLoadingText('Select fragment file...');
      const fragmentsZip = await askForFile(".zip");
      if (!fragmentsZip) {
        return;
      }
      updateLoadingText('Reading fragment file...');
      const zipBuffer = await fragmentsZip.arrayBuffer();
      const zip = new Zip();
      await zip.loadAsync(zipBuffer);
      const geometryBuffer = zip.file("geometry.frag");
      if (!geometryBuffer) {
        alert("No geometry found in the file!");
        return;
      }

      updateLoadingText('Extracting geometry data...');
      const geometry = await geometryBuffer.async("uint8array");

      let properties: FRAGS.IfcProperties | undefined;
      const propsFile = zip.file("properties.json");
      if (propsFile) {
        updateLoadingText('Loading properties...');
        const json = await propsFile.async("string");
        properties = JSON.parse(json);
      }

      let relationsMap: OBC.RelationsMap | undefined;
      const relationsMapFile = zip.file("relations-map.json");
      if (relationsMapFile) {
        updateLoadingText('Loading relations...');
        const json = await relationsMapFile.async("string");
        relationsMap = indexer.getRelationsMapFromJSON(json);
      }

      updateLoadingText('Rendering model...');
      await fragments.load(geometry, { properties, relationsMap });
    } catch (error) {
      debugError('Error loading fragments:', error);
      alert(`Failed to load fragments: ${error}`);
    }
  };

  const streamer = components.get(OBF.IfcStreamer) as OBF.IfcStreamer;

  // We are opening local files, so no cache use needed
  streamer.useCache = false;

  const streamedDirectories: { [name: string]: any } = {};

  const getStreamDirName = (name: string) => {
    return name.substring(0, name.indexOf(".ifc"));
  };

  streamer.fetch = async (path: string) => {
    try {
      const name = path.substring(path.lastIndexOf("/") + 1);
      const modelName = getStreamDirName(name);
      const directory = streamedDirectories[modelName];
      if (!directory) {
        throw new Error(`Directory not found for model: ${modelName}`);
      }
      const fileHandle = await directory.getFileHandle(name);
      return fileHandle.getFile();
    } catch (error) {
      debugError(`Error fetching file ${path}:`, error);
      throw error;
    }
  };

  FRAGS.FragmentsGroup.fetch = async (name: string) => {
    try {
      const modelName = getStreamDirName(name);
      const directory = streamedDirectories[modelName];
      if (!directory) {
        throw new Error(`Directory not found for model: ${modelName}`);
      }
      const fileHandle = await directory.getFileHandle(name);
      return fileHandle.getFile();
    } catch (error) {
      debugError(`Error fetching fragment ${name}:`, error);
      throw error;
    }
  };

  async function loadTiles() {
    updateLoadingText('Loading Tiles...');
    try {
      let currentDirectory: any | null = null;
      const directoryInitialized = false;

      try {
        // Check if File System Access API is supported
        if (!isFileSystemAccessSupported()) {
          debugWarn('File System Access API not supported in this browser');
          alert('File System Access API is not supported in this browser. Please use a modern browser like Chrome or Edge.');
          return;
        }

        updateLoadingText('Select tiles directory...');
        // @ts-ignore
        currentDirectory = await window.showDirectoryPicker();
      } catch (e) {
        debugError('Error opening directory picker:', e);
        return;
      }

      const geometryFilePattern = /-processed.json$/;
      const propertiesFilePattern = /-processed-properties.json$/;

      updateLoadingText('Scanning directory for tiles...');
      let geometryData: any | undefined;
      let propertiesData: any | undefined;

      for await (const entry of currentDirectory.values()) {
        if (!directoryInitialized) {
          const name = getStreamDirName(entry.name);
          streamedDirectories[name] = currentDirectory;
        }

        try {
          if (geometryFilePattern.test(entry.name)) {
            const file = (await entry.getFile()) as File;
            geometryData = await JSON.parse(await file.text());
            continue;
          }

          if (propertiesFilePattern.test(entry.name)) {
            const file = (await entry.getFile()) as File;
            propertiesData = await JSON.parse(await file.text());
          }
        } catch (error) {
          debugError(`Error processing file ${entry.name}:`, error);
          continue;
        }
      }

      if (geometryData) {
        updateLoadingText('Loading tile data...');
        await streamer.load(geometryData, false, propertiesData);
      }
    } catch (error) {
      debugError('Error loading tiles:', error);
    }
  }

  return BUI.Component.create<BUI.PanelSection>(() => {
    const t = (key: string) => i18n.t(key);
    return BUI.html`
      <bim-toolbar-section label="${t('import')}" icon="solar:import-bold">
        ${loadBtn}
        <bim-button @click=${loadFragments} label="${t('fragments')}" icon="fluent:puzzle-cube-piece-20-filled" tooltip-title="${t('loadFragments')}"
          tooltip-text="${t('loadFragmentsTooltip')}"></bim-button>
        <bim-button @click=${loadTiles} label="${t('tiles')}" icon="fe:tiled" tooltip-title="${t('loadTiles')}"
        tooltip-text="${t('loadTilesTooltip')}"></bim-button>
      </bim-toolbar-section>
    `;
  });
};

// Function to load the test IFC file from the API
export async function loadIfc(components: OBC.Components) {
  updateLoadingText('Initializing IFC Loader...');
  try {
    const apiUrl = '/ws/node/api/streamIfc';

    // Get the IFC loader instance
    const ifcLoader = components.get(OBC.IfcLoader);
    
    // Wait a bit for WASM initialization
    updateLoadingText('Preparing WebAssembly modules...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Configure the IFC loader with proper settings
    try {
      await ifcLoader.setup();
      debugLog('IFC loader setup completed');
    } catch (setupError) {
      debugWarn('IFC loader setup failed, continuing anyway:', setupError);
    }
    
    updateLoadingText('Fetching IFC file...');
    const file = await fetchFile(apiUrl);
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    updateLoadingText('Processing IFC model...');
    debugLog(`Loading IFC file of size: ${uint8Array.length} bytes`);
    
    // Use a more robust loading approach with multiple attempts
    let retval;
    let lastError;
    
    // Attempt 1: Standard loading
    try {
      debugLog('Attempting standard IFC loading...');
      retval = await ifcLoader.load(uint8Array, true);
      debugLog('Standard loading successful');
    } catch (wasmError) {
      debugWarn('Standard IFC loading failed:', wasmError);
      lastError = wasmError;
      
      // Attempt 2: Without optional parameter
      try {
        debugLog('Attempting alternative IFC loading method...');
        updateLoadingText('Trying alternative loading method...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Give WASM more time
        retval = await ifcLoader.load(uint8Array);
        debugLog('Alternative loading successful');
      } catch (altError) {
        debugWarn('Alternative IFC loading also failed:', altError);
        lastError = altError;
        
        // Attempt 3: Reinitialize loader
        try {
          debugLog('Reinitializing IFC loader...');
          updateLoadingText('Reinitializing loader...');
          const newIfcLoader = components.get(OBC.IfcLoader);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retval = await newIfcLoader.load(uint8Array);
          debugLog('Reinitialized loading successful');
        } catch (reinitError) {
          debugError('All loading attempts failed:', reinitError);
          throw lastError; // Throw the original error
        }
      }
    }
    
    // Ensure all fragments are properly initialized
    if (retval && retval.items) {
      debugLog(`Successfully loaded ${retval.items.length} fragments from IFC file`);
      
      // Force visibility and proper rendering for all fragments
      retval.items.forEach((fragment, index) => {
        if (fragment.mesh) {
          fragment.mesh.visible = true;
          fragment.mesh.frustumCulled = true;
          fragment.mesh.matrixAutoUpdate = true;
          fragment.mesh.updateMatrix();
          
          // Force material updates
          if (fragment.mesh.material) {
            if (Array.isArray(fragment.mesh.material)) {
              fragment.mesh.material.forEach((mat: THREE.Material) => {
                if (mat && 'needsUpdate' in mat) {
                  // TypeScript workaround for material update
                  const materialWithUpdate = mat as THREE.Material & { needsUpdate?: boolean };
                  materialWithUpdate.needsUpdate = true;
                }
              });
            } else {
              const material = fragment.mesh.material as THREE.Material;
              if (material && 'needsUpdate' in material) {
                // TypeScript workaround for material update
                const materialWithUpdate = material as THREE.Material & { needsUpdate?: boolean };
                materialWithUpdate.needsUpdate = true;
              }
            }
          }
          
          debugLog(`Fragment ${index}: vertices=${fragment.mesh.geometry.attributes.position?.count || 0}, visible=${fragment.mesh.visible}`);
        }
      });
      
      updateLoadingText('Finalizing model...');
      
      // Give time for all fragments to be processed
      await new Promise(resolve => setTimeout(resolve, 300));
    } else {
      debugWarn('No fragments were loaded from IFC file');
    }

    debugLog('IFC model loading completed successfully');
    return retval;
    
  } catch (error: unknown) {
    // Handle any errors that occur during the loading process
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugError('Error loading IFC file:', error);
    
    // More detailed error reporting
    if (errorMessage.includes('wasmTable') || errorMessage.includes('wasm') || errorMessage.includes('WebAssembly')) {
      debugError('WebAssembly compatibility issue detected. This might be due to:');
      debugError('1. Browser compatibility with WebAssembly');
      debugError('2. web-ifc library version compatibility');
      debugError('3. WASM module initialization failure');
      debugError('4. Timing issues with WASM module loading');
      alert('WebAssembly loading failed. Please refresh the page and try again. If the issue persists, try using a different browser (Chrome or Firefox recommended).');
    } else {
      alert(`Failed to load IFC file: ${errorMessage}`);
    }
    return null;
  }
}


