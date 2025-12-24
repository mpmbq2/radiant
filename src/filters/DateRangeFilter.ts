import type { Note, NoteWithContent } from '../types';
import {
  FilterInterface,
  BaseFilterConfig,
  FilterConfig,
  FilterValidationResult,
  validationSuccess,
  validationFailure,
} from './FilterInterface';
import { FilterType, DateRangePreset, DateField } from './types';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
} from 'date-fns';

/**
 * Configuration for DateRangeFilter
 */
export interface DateRangeFilterConfig extends BaseFilterConfig {
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
   *
   * Range comparisons are inclusive: [start, end]
   * - timestamp >= start (if start is defined)
   * - timestamp <= end (if end is defined)
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
   *
   * Returns timestamps in MILLISECONDS to match the database format.
   * Custom config values (in seconds) are converted to milliseconds.
   */
  private getEffectiveRange(): { start?: number; end?: number } {
    // If using preset, calculate range (returns milliseconds)
    if (this.config.preset && this.config.preset !== DateRangePreset.CUSTOM) {
      return this.calculatePresetRange(this.config.preset);
    }

    // Convert custom start/end from seconds to milliseconds for comparison with database timestamps
    return {
      start: this.config.start !== undefined ? this.config.start * 1000 : undefined,
      end: this.config.end !== undefined ? this.config.end * 1000 : undefined,
    };
  }

  /**
   * Calculate timestamp range for a preset
   *
   * Uses date-fns for robust date handling that properly accounts for:
   * - DST transitions (days can be 23 or 25 hours)
   * - Timezone offsets
   * - Leap years
   * - Month boundaries
   *
   * Returns timestamps in MILLISECONDS to match database format.
   * All ranges are inclusive [start, end] using start-of-day and end-of-day.
   */
  private calculatePresetRange(preset: DateRangePreset): {
    start?: number;
    end?: number;
  } {
    const now = new Date();

    switch (preset) {
      case DateRangePreset.TODAY:
        // From start of today to end of today (inclusive full day)
        return {
          start: startOfDay(now).getTime(),
          end: endOfDay(now).getTime(),
        };

      case DateRangePreset.YESTERDAY: {
        // Full day yesterday (start to end)
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday).getTime(),
          end: endOfDay(yesterday).getTime(),
        };
      }

      case DateRangePreset.LAST_7_DAYS: {
        // Last 7 complete days including today
        // Using subDays properly handles DST transitions
        const weekAgo = subDays(now, 6); // 6 days ago + today = 7 days
        return {
          start: startOfDay(weekAgo).getTime(),
          end: endOfDay(now).getTime(),
        };
      }

      case DateRangePreset.LAST_30_DAYS: {
        // Last 30 complete days including today
        const monthAgo = subDays(now, 29); // 29 days ago + today = 30 days
        return {
          start: startOfDay(monthAgo).getTime(),
          end: endOfDay(now).getTime(),
        };
      }

      case DateRangePreset.LAST_90_DAYS: {
        // Last 90 complete days including today
        const quarterAgo = subDays(now, 89); // 89 days ago + today = 90 days
        return {
          start: startOfDay(quarterAgo).getTime(),
          end: endOfDay(now).getTime(),
        };
      }

      case DateRangePreset.THIS_WEEK: {
        // Current week (Monday-Sunday) up to end of today
        // weekStartsOn: 1 means Monday
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        return {
          start: weekStart.getTime(),
          end: endOfDay(now).getTime(),
        };
      }

      case DateRangePreset.LAST_WEEK: {
        // Complete previous week (Monday-Sunday)
        const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        return {
          start: lastWeekStart.getTime(),
          end: lastWeekEnd.getTime(),
        };
      }

      case DateRangePreset.THIS_MONTH: {
        // Current month from 1st to end of today
        const monthStart = startOfMonth(now);
        return {
          start: monthStart.getTime(),
          end: endOfDay(now).getTime(),
        };
      }

      case DateRangePreset.LAST_MONTH: {
        // Complete previous month
        // subMonths properly handles month boundaries and leap years
        const lastMonthDate = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonthDate).getTime(),
          end: endOfMonth(lastMonthDate).getTime(),
        };
      }

      case DateRangePreset.THIS_YEAR: {
        // Current year from Jan 1 to end of today
        const yearStart = startOfYear(now);
        return {
          start: yearStart.getTime(),
          end: endOfDay(now).getTime(),
        };
      }

      case DateRangePreset.LAST_YEAR: {
        // Complete previous year (Jan 1 - Dec 31)
        // Properly handles leap years
        const lastYearDate = subYears(now, 1);
        return {
          start: startOfYear(lastYearDate).getTime(),
          end: endOfYear(lastYearDate).getTime(),
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
