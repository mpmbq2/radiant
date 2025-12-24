/**
 * Config schema validators for built-in filters
 * These validate filter configurations BEFORE filter creation
 */

import type { FilterConfig } from './FilterInterface';
import type { ConfigValidationResult } from './FilterRegistry';
import { LogicalOperator, DateField, ComparisonOperator } from './types';

/**
 * Helper to create a validation result
 */
function validationResult(errors: string[]): ConfigValidationResult {
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate TagFilter configuration
 */
export function validateTagFilterConfig(
  config: FilterConfig
): ConfigValidationResult {
  const errors: string[] = [];

  // Must have at least one tag or excludeTag
  const tags = (config as any).tags;
  const excludeTags = (config as any).excludeTags;

  if (
    (!tags || !Array.isArray(tags) || tags.length === 0) &&
    (!excludeTags || !Array.isArray(excludeTags) || excludeTags.length === 0)
  ) {
    errors.push('tags: At least one tag or excludeTag must be specified');
  }

  // Tags must be an array of non-empty strings
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      errors.push('tags: Must be an array');
    } else {
      for (const tag of tags) {
        if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
          errors.push('tags: All tags must be non-empty strings');
          break;
        }
      }
    }
  }

  // Exclude tags must be an array of non-empty strings
  if (excludeTags !== undefined) {
    if (!Array.isArray(excludeTags)) {
      errors.push('excludeTags: Must be an array');
    } else {
      for (const tag of excludeTags) {
        if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
          errors.push(
            'excludeTags: All exclude tags must be non-empty strings'
          );
          break;
        }
      }
    }
  }

  // Operator must be AND or OR if specified
  const operator = (config as any).operator;
  if (
    operator !== undefined &&
    operator !== LogicalOperator.AND &&
    operator !== LogicalOperator.OR
  ) {
    errors.push('operator: Must be AND or OR for TagFilter');
  }

  // caseSensitive must be boolean if specified
  const caseSensitive = (config as any).caseSensitive;
  if (caseSensitive !== undefined && typeof caseSensitive !== 'boolean') {
    errors.push('caseSensitive: Must be a boolean');
  }

  return validationResult(errors);
}

/**
 * Validate DateRangeFilter configuration
 */
export function validateDateRangeFilterConfig(
  config: FilterConfig
): ConfigValidationResult {
  const errors: string[] = [];

  const field = (config as any).field;
  const preset = (config as any).preset;
  const start = (config as any).start;
  const end = (config as any).end;

  // Field must be specified and valid
  if (!field) {
    errors.push('field: Date field must be specified');
  } else if (
    field !== DateField.CREATED_AT &&
    field !== DateField.MODIFIED_AT
  ) {
    errors.push('field: Must be either created_at or modified_at');
  }

  // Must have either preset OR custom range
  if (!preset && start === undefined && end === undefined) {
    errors.push('Either preset or custom range (start/end) must be specified');
  }

  // If using custom range, validate timestamps
  if (start !== undefined && !Number.isFinite(start)) {
    errors.push('start: Must be a finite number');
  }

  if (end !== undefined && !Number.isFinite(end)) {
    errors.push('end: Must be a finite number');
  }

  // Start must be before end if both specified
  if (
    start !== undefined &&
    end !== undefined &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start > end
  ) {
    errors.push('start/end: Start date must be before or equal to end date');
  }

  return validationResult(errors);
}

/**
 * Validate ContentFilter configuration
 */
export function validateContentFilterConfig(
  config: FilterConfig
): ConfigValidationResult {
  const errors: string[] = [];

  const query = (config as any).query;
  const pattern = (config as any).pattern;
  const operator = (config as any).operator;
  const searchTitle = (config as any).searchTitle;
  const searchContent = (config as any).searchContent;
  const caseSensitive = (config as any).caseSensitive;

  // Must have query or pattern
  if (!query && !pattern) {
    errors.push('Either query or pattern must be specified');
  }

  // Query must be non-empty if specified
  if (query !== undefined) {
    if (typeof query !== 'string') {
      errors.push('query: Must be a string');
    } else if (query.trim().length === 0) {
      errors.push('query: Must be a non-empty string');
    }
  }

  // Pattern must be non-empty if specified
  if (pattern !== undefined) {
    if (typeof pattern !== 'string') {
      errors.push('pattern: Must be a string');
    } else if (pattern.trim().length === 0) {
      errors.push('pattern: Must be a non-empty string');
    }
  }

  // At least one search field must be enabled
  const searchTitleEnabled = searchTitle !== undefined ? searchTitle : true;
  const searchContentEnabled =
    searchContent !== undefined ? searchContent : true;

  if (!searchTitleEnabled && !searchContentEnabled) {
    errors.push('At least one of searchTitle or searchContent must be true');
  }

  // Validate searchTitle is boolean if specified
  if (searchTitle !== undefined && typeof searchTitle !== 'boolean') {
    errors.push('searchTitle: Must be a boolean');
  }

  // Validate searchContent is boolean if specified
  if (searchContent !== undefined && typeof searchContent !== 'boolean') {
    errors.push('searchContent: Must be a boolean');
  }

  // Validate caseSensitive is boolean if specified
  if (caseSensitive !== undefined && typeof caseSensitive !== 'boolean') {
    errors.push('caseSensitive: Must be a boolean');
  }

  // Validate regex if using regex operator
  if (operator === ComparisonOperator.MATCHES_REGEX) {
    const patternToValidate = pattern || query;
    if (patternToValidate) {
      try {
        new RegExp(patternToValidate);
      } catch (error) {
        errors.push(
          `pattern/query: Invalid regex pattern - ${error instanceof Error ? error.message : 'unknown error'}`
        );
      }
    }
  }

  return validationResult(errors);
}

/**
 * Validate CompositeFilter configuration
 */
export function validateCompositeFilterConfig(
  config: FilterConfig
): ConfigValidationResult {
  const errors: string[] = [];

  const operator = (config as any).operator;
  const filters = (config as any).filters;

  // Operator must be specified and valid
  if (!operator) {
    errors.push('operator: Logical operator must be specified');
  } else if (
    operator !== LogicalOperator.AND &&
    operator !== LogicalOperator.OR &&
    operator !== LogicalOperator.NOT
  ) {
    errors.push('operator: Must be AND, OR, or NOT');
  }

  // Filters must be specified and be an array
  if (!filters) {
    errors.push('filters: Child filters must be specified');
  } else if (!Array.isArray(filters)) {
    errors.push('filters: Must be an array');
  } else {
    // Must have at least one child filter
    if (filters.length === 0) {
      errors.push('filters: Must have at least one child filter');
    }

    // For NOT operator, must have exactly one child filter
    if (operator === LogicalOperator.NOT && filters.length !== 1) {
      errors.push('filters: NOT operator requires exactly one child filter');
    }

    // For AND/OR operators, must have at least two child filters
    if (
      (operator === LogicalOperator.AND || operator === LogicalOperator.OR) &&
      filters.length < 2
    ) {
      errors.push(
        'filters: AND/OR operators require at least two child filters'
      );
    }

    // Each child must be a valid filter config (have a type field)
    for (let i = 0; i < filters.length; i++) {
      const childFilter = filters[i];
      if (!childFilter || typeof childFilter !== 'object') {
        errors.push(
          `filters[${i}]: Must be a valid filter configuration object`
        );
      } else if (!childFilter.type) {
        errors.push(`filters[${i}]: Must have a "type" field`);
      }
    }
  }

  return validationResult(errors);
}
