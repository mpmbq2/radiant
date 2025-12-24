import type { Note, NoteWithContent } from '../types';
import {
  FilterInterface,
  FilterConfig,
  FilterValidationResult,
  validationSuccess,
  validationFailure,
} from './FilterInterface';
import { FilterType, DateRangePreset, DateField } from './types';

/**
 * Configuration for DateRangeFilter
 */
export interface DateRangeFilterConfig extends FilterConfig {
  type: typeof FilterType.DATE_RANGE;

  /** Which date field to filter on */
  field: DateField;

  /** Preset date range (use this OR start/end) */
  preset?: DateRangePreset;

  /** Custom start timestamp (Unix seconds) */
  start?: number;

  /** Custom end timestamp (Unix seconds) */
  end?: number;
}

/**
 * Filter notes by date range
 *
 * Supports:
 * - Preset ranges (today, last 7 days, this month, etc.)
 * - Custom date ranges with start/end timestamps
 * - Filtering by created_at or modified_at
 * - Open-ended ranges (only start or only end)
 *
 * Examples:
 * ```typescript
 * // Notes created in last 7 days
 * new DateRangeFilter({
 *   field: DateField.CREATED_AT,
 *   preset: DateRangePreset.LAST_7_DAYS
 * })
 *
 * // Notes modified this week
 * new DateRangeFilter({
 *   field: DateField.MODIFIED_AT,
 *   preset: DateRangePreset.THIS_WEEK
 * })
 *
 * // Custom range
 * new DateRangeFilter({
 *   field: DateField.CREATED_AT,
 *   start: 1609459200, // 2021-01-01
 *   end: 1640995200    // 2022-01-01
 * })
 * ```
 */
export class DateRangeFilter extends FilterInterface {
  readonly filterType = FilterType.DATE_RANGE;
  private config: DateRangeFilterConfig;

  constructor(
    config: Omit<DateRangeFilterConfig, 'type'> | DateRangeFilterConfig
  ) {
    super();
    this.config = {
      type: FilterType.DATE_RANGE,
      ...config,
    };
  }

  apply(notes: Note[]): Note[] {
    return notes.filter((note) => this.matches(note));
  }

  applyWithContent(notes: NoteWithContent[]): NoteWithContent[] {
    return notes.filter((note) => this.matchesWithContent(note));
  }

  serialize(): FilterConfig {
    return { ...this.config };
  }

  validate(): FilterValidationResult {
    const errors: string[] = [];

    // Field must be specified
    if (!this.config.field) {
      errors.push('Date field must be specified');
    } else if (
      this.config.field !== DateField.CREATED_AT &&
      this.config.field !== DateField.MODIFIED_AT
    ) {
      errors.push('Field must be either created_at or modified_at');
    }

    // Must have either preset OR custom range
    if (
      !this.config.preset &&
      this.config.start === undefined &&
      this.config.end === undefined
    ) {
      errors.push(
        'Either preset or custom range (start/end) must be specified'
      );
    }

    // If using custom range, validate timestamps
    if (
      this.config.start !== undefined &&
      !Number.isFinite(this.config.start)
    ) {
      errors.push('Start timestamp must be a finite number');
    }

    if (this.config.end !== undefined && !Number.isFinite(this.config.end)) {
      errors.push('End timestamp must be a finite number');
    }

    // Start must be before end if both specified
    if (
      this.config.start !== undefined &&
      this.config.end !== undefined &&
      this.config.start > this.config.end
    ) {
      errors.push('Start date must be before or equal to end date');
    }

    return errors.length === 0
      ? validationSuccess()
      : validationFailure(errors);
  }

  getDescription(): string {
    const fieldName =
      this.config.field === DateField.CREATED_AT ? 'created' : 'modified';

    if (this.config.preset && this.config.preset !== DateRangePreset.CUSTOM) {
      return `Notes ${fieldName} ${this.getPresetDescription(this.config.preset)}`;
    }

    if (this.config.start !== undefined && this.config.end !== undefined) {
      const startDate = new Date(this.config.start * 1000).toLocaleDateString();
      const endDate = new Date(this.config.end * 1000).toLocaleDateString();
      return `Notes ${fieldName} between ${startDate} and ${endDate}`;
    }

    if (this.config.start !== undefined) {
      const startDate = new Date(this.config.start * 1000).toLocaleDateString();
      return `Notes ${fieldName} after ${startDate}`;
    }

    if (this.config.end !== undefined) {
      const endDate = new Date(this.config.end * 1000).toLocaleDateString();
      return `Notes ${fieldName} before ${endDate}`;
    }

    return `Notes filtered by ${fieldName} date`;
  }

