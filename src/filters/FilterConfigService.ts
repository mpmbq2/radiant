/**
 * Filter Configuration Service
 *
 * Manages saving, loading, and organizing filter configurations.
 * Supports both built-in presets and user-created custom filters.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  SavedFilter,
  SavedFilterMetadata,
  FilterConfigImportExportResult,
  FilterExportOptions,
  FilterImportOptions,
  FilterConfigValidationResult,
} from './filterConfig';
import { FILTER_CONFIG_CONSTANTS } from './filterConfig';
import type { FilterConfig } from './FilterInterface';
import { filterRegistry } from './FilterRegistry';
import { getAllPresets, isPresetId } from './FilterPresets';

/**
 * Repository interface for persisting filters
 * Implementation will be provided by database layer
 */
export interface FilterConfigRepository {
  /** Save a filter configuration */
  save(filter: SavedFilter): Promise<void>;

  /** Get a filter by ID */
  getById(id: string): Promise<SavedFilter | null>;

  /** Get all saved filters */
  getAll(): Promise<SavedFilter[]>;

  /** Delete a filter by ID */
  delete(id: string): Promise<boolean>;

  /** Update a filter */
  update(id: string, filter: SavedFilter): Promise<void>;

  /** Search filters by name or description */
  search(query: string): Promise<SavedFilter[]>;
}

/**
 * Service for managing filter configurations
 */
export class FilterConfigService {
  private repository: FilterConfigRepository | null = null;

  /**
   * Set the repository implementation
   */
  setRepository(repository: FilterConfigRepository): void {
    this.repository = repository;
  }

  /**
   * Get all available filters (presets + saved)
   */
  async getAllFilters(): Promise<SavedFilter[]> {
    const presets = getAllPresets();
    const saved = this.repository ? await this.repository.getAll() : [];
    return [...presets, ...saved];
  }

  /**
   * Get a filter by ID (checks both presets and saved)
   */
  async getFilterById(id: string): Promise<SavedFilter | null> {
    // Check presets first
    if (isPresetId(id)) {
      const presets = getAllPresets();
      return presets.find(p => p.metadata.id === id) || null;
    }

    // Check saved filters
    if (this.repository) {
      return this.repository.getById(id);
    }

    return null;
  }

