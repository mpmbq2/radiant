/**
 * Filter Configuration System
 *
 * This module provides types and utilities for managing filter configurations,
 * including presets and user-saved filters.
 */

import type { FilterConfig } from './FilterInterface';

/**
 * Metadata for a saved filter configuration
 */
export interface SavedFilterMetadata {
  /** Unique identifier */
  id: string;

  /** User-friendly name */
  name: string;

  /** Optional description */
  description?: string;

  /** Tags for categorization */
  tags?: string[];

  /** When the filter was created (Unix timestamp) */
  createdAt: number;

  /** When the filter was last modified (Unix timestamp) */
  modifiedAt: number;

  /** Whether this is a user-created filter or a built-in preset */
  isPreset: boolean;

  /** Optional icon identifier for UI */
  icon?: string;

  /** Optional color for UI display */
  color?: string;
}

/**
 * Complete saved filter with configuration and metadata
 */
export interface SavedFilter {
  /** Metadata about the filter */
  metadata: SavedFilterMetadata;

  /** The actual filter configuration */
  config: FilterConfig;
}

/**
 * Schema for validating filter configurations
 * Defines the structure and constraints for filter configs
 */
export interface FilterConfigSchema {
  /** Schema version for forward compatibility */
  version: string;

  /** Required fields for all filter configs */
  required: string[];

  /** Optional fields with their types */
  properties: Record<string, FilterPropertySchema>;

  /** Additional validation rules */
  validation?: FilterValidationRules;
}

/**
 * Schema definition for a filter property
 */
export interface FilterPropertySchema {
  /** Property type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';

  /** Description of the property */
  description?: string;

  /** For enum types, the allowed values */
  enum?: unknown[];

  /** For array types, the item schema */
  items?: FilterPropertySchema;

  /** For object types, the property schemas */
  properties?: Record<string, FilterPropertySchema>;

  /** Minimum value (for numbers) */
  min?: number;

  /** Maximum value (for numbers) */
  max?: number;

  /** Pattern (for strings) */
  pattern?: string;

  /** Default value */
  default?: unknown;

  /** Whether this property is required */
  required?: boolean;
}

/**
 * Validation rules for filter configurations
 */
export interface FilterValidationRules {
  /** Maximum number of nested composite filters */
  maxNestingDepth?: number;

  /** Maximum number of filters in a composite */
  maxFiltersInComposite?: number;

  /** Custom validation function */
  customValidation?: (config: FilterConfig) => boolean;
}

/**
 * Result of importing/exporting filter configurations
 */
export interface FilterConfigImportExportResult {
  /** Whether the operation succeeded */
  success: boolean;

  /** Number of filters processed */
  count: number;

  /** Any errors that occurred */
  errors?: string[];

  /** IDs of imported/exported filters */
  filterIds?: string[];
}

/**
 * Options for exporting filter configurations
 */
export interface FilterExportOptions {
  /** Whether to include presets */
  includePresets?: boolean;

  /** Whether to include user-created filters */
  includeUserFilters?: boolean;

  /** Specific filter IDs to export */
  filterIds?: string[];

  /** Format for export */
  format?: 'json' | 'yaml';
}

/**
 * Options for importing filter configurations
 */
export interface FilterImportOptions {
  /** Whether to overwrite existing filters with same ID */
  overwrite?: boolean;

  /** Whether to validate before importing */
  validate?: boolean;

  /** Whether to skip presets */
  skipPresets?: boolean;
}

/**
 * Validation result for filter configuration
 */
export interface FilterConfigValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean;

  /** Validation errors */
  errors: string[];

  /** Warnings (non-fatal issues) */
  warnings?: string[];
}

/**
 * Constants for filter configuration system
 */
export const FILTER_CONFIG_CONSTANTS = {
  /** Current schema version */
  SCHEMA_VERSION: '1.0.0',

  /** Maximum nesting depth for composite filters */
  MAX_NESTING_DEPTH: 5,

  /** Maximum filters in a single composite */
  MAX_COMPOSITE_FILTERS: 20,

  /** Maximum number of saved filters per user */
  MAX_SAVED_FILTERS: 100,

  /** Default export format */
  DEFAULT_EXPORT_FORMAT: 'json' as const,
} as const;