  clone(): FilterInterface {
    return new DateRangeFilter({ ...this.config });
  }

  matches(note: Note): boolean {
    const timestamp =
      this.config.field === DateField.CREATED_AT
        ? note.created_at
        : note.modified_at;

    return this.isInRange(timestamp);
  }

  matchesWithContent(note: NoteWithContent): boolean {
    const timestamp =
      this.config.field === DateField.CREATED_AT
        ? note.created_at
        : note.modified_at;

    return this.isInRange(timestamp);
  }

  /**
   * Check if a timestamp is within the configured range
   */
  private isInRange(timestamp: number): boolean {
    const { start, end } = this.getEffectiveRange();

    if (start !== undefined && timestamp < start) {
      return false;
    }

    if (end !== undefined && timestamp > end) {
      return false;
    }

    return true;
  }

  /**
   * Get the effective start/end timestamps based on preset or custom range
   */
  private getEffectiveRange(): { start?: number; end?: number } {
    // If using preset, calculate range
    if (this.config.preset && this.config.preset !== DateRangePreset.CUSTOM) {
      return this.calculatePresetRange(this.config.preset);
    }

    // Otherwise use custom start/end
    return {
      start: this.config.start,
      end: this.config.end,
    };
  }

  /**
   * Calculate timestamp range for a preset
   */
  private calculatePresetRange(preset: DateRangePreset): {
    start?: number;
    end?: number;
  } {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStart = Math.floor(today.getTime() / 1000);
    const nowSec = Math.floor(now / 1000);

    switch (preset) {
      case DateRangePreset.TODAY:
        return { start: todayStart, end: nowSec };

      case DateRangePreset.YESTERDAY: {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = Math.floor(yesterday.getTime() / 1000);
        return { start: yesterdayStart, end: todayStart };
      }

      case DateRangePreset.LAST_7_DAYS:
        return { start: nowSec - 7 * 24 * 60 * 60, end: nowSec };

      case DateRangePreset.LAST_30_DAYS:
        return { start: nowSec - 30 * 24 * 60 * 60, end: nowSec };

      case DateRangePreset.LAST_90_DAYS:
        return { start: nowSec - 90 * 24 * 60 * 60, end: nowSec };

      case DateRangePreset.THIS_WEEK: {
        const weekStart = new Date(today);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as start
        weekStart.setDate(weekStart.getDate() - diff);
        return { start: Math.floor(weekStart.getTime() / 1000), end: nowSec };
      }

      case DateRangePreset.LAST_WEEK: {
        const weekStart = new Date(today);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(weekStart.getDate() - diff - 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return {
          start: Math.floor(weekStart.getTime() / 1000),
          end: Math.floor(weekEnd.getTime() / 1000),
        };
      }

      case DateRangePreset.THIS_MONTH: {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: Math.floor(monthStart.getTime() / 1000), end: nowSec };
      }

      case DateRangePreset.LAST_MONTH: {
        const lastMonthStart = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: Math.floor(lastMonthStart.getTime() / 1000),
          end: Math.floor(lastMonthEnd.getTime() / 1000),
        };
      }

      case DateRangePreset.THIS_YEAR: {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return { start: Math.floor(yearStart.getTime() / 1000), end: nowSec };
      }

      case DateRangePreset.LAST_YEAR: {
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear(), 0, 1);
        return {
          start: Math.floor(lastYearStart.getTime() / 1000),
          end: Math.floor(lastYearEnd.getTime() / 1000),
        };
      }

      default:
        return {};
    }
  }

  /**
   * Get human-readable description of a preset
   */
  private getPresetDescription(preset: DateRangePreset): string {
    switch (preset) {
      case DateRangePreset.TODAY:
        return 'today';
      case DateRangePreset.YESTERDAY:
        return 'yesterday';
      case DateRangePreset.LAST_7_DAYS:
        return 'in the last 7 days';
      case DateRangePreset.LAST_30_DAYS:
        return 'in the last 30 days';
      case DateRangePreset.LAST_90_DAYS:
        return 'in the last 90 days';
      case DateRangePreset.THIS_WEEK:
        return 'this week';
      case DateRangePreset.LAST_WEEK:
        return 'last week';
      case DateRangePreset.THIS_MONTH:
        return 'this month';
      case DateRangePreset.LAST_MONTH:
        return 'last month';
      case DateRangePreset.THIS_YEAR:
        return 'this year';
      case DateRangePreset.LAST_YEAR:
        return 'last year';
      default:
        return 'in custom range';
    }
  }
}
