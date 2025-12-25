import type {
  FilterInterface,
  FilterConfig,
  FilterFactory,
} from './FilterInterface';

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
   * @throws Error if type is already registered or parameters are invalid
   */
  register(
    type: string,
    factory: FilterFactory,
    metadata?: FilterMetadata
  ): void {
    // Validate type parameter
    if (type == null) {
      throw new Error('Filter type cannot be null or undefined');
    }

    if (typeof type !== 'string') {
      throw new Error(`Filter type must be a string, received ${typeof type}`);
    }

    if (type.trim().length === 0) {
      throw new Error('Filter type cannot be an empty string');
    }

    // Validate factory parameter
    if (factory == null) {
      throw new Error('Filter factory cannot be null or undefined');
    }

    if (typeof factory !== 'function') {
      throw new Error(
        `Filter factory must be a function, received ${typeof factory}`
      );
    }

    // Validate metadata parameter if provided
    if (metadata != null) {
      if (typeof metadata !== 'object' || Array.isArray(metadata)) {
        throw new Error(
          'Filter metadata must be an object, not an array or primitive'
        );
      }

      // Validate required metadata fields
      if (!('displayName' in metadata)) {
        throw new Error(
          'Filter metadata must include a "displayName" property'
        );
      }

      if (!('description' in metadata)) {
        throw new Error(
          'Filter metadata must include a "description" property'
        );
      }

      if (typeof metadata.displayName !== 'string') {
        throw new Error('Filter metadata "displayName" must be a string');
      }

      if (typeof metadata.description !== 'string') {
        throw new Error('Filter metadata "description" must be a string');
      }

      if (metadata.displayName.trim().length === 0) {
        throw new Error('Filter metadata "displayName" cannot be empty');
      }

      if (metadata.description.trim().length === 0) {
        throw new Error('Filter metadata "description" cannot be empty');
      }

      // Validate optional metadata fields if present
      if (
        metadata.category !== undefined &&
        typeof metadata.category !== 'string'
      ) {
        throw new Error('Filter metadata "category" must be a string');
      }

      if (
        metadata.category !== undefined &&
        metadata.category.trim().length === 0
      ) {
        throw new Error('Filter metadata "category" cannot be empty');
      }

      if (
        metadata.configSchema !== undefined &&
        typeof metadata.configSchema !== 'function'
      ) {
        throw new Error('Filter metadata "configSchema" must be a function');
      }

      if (metadata.example !== undefined) {
        // Validate example is a valid FilterConfig (has type field)
        if (
          typeof metadata.example !== 'object' ||
          metadata.example === null ||
          Array.isArray(metadata.example)
        ) {
          throw new Error(
            'Filter metadata "example" must be a valid FilterConfig object'
          );
        }

        if (!('type' in metadata.example)) {
          throw new Error('Filter metadata "example" must have a "type" field');
        }

        if (typeof metadata.example.type !== 'string') {
          throw new Error('Filter metadata "example.type" must be a string');
        }
      }
    }

    // Check if type is already registered (after validation)
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
    // Validate basic config structure before attempting to create filter
    this.validateConfig(config);

    const { type } = config;

    const factory = this.factories.get(type);

    if (!factory) {
      throw new Error(
        `No factory registered for filter type '${type}'. ` +
          `Available types: ${Array.from(this.factories.keys()).join(', ')}`
      );
    }

    // Validate config schema BEFORE creating the filter instance
    // This prevents invalid configs from executing constructor logic
    this.validateConfigSchema(type, config);

    // Create the filter instance (now guaranteed to have valid config)
    const filter = factory(config);

    // Validate the created filter as a final safety check
    const validation = filter.validate();
    if (!validation.isValid) {
      throw new Error(
        `Filter validation failed: ${validation.errors.join(', ')}`
      );
    }

    return filter;
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
   * Validate config against its schema BEFORE creating filter instance
   * This prevents invalid configs from executing constructor logic
   *
   * @param type - Filter type identifier
   * @param config - Filter configuration to validate
   * @throws Error if config validation fails (preserves original stack trace)
   * @private
   */
  private validateConfigSchema(type: string, config: FilterConfig): void {
    const metadata = this.metadata.get(type);

    // If no metadata or no schema validator, skip schema validation
    if (!metadata || !metadata.configSchema) {
      return;
    }

    // Run the schema validator
    const result = metadata.configSchema(config);

    // If validation failed, throw error with all validation messages
    if (!result.isValid) {
      // Throw a single error with all validation errors concatenated
      // This preserves the original error messages without re-wrapping
      throw new Error(
        `Invalid configuration for ${type} filter: ${result.errors.join('; ')}`
      );
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
 * Result of config schema validation
 */
export interface ConfigValidationResult {
  /** Whether the config is valid */
  isValid: boolean;

  /** Array of validation error messages */
  errors: string[];
}

/**
 * Function that validates a filter configuration before filter creation
 * @param config - The configuration to validate
 * @returns Validation result with any errors found
 */
export type ConfigSchemaValidator = (
  config: FilterConfig
) => ConfigValidationResult;

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

  /** Schema validator for configuration validation (validates BEFORE filter creation) */
  configSchema?: ConfigSchemaValidator;
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
