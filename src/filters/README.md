# Filter System Architecture

## Overview

The filter system provides a configuration-driven architecture for filtering notes based on various criteria. Filters are composable, serializable, and type-safe.

## Design Principles

### 1. Immutability
Filters never mutate the input array. The `apply()` method always returns a new filtered array.

```typescript
const filtered = filter.apply(notes); // notes is unchanged
```

### 2. Serializability
All filters can be serialized to JSON and deserialized back. This enables:
- Saving filter configurations
- Sharing filters between users
- Implementing filter presets
- Undo/redo functionality

```typescript
const config = filter.serialize();
const json = JSON.stringify(config);

// Later...
const restored = createFilterFromConfig(JSON.parse(json));
```

### 3. Composability
Filters can be combined using logical operators (AND, OR, NOT) via CompositeFilter:

```typescript
const workFilter = new TagFilter({ tags: ['work'] });
const recentFilter = new DateRangeFilter({ preset: DateRangePreset.LAST_7_DAYS });
const composite = new CompositeFilter({
  operator: LogicalOperator.AND,
  filters: [workFilter, recentFilter]
});
```

### 4. Type Safety
TypeScript ensures filters are used correctly at compile time.

## Core Components

### FilterInterface (Abstract Base Class)

The base class that all filters must extend. Defines the contract for filter implementations.

**Key Methods:**
- `apply(notes: Note[]): Note[]` - Filter notes metadata only
- `applyWithContent(notes: NoteWithContent[]): NoteWithContent[]` - Filter notes with content
- `serialize(): FilterConfig` - Convert to serializable config
- `validate(): FilterValidationResult` - Check if configuration is valid
- `matches(note: Note): boolean` - Test single note
- `getDescription(): string` - Human-readable description

**Properties:**
- `filterType: string` - Unique identifier for this filter class

### FilterConfig

Serializable configuration object. Each concrete filter defines its own structure:

```typescript
interface FilterConfig {
  type: string;  // FilterType enum value
  [key: string]: any;  // Filter-specific config
}
```

### FilterValidationResult

Result of validating a filter configuration:

```typescript
interface FilterValidationResult {
  isValid: boolean;
  errors: string[];
}
```

## Planned Concrete Filters

### TagFilter
Filter notes by tags with various operators.

```typescript
// Single tag (OR by default)
{ type: 'TAG', tags: ['work'] }

// Multiple tags with AND
{ type: 'TAG', tags: ['work', 'urgent'], operator: LogicalOperator.AND }

// Exclude tags
{ type: 'TAG', excludeTags: ['archived'] }
```

### DateRangeFilter
Filter notes by date ranges using presets or custom ranges.

```typescript
// Preset range
{ type: 'DATE_RANGE', preset: DateRangePreset.LAST_7_DAYS, field: 'created_at' }

// Custom range
{ type: 'DATE_RANGE', start: 1234567890, end: 1234567999, field: 'modified_at' }
```

### ContentFilter
Filter notes by content using text search or regex.

```typescript
// Simple text search
{ type: 'CONTENT', query: 'important', operator: ComparisonOperator.CONTAINS }

// Case-sensitive
{ type: 'CONTENT', query: 'API', caseSensitive: true }

// Regex
{ type: 'CONTENT', pattern: 'TODO: .*', operator: ComparisonOperator.MATCHES_REGEX }
```

### CompositeFilter
Combine multiple filters with logical operators.

```typescript
{
  type: 'COMPOSITE',
  operator: LogicalOperator.AND,
  filters: [
    { type: 'TAG', tags: ['work'] },
    { type: 'DATE_RANGE', preset: DateRangePreset.LAST_30_DAYS }
  ]
}
```

## Usage Examples

### Basic Filter Application

```typescript
import { FilterInterface } from './filters';
import { notesService } from '../services/notesService';

// Create filter
const filter = new TagFilter({ tags: ['work'] });

// Get all notes
const allNotes = await notesService.getAllNotes();

// Apply filter
const workNotes = filter.apply(allNotes);
```

### Filter Validation

```typescript
const filter = new TagFilter({ tags: [] }); // Invalid - no tags

const validation = filter.validate();
if (!validation.isValid) {
  console.error('Filter errors:', validation.errors);
  // ["At least one tag must be specified"]
}
```

### Filter Serialization