  /**
   * Save a new filter configuration
   */
  async saveFilter(
    name: string,
    description: string,
    config: FilterConfig,
    options?: {
      tags?: string[];
      icon?: string;
      color?: string;
    }
  ): Promise<SavedFilter> {
    if (!this.repository) {
      throw new Error('FilterConfigRepository not configured');
    }

    // Validate the filter configuration
    const validation = this.validateFilterConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid filter configuration: ${validation.errors.join(', ')}`);
    }

    const now = Math.floor(Date.now() / 1000);
    const filter: SavedFilter = {
      metadata: {
        id: uuidv4(),
        name,
        description,
        tags: options?.tags || [],
        createdAt: now,
        modifiedAt: now,
        isPreset: false,
        icon: options?.icon,
        color: options?.color,
      },
      config,
    };

    await this.repository.save(filter);
    return filter;
  }

  /**
   * Update an existing filter
   */
  async updateFilter(
    id: string,
    updates: {
      name?: string;
      description?: string;
      config?: FilterConfig;
      tags?: string[];
      icon?: string;
      color?: string;
    }
  ): Promise<SavedFilter> {
    if (!this.repository) {
      throw new Error('FilterConfigRepository not configured');
    }

    // Can't update presets
    if (isPresetId(id)) {
      throw new Error('Cannot update built-in preset filters');
    }

    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error(`Filter with ID '${id}' not found`);
    }

    // Validate new config if provided
    if (updates.config) {
      const validation = this.validateFilterConfig(updates.config);
      if (!validation.isValid) {
        throw new Error(`Invalid filter configuration: ${validation.errors.join(', ')}`);
      }
    }

    const updated: SavedFilter = {
      metadata: {
        ...existing.metadata,
        name: updates.name ?? existing.metadata.name,
        description: updates.description ?? existing.metadata.description,
        tags: updates.tags ?? existing.metadata.tags,
        icon: updates.icon ?? existing.metadata.icon,
        color: updates.color ?? existing.metadata.color,
        modifiedAt: Math.floor(Date.now() / 1000),
      },
      config: updates.config ?? existing.config,
    };

    await this.repository.update(id, updated);
    return updated;
  }

  /**
   * Delete a saved filter
   */
  async deleteFilter(id: string): Promise<boolean> {
    if (!this.repository) {
      throw new Error('FilterConfigRepository not configured');
    }

    // Can't delete presets
    if (isPresetId(id)) {
      throw new Error('Cannot delete built-in preset filters');
    }

    return this.repository.delete(id);
  }

  /**
   * Get all user-created (non-preset) filters
   */
  async getUserFilters(): Promise<SavedFilter[]> {
    if (!this.repository) {
      return [];
    }

    const all = await this.repository.getAll();
    return all.filter(f => !f.metadata.isPreset);
  }

  /**
   * Search filters by query
   */
  async searchFilters(query: string): Promise<SavedFilter[]> {
    const presets = getAllPresets().filter(p => {
      const lowerQuery = query.toLowerCase();
      return (
        p.metadata.name.toLowerCase().includes(lowerQuery) ||
        p.metadata.description?.toLowerCase().includes(lowerQuery)
      );
    });

    const saved = this.repository ? await this.repository.search(query) : [];

    return [...presets, ...saved];
  }

  /**
   * Validate a filter configuration
   */
  validateFilterConfig(config: FilterConfig): FilterConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if filter type is registered
    if (!filterRegistry.isRegistered(config.type)) {
      errors.push(`Unknown filter type: ${config.type}`);
      return { isValid: false, errors, warnings };
    }

    // Try to create the filter to validate it
    try {
      const filter = filterRegistry.createFromConfig(config);
      const validation = filter.validate();

      if (!validation.isValid) {
        errors.push(...validation.errors);
      }

      // Check nesting depth for composite filters
      const depth = this.getConfigNestingDepth(config);
      if (depth > FILTER_CONFIG_CONSTANTS.MAX_NESTING_DEPTH) {
        errors.push(
          `Filter nesting depth ${depth} exceeds maximum ${FILTER_CONFIG_CONSTANTS.MAX_NESTING_DEPTH}`
        );
      }

      // Warn if nesting is getting deep
      if (depth > 3) {
        warnings.push(`Deep nesting (${depth} levels) may impact performance`);
      }
    } catch (error) {
      errors.push(`Filter creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Export filters to JSON
   */
  async exportFilters(options: FilterExportOptions = {}): Promise<FilterConfigImportExportResult> {
    const filters: SavedFilter[] = [];
    const errors: string[] = [];

    try {
      if (options.filterIds && options.filterIds.length > 0) {
        // Export specific filters
        for (const id of options.filterIds) {
          const filter = await this.getFilterById(id);
          if (filter) {
            filters.push(filter);
          } else {
            errors.push(`Filter not found: ${id}`);
          }
        }
      } else {
        // Export all filters based on options
        const allFilters = await this.getAllFilters();

        for (const filter of allFilters) {
          const isPreset = filter.metadata.isPreset;

          if (isPreset && options.includePresets !== false) {
            filters.push(filter);
          } else if (!isPreset && options.includeUserFilters !== false) {
            filters.push(filter);
          }
        }
      }

      return {
        success: errors.length === 0,
        count: filters.length,
        errors: errors.length > 0 ? errors : undefined,
        filterIds: filters.map(f => f.metadata.id),
      };
    } catch (error) {
      return {
        success: false,
        count: 0,
        errors: [error instanceof Error ? error.message : 'Export failed'],
      };
    }
  }

  /**
   * Import filters from JSON
   */
  async importFilters(
    filters: SavedFilter[],
    options: FilterImportOptions = {}
  ): Promise<FilterConfigImportExportResult> {
    if (!this.repository) {
      throw new Error('FilterConfigRepository not configured');
    }

    const imported: string[] = [];
    const errors: string[] = [];

    for (const filter of filters) {
      try {
        // Skip presets if requested
        if (filter.metadata.isPreset && options.skipPresets) {
          continue;
        }

        // Validate if requested
        if (options.validate !== false) {
          const validation = this.validateFilterConfig(filter.config);
          if (!validation.isValid) {
            errors.push(`Filter '${filter.metadata.name}': ${validation.errors.join(', ')}`);
            continue;
          }
        }

        // Check if filter exists
        const existing = await this.repository.getById(filter.metadata.id);

        if (existing && !options.overwrite) {
          errors.push(`Filter '${filter.metadata.name}' already exists (ID: ${filter.metadata.id})`);
          continue;
        }

        // Import the filter
        if (existing) {
          await this.repository.update(filter.metadata.id, filter);
        } else {
          await this.repository.save(filter);
        }

        imported.push(filter.metadata.id);
      } catch (error) {
        errors.push(
          `Failed to import '${filter.metadata.name}': ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      success: errors.length === 0,
      count: imported.length,
      errors: errors.length > 0 ? errors : undefined,
      filterIds: imported,
    };
  }

  /**
   * Get the nesting depth of a filter configuration
   */
  private getConfigNestingDepth(config: FilterConfig, currentDepth = 0): number {
    if (config.type !== 'COMPOSITE') {
      return currentDepth;
    }

    const compositeConfig = config as any;
    if (!compositeConfig.filters || compositeConfig.filters.length === 0) {
      return currentDepth;
    }

    const childDepths = compositeConfig.filters.map((child: FilterConfig) =>
      this.getConfigNestingDepth(child, currentDepth + 1)
    );

    return Math.max(...childDepths);
  }
}

/**
 * Singleton instance of the filter config service
 */
export const filterConfigService = new FilterConfigService();
