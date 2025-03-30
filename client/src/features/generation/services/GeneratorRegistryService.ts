import {
  GeneratorPlugin,
  GeneratorRegistry,
  BaseGenerationRequest, 
  BaseGenerationResult
} from '../types/generation.types';

/**
 * Service to manage and provide access to available GeneratorPlugins.
 * Implemented as a singleton.
 */
export class GeneratorRegistryService {
  private static instance: GeneratorRegistryService;
  private registry: GeneratorRegistry;

  private constructor() {
    this.registry = new Map();
    console.log('GeneratorRegistryService initialized.');
  }

  /**
   * Gets the singleton instance of the service.
   */
  public static getInstance(): GeneratorRegistryService {
    if (!GeneratorRegistryService.instance) {
      GeneratorRegistryService.instance = new GeneratorRegistryService();
    }
    return GeneratorRegistryService.instance;
  }

  /**
   * Registers a new generator plugin.
   * @param plugin - The plugin instance to register.
   */
  public registerPlugin<Req extends BaseGenerationRequest, Res extends BaseGenerationResult>(
    plugin: GeneratorPlugin<Req, Res>
  ): void {
    const pluginId = plugin.getId();
    if (this.registry.has(pluginId)) {
      console.warn(`GeneratorRegistryService: Plugin with ID '${pluginId}' is already registered. Overwriting.`);
    }
    this.registry.set(pluginId, plugin);
    console.log(`GeneratorRegistryService: Registered plugin '${pluginId}' - ${plugin.getName()}`);
  }

  /**
   * Retrieves a plugin by its unique ID.
   * @param pluginId - The ID of the plugin to retrieve.
   * @returns The plugin instance, or undefined if not found.
   */
  public getPlugin<Req extends BaseGenerationRequest, Res extends BaseGenerationResult>(
    pluginId: string
  ): GeneratorPlugin<Req, Res> | undefined {
    // We use 'any' here because the caller should know the expected types,
    // or handle the generic nature appropriately.
    return this.registry.get(pluginId) as GeneratorPlugin<Req, Res> | undefined;
  }

  /**
   * Retrieves all registered plugins.
   * @returns An array of all registered plugin instances.
   */
  public getAllPlugins(): GeneratorPlugin<any, any>[] {
    return Array.from(this.registry.values());
  }

  /**
   * Retrieves all registered plugins as a Map.
   * @returns The internal registry Map.
   */
  public getRegistryMap(): GeneratorRegistry {
    return this.registry;
  }
}

// Export a singleton instance for easy access
export const generatorRegistryService = GeneratorRegistryService.getInstance();
