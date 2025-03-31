import { generatorRegistryService } from '../services/GeneratorRegistryService';
import { textToImagePlugin } from './TextToImagePlugin';
import { imageToVideoPlugin } from './ImageToVideoPlugin';
// Import other plugins here as they are created
// import { copyGenerationPlugin } from './CopyGenerationPlugin'; 

/**
 * Initializes and registers all available generator plugins.
 * This function should be called once during application startup.
 */
export function initializeGenerationPlugins(): void {
  console.log('Initializing Generation Plugins...');
  
  // Register Text-to-Image Plugin
  generatorRegistryService.registerPlugin(textToImagePlugin);
  
  // Register Image-to-Video Plugin
  generatorRegistryService.registerPlugin(imageToVideoPlugin);
  
  // Register Copy Generation Plugin (example)
  // generatorRegistryService.registerPlugin(copyGenerationPlugin);
  
  // Add registration calls for other plugins here
  
  console.log('Generation Plugins Initialized. Registry:', generatorRegistryService.getRegistryMap());
}
