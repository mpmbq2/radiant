/**
 * Common types and enums for the filter system
 */

/**
 * Logical operators for combining filter conditions
 */
export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
}

/**
 * Comparison operators for various filter conditions
 */
export enum ComparisonOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  BETWEEN = 'BETWEEN',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  MATCHES_REGEX = 'MATCHES_REGEX',
}

/**
 * Date range presets for quick filtering
 */
export enum DateRangePreset {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  LAST_90_DAYS = 'LAST_90_DAYS',
  THIS_WEEK = 'THIS_WEEK',
  LAST_WEEK = 'LAST_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  THIS_YEAR = 'THIS_YEAR',
  LAST_YEAR = 'LAST_YEAR',
  CUSTOM = 'CUSTOM',
}

/**
 * Date field to filter on
 */
export enum DateField {
  CREATED_AT = 'created_at',
  MODIFIED_AT = 'modified_at',
}

/**
 * Sort direction
 */
export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Fields that can be sorted on
 */
export enum SortField {
  CREATED_AT = 'created_at',
  MODIFIED_AT = 'modified_at',
  TITLE = 'title',
  WORD_COUNT = 'word_count',
  CHARACTER_COUNT = 'character_count',
}

/**
 * Filter types enumeration
 * Used to identify concrete filter implementations
 */
export enum FilterType {
  TAG = 'TAG',
  DATE_RANGE = 'DATE_RANGE',
  CONTENT = 'CONTENT',
  COMPOSITE = 'COMPOSITE',
  WORD_COUNT = 'WORD_COUNT',
  DELETED = 'DELETED',
  SORT = 'SORT',
}