```typescript
// Create and configure filter
const filter = new DateRangeFilter({
  preset: DateRangePreset.LAST_7_DAYS,
  field: DateField.CREATED_AT
});

// Serialize
const config = filter.serialize();
localStorage.setItem('savedFilter', JSON.stringify(config));

// Deserialize (via FilterRegistry - to be implemented)
const json = localStorage.getItem('savedFilter');
const restoredFilter = filterRegistry.createFromConfig(JSON.parse(json));
```

### Combining Filters

```typescript
// Create multiple filters
const tagFilter = new TagFilter({ tags: ['work'] });
const dateFilter = new DateRangeFilter({ preset: DateRangePreset.THIS_WEEK });
const contentFilter = new ContentFilter({ query: 'urgent' });

// Combine with AND
const composite = new CompositeFilter({
  operator: LogicalOperator.AND,
  filters: [tagFilter, dateFilter, contentFilter]
});

// Apply to notes
const filtered = composite.apply(allNotes);
// Returns: notes tagged 'work', created this week, containing 'urgent'
```

## Implementation Guidelines

### Creating a New Filter

1. Extend `FilterInterface`
2. Define your filter's configuration interface
3. Implement all abstract methods
4. Add comprehensive validation
5. Write unit tests

Example skeleton:

```typescript
interface MyFilterConfig {
  // Your config properties
}

class MyFilter extends FilterInterface {
  readonly filterType = FilterType.MY_FILTER;
  private config: MyFilterConfig;

  constructor(config: MyFilterConfig) {
    super();
    this.config = config;
  }

  apply(notes: Note[]): Note[] {
    return notes.filter(note => this.matches(note));
  }

  applyWithContent(notes: NoteWithContent[]): NoteWithContent[] {
    return notes.filter(note => this.matchesWithContent(note));
  }

  serialize(): FilterConfig {
    return {
      type: this.filterType,
      ...this.config
    };
  }

  validate(): FilterValidationResult {
    const errors: string[] = [];
    // Add validation logic
    return errors.length === 0
      ? validationSuccess()
      : validationFailure(errors);
  }

  getDescription(): string {
    return `My filter: ${this.config}`;
  }

  clone(): FilterInterface {
    return new MyFilter({ ...this.config });
  }

  matches(note: Note): boolean {
    // Implement matching logic
    return true;
  }

  matchesWithContent(note: NoteWithContent): boolean {
    // Implement matching logic
    return true;
  }
}
```

## FilterRegistry (To Be Implemented)

The FilterRegistry will:
- Register filter factories by type
- Create filters from serialized configs
- Provide filter metadata and documentation
- Enable plugin-based filter extensions

```typescript
// Future API
filterRegistry.register(FilterType.TAG, TagFilter);
const filter = filterRegistry.createFromConfig(config);
const allTypes = filterRegistry.getAvailableTypes();
```

## Performance Considerations

### Lazy Evaluation
For large note collections, consider implementing lazy evaluation:

```typescript
// Instead of filtering entire array
const filtered = filter.apply(largeArray);

// Use iterative matching
for (const note of largeArray) {
  if (filter.matches(note)) {
    // Process matched note
  }
}
```

### Optimization Strategies
- Use indexes for common filters (tags, dates)
- Cache filter results when configuration unchanged
- Short-circuit evaluation in composite filters
- Profile filter performance for bottlenecks

## Next Steps

1. **Phase 3.2**: Implement FilterRegistry for creating filters from config
2. **Phase 3.3**: Implement TagFilter
3. **Phase 3.4**: Implement DateRangeFilter
4. **Phase 3.5**: Implement ContentFilter
5. **Phase 3.6**: Implement CompositeFilter
6. **Phase 3.7**: Build filter configuration UI
7. **Phase 3.8**: Add filter persistence
8. **Phase 3.9**: Implement filter presets
9. **Phase 3.10**: Add comprehensive tests

## Testing Strategy

### Unit Tests
- Test each filter in isolation
- Validate serialization/deserialization
- Test edge cases (empty arrays, null values)
- Verify immutability

### Integration Tests
- Test filter combinations
- Test with real note data
- Test serialization round-trips
- Performance benchmarks

### Example Test

```typescript
describe('TagFilter', () => {
  it('should filter notes by single tag', () => {
    const filter = new TagFilter({ tags: ['work'] });
    const notes = [
      { id: '1', tags: ['work'] },
      { id: '2', tags: ['personal'] }
    ];
    const result = filter.apply(notes);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should serialize and deserialize correctly', () => {
    const filter = new TagFilter({ tags: ['work', 'urgent'] });
    const config = filter.serialize();
    const restored = new TagFilter(config);
    expect(restored.getDescription()).toBe(filter.getDescription());
  });
});
```
