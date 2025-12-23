import type { FilterInterface, FilterConfig, FilterFactory } from './FilterInterface';
import { FilterType } from './types';

/**
 * Registry for dynamically creating filters from serialized configurations
 *
 * The FilterRegistry provides a centralized service for:
 * - Registering filter factories by type
 * - Creating filter instances from configuration objects
 * - Listing available filter types
 * - Providing filter metadata
 *
 * This enables:
 * - Plugin-based filter extensions
 * - Deserialization of saved filters
 * - Dynamic filter creation in UI
 */
export class FilterRegistry {
  private factories: Map<string, FilterFactory> = new Map();
  private metadata: Map<string, FilterMetadata> = new Map();

  /**
   * Register a filter factory for a specific type
   *
   * @param type - Unique filter type identifier
   * @param factory - Factory function that creates filter instances
   * @param metadata - Optional metadata about the filter
   * @throws Error if type is already registered
   */
  register(type: string, factory: FilterFactory, metadata?: FilterMetadata): void {
    if (this.factories.has(type)) {
      throw new Error(`Filter type '${type}' is already registered`);
    }

    this.factories.set(type, factory);

    if (metadata) {
      this.metadata.set(type, metadata);
    }
  }

  /**
   * Unregister a filter type (useful for testing/plugins)
   *
   * @param type - Filter type to unregister
   * @returns True if type was registered and removed
   */
  unregister(type: string): boolean {
    const removed = this.factories.delete(type);
    this.metadata.delete(type);
    return removed;
  }

  /**
   * Create a filter instance from a configuration object
   *
   * @param config - Filter configuration with type field
   * @returns Filter instance
   * @throws Error if type is not registered or factory fails
   */
  createFromConfig(config: FilterConfig): FilterInterface {
    // Validate config before attempting to create filter
    this.validateConfig(config);

    const { type } = config;

    const factory = this.factories.get(type);

    if (!factory) {
      throw new Error(
        `No factory registered for filter type '${type}'. ` +
        `Available types: ${Array.from(this.factories.keys()).join(', ')}`
      );
    }

    try {
      const filter = factory(config);

      // Validate the created filter
      const validation = filter.validate();
      if (!validation.isValid) {
        throw new Error(
          `Filter validation failed: ${validation.errors.join(', ')}`
        );
      }

      return filter;
    } catch (error) {
      throw new Error(
        `Failed to create filter of type '${type}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Validate FilterConfig before creating filter instance
   *
   * @param config - Filter configuration to validate
   * @throws Error if config is invalid
   * @private
   */
  private validateConfig(config: FilterConfig): void {
    // Check if config is null or undefined
    if (config == null) {
      throw new Error('Filter configuration cannot be null or undefined');
    }

    // Check if config is an object
    if (typeof config !== 'object') {
      throw new Error(
        `Filter configuration must be an object, received ${typeof config}`
      );
    }

    // Check if config is an array (arrays are objects but not valid configs)
    if (Array.isArray(config)) {
      throw new Error('Filter configuration cannot be an array');
    }

    // Check if type field exists
    if (!('type' in config)) {
      throw new Error('Filter configuration must have a "type" field');
    }

    const { type } = config;

    // Check if type is a string
    if (typeof type !== 'string') {
      throw new Error(
        `Filter configuration "type" must be a string, received ${typeof type}`
      );
    }

    // Check if type is not empty
    if (type.trim().length === 0) {
      throw new Error('Filter configuration "type" cannot be an empty string');
    }
  }

  /**
   * Check if a filter type is registered
   *
   * @param type - Filter type to check
   * @returns True if type is registered
   */
  isRegistered(type: string): boolean {
    return this.factories.has(type);
  }

  /**
   * Get all registered filter types
   *
   * @returns Array of filter type identifiers
   */
  getAvailableTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get metadata for a filter type
   *
   * @param type - Filter type
   * @returns Filter metadata or undefined if not set
   */
  getMetadata(type: string): FilterMetadata | undefined {
    return this.metadata.get(type);
  }

  /**
   * Get all registered metadata
   *
   * @returns Map of type to metadata
   */
  getAllMetadata(): Map<string, FilterMetadata> {
    return new Map(this.metadata);
  }

  /**
   * Clear all registered filters (useful for testing)
   */
  clear(): void {
    this.factories.clear();
    this.metadata.clear();
  }

  /**
   * Get the number of registered filters
   */
  get size(): number {
    return this.factories.size;
  }
}

/**
 * Metadata describing a filter type
 * Used for UI generation and documentation
 */
export interface FilterMetadata {
  /** Human-readable display name */
  displayName: string;

  /** Brief description of what this filter does */
  description: string;

  /** Category for grouping filters in UI */
  category?: string;

  /** Example configuration */
  example?: FilterConfig;

  /** Schema for configuration validation (optional) */
  configSchema?: any;
}

/**
 * Singleton instance of the filter registry
 * Import and use this for registering and creating filters
 */
export const filterRegistry = new FilterRegistry();

/**
 * Helper function to register all built-in filters

/**
 * Helper function to register all built-in filters
 * Call this during app initialization
 *
 * Note: The actual implementation is in registerFilters.ts to avoid circular
 * dependency issues. Import and call registerBuiltInFilters from that module.
 *
 * @deprecated Use registerBuiltInFilters from './registerFilters' instead
 */
export function registerBuiltInFilters(): void {
  throw new Error(
    'registerBuiltInFilters() has been moved. ' +
    "Import it from './registerFilters' instead of './FilterRegistry'"
  );
}
