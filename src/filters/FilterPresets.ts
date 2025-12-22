/**
 * Built-in Filter Presets
 *
 * Provides commonly used filter configurations that users can apply immediately.
 */

import type { SavedFilter } from './filterConfig';
import { FilterType, DateRangePreset, DateField, LogicalOperator } from './types';

/**
 * Preset filter IDs
 */
export enum PresetFilterId {
  ALL_NOTES = 'preset:all-notes',
  TODAY = 'preset:today',
  THIS_WEEK = 'preset:this-week',
  THIS_MONTH = 'preset:this-month',
  RECENT = 'preset:recent',
  MODIFIED_TODAY = 'preset:modified-today',
  MODIFIED_THIS_WEEK = 'preset:modified-this-week',
}

/**
 * Built-in filter presets
 */
export const FILTER_PRESETS: Record<PresetFilterId, SavedFilter> = {
  [PresetFilterId.ALL_NOTES]: {
    metadata: {
      id: PresetFilterId.ALL_NOTES,
      name: 'All Notes',
      description: 'Show all notes without filtering',
      tags: ['built-in', 'basic'],
      createdAt: 0,
      modifiedAt: 0,
      isPreset: true,
      icon: 'list',
      color: '#6b7280',
    },
    config: {
      type: FilterType.COMPOSITE,
      operator: LogicalOperator.AND,
      filters: [],
    },
  },

  [PresetFilterId.TODAY]: {
    metadata: {
      id: PresetFilterId.TODAY,
      name: 'Created Today',
      description: 'Notes created today',
      tags: ['built-in', 'date', 'recent'],
      createdAt: 0,
      modifiedAt: 0,
      isPreset: true,
      icon: 'calendar-day',
      color: '#3b82f6',
    },
    config: {
      type: FilterType.DATE_RANGE,
      field: DateField.CREATED_AT,
      preset: DateRangePreset.TODAY,
    },
  },

  [PresetFilterId.THIS_WEEK]: {
    metadata: {
      id: PresetFilterId.THIS_WEEK,
      name: 'Created This Week',
      description: 'Notes created this week',
      tags: ['built-in', 'date', 'recent'],
      createdAt: 0,
      modifiedAt: 0,
      isPreset: true,
      icon: 'calendar-week',
      color: '#3b82f6',
    },
    config: {
      type: FilterType.DATE_RANGE,
      field: DateField.CREATED_AT,
      preset: DateRangePreset.THIS_WEEK,
    },
  },

  [PresetFilterId.THIS_MONTH]: {
    metadata: {
      id: PresetFilterId.THIS_MONTH,
      name: 'Created This Month',
      description: 'Notes created this month',
      tags: ['built-in', 'date'],
      createdAt: 0,
      modifiedAt: 0,
      isPreset: true,
      icon: 'calendar',
      color: '#3b82f6',
    },
    config: {
      type: FilterType.DATE_RANGE,
      field: DateField.CREATED_AT,
      preset: DateRangePreset.THIS_MONTH,
    },
  },

  [PresetFilterId.RECENT]: {
    metadata: {
      id: PresetFilterId.RECENT,
      name: 'Recent Notes',
      description: 'Notes from the last 7 days',
      tags: ['built-in', 'date', 'recent'],
      createdAt: 0,
      modifiedAt: 0,
      isPreset: true,
      icon: 'clock',
      color: '#10b981',
    },
    config: {
      type: FilterType.DATE_RANGE,
      field: DateField.CREATED_AT,
      preset: DateRangePreset.LAST_7_DAYS,
    },
  },

  [PresetFilterId.MODIFIED_TODAY]: {
    metadata: {
      id: PresetFilterId.MODIFIED_TODAY,
      name: 'Modified Today',
      description: 'Notes modified today',
      tags: ['built-in', 'date', 'modified'],
      createdAt: 0,
      modifiedAt: 0,
      isPreset: true,
      icon: 'edit',
      color: '#f59e0b',
    },
    config: {
      type: FilterType.DATE_RANGE,
      field: DateField.MODIFIED_AT,
      preset: DateRangePreset.TODAY,
    },
  },

  [PresetFilterId.MODIFIED_THIS_WEEK]: {
    metadata: {
      id: PresetFilterId.MODIFIED_THIS_WEEK,
      name: 'Modified This Week',
      description: 'Notes modified this week',
      tags: ['built-in', 'date', 'modified'],
      createdAt: 0,
      modifiedAt: 0,
      isPreset: true,
      icon: 'edit',
      color: '#f59e0b',
    },
    config: {
      type: FilterType.DATE_RANGE,
      field: DateField.MODIFIED_AT,
      preset: DateRangePreset.THIS_WEEK,
    },
  },
};

/**
 * Get all available preset filters
 */
export function getAllPresets(): SavedFilter[] {
  return Object.values(FILTER_PRESETS);
}

/**
 * Get a preset filter by ID
 */
export function getPreset(id: PresetFilterId): SavedFilter | undefined {
  return FILTER_PRESETS[id];
}

/**
 * Check if a filter ID is a preset
 */
export function isPresetId(id: string): boolean {
  return id.startsWith('preset:');
}

/**
 * Get presets by tag
 */
export function getPresetsByTag(tag: string): SavedFilter[] {
  return getAllPresets().filter(preset =>
    preset.metadata.tags?.includes(tag)
  );
}

/**
 * Search presets by name or description
 */
export function searchPresets(query: string): SavedFilter[] {
  const lowerQuery = query.toLowerCase();
  return getAllPresets().filter(preset => {
    const nameMatch = preset.metadata.name.toLowerCase().includes(lowerQuery);
    const descMatch = preset.metadata.description?.toLowerCase().includes(lowerQuery);
    return nameMatch || descMatch;
  });
}
