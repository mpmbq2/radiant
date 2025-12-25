# Search Provider Pattern Architecture

## Overview

Radiant uses the **Provider Pattern** for search functionality, allowing the application to switch between different search implementations without modifying calling code. This architectural decision enables future migration from full-text search to semantic vector search while maintaining a consistent API.

## Architecture

### Core Components

1. **SearchProvider** (`src/services/SearchProvider.ts`)
   - Abstract base class defining the search contract
   - Enforces consistent interface across all implementations
   - Provides default implementations for optional methods

2. **MiniSearchProvider** (future: `src/services/MiniSearchProvider.ts`)
   - Full-text search implementation using MiniSearch library
   - Current implementation in `SearchService` will be refactored to this
   - Supports fuzzy matching, prefix search, and field boosting

3. **VectorSearchProvider** (future: `src/services/VectorSearchProvider.ts`)
   - Semantic search using embeddings (planned)
   - Will integrate with AI infrastructure (radiant-fot)
   - Supports similarity-based matching

4. **SearchFactory** (future: `src/services/SearchFactory.ts`)
   - Factory pattern for provider instantiation
   - Allows runtime selection of search provider
   - Manages provider lifecycle

## SearchProvider Interface

### Core Methods

#### `indexNotes(notes: NoteWithContent[]): Promise<void>`
Initializes or rebuilds the search index with all notes.

**Implementation Requirements:**
- Clear any existing index
- Process all notes for indexing
- Build/update the search index
- Handle errors gracefully

**Example:**
```typescript
await provider.indexNotes(allNotes);
```

#### `addNote(note: NoteWithContent): Promise<void>`
Adds a single note to the search index.

**Implementation Requirements:**
- Handle both new notes and updates
- If note exists, update it (idempotent operation)
- Optimize for incremental updates

**Example:**
```typescript
await provider.addNote(newNote);
```

#### `updateNote(note: NoteWithContent): Promise<void>`
Updates an existing note in the search index.

**Implementation Requirements:**
- Update all indexed fields
- Re-compute relevance data if needed
- Handle missing notes gracefully

**Example:**
```typescript
await provider.updateNote(modifiedNote);
```

#### `removeNote(noteId: string): Promise<void>`
Removes a note from the search index.

**Implementation Requirements:**
- Remove all traces of the note
- Handle missing notes gracefully
- Clean up orphaned data

**Example:**
```typescript
await provider.removeNote('note-123');
```

#### `search(query: string, options?: SearchOptions): Promise<SearchResult[]>`
Searches for notes matching the query.

**Implementation Requirements:**
- Parse and process the query
- Rank results by relevance
- Apply options (limit, boost, etc.)
- Return results with scores and match information

**Example:**
```typescript
const results = await provider.search('TypeScript patterns', {
  limit: 20,
  boost: { title: 3, tags: 2, content: 1 }
});
```

#### `getSuggestions(query: string, options?: SuggestionOptions): Promise<string[]>`
Gets search suggestions for autocomplete (optional).

**Implementation Requirements:**
- Return relevant completions
- Limit number of suggestions
- Return empty array if not supported

**Example:**
```typescript
const suggestions = await provider.getSuggestions('Type', { limit: 5 });
// Returns: ['TypeScript', 'Types', 'Type safety', ...]
```

#### `isReady(): boolean`
Checks if the search index is initialized and ready.

**Example:**
```typescript
if (provider.isReady()) {
  // Perform search
}
```

#### `getStats(): SearchStats`
Gets statistics about the search index.

**Returns:**
- `documentCount`: Total number of indexed documents
- Provider-specific metrics (termCount, embeddingDimension, etc.)

**Example:**
```typescript
const stats = provider.getStats();
console.log(`Indexed ${stats.documentCount} notes`);
```

#### `dispose(): Promise<void>`
Cleans up resources (optional).

**Implementation Requirements:**
- Close connections
- Release memory
- Clear caches

## Implementation Guide

### Creating a New Provider

1. **Extend SearchProvider**
```typescript
import { SearchProvider, SearchOptions, SearchResult } from './SearchProvider';
import type { NoteWithContent } from '../types';

export class MySearchProvider extends SearchProvider {
  private index: YourIndexType;
  private initialized = false;

  async indexNotes(notes: NoteWithContent[]): Promise<void> {
    // Implementation
  }

  async addNote(note: NoteWithContent): Promise<void> {
    // Implementation
  }

  async updateNote(note: NoteWithContent): Promise<void> {
    // Implementation
  }

  async removeNote(noteId: string): Promise<void> {
    // Implementation
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // Implementation
  }

  isReady(): boolean {
    return this.initialized;
  }

  getStats(): SearchStats {
    return {
      documentCount: this.index.size,
      // Provider-specific stats
    };
  }
}
```

2. **Handle Provider-Specific Options**
```typescript
interface MySearchOptions extends SearchOptions {
  // Provider-specific options
  similarityThreshold?: number;
  embeddingModel?: string;
}

async search(query: string, options?: MySearchOptions): Promise<SearchResult[]> {
  const threshold = options?.similarityThreshold ?? 0.7;
  // Use provider-specific options
}
```

3. **Implement Lifecycle Methods**
```typescript
async dispose(): Promise<void> {
  // Clean up resources
  await this.index.close();
  this.initialized = false;
}
```

## Migration Path

### Current State (Phase 4.1)
- `SearchService` with MiniSearch implementation
- Direct instantiation and usage
- No provider abstraction

### Phase 4.2: Provider Pattern
1. Create `SearchProvider` abstract class ✅
2. Refactor `SearchService` → `MiniSearchProvider`
3. Create `SearchFactory` for provider selection
4. Update IPC handlers to use factory

### Phase 4.3: Future Extensions
1. Implement `VectorSearchProvider`
   - Use embeddings from AI infrastructure
   - Semantic similarity search
   - Hybrid search (combine with full-text)

2. Add provider selection
   - User preference in settings
   - Automatic fallback if provider unavailable
   - A/B testing different providers

## Type Definitions

### SearchOptions
```typescript
interface SearchOptions {
  limit?: number;           // Max results
  boost?: {                 // Field importance
    title?: number;
    content?: number;
    tags?: number;
  };
  [key: string]: unknown;   // Provider-specific options
}
```

### SearchResult
```typescript
interface SearchResult {
  id: string;               // Note ID
  score: number;            // Relevance score
  match: Record<string, string[]>; // Matched fields and terms
}
```

### SearchStats
```typescript
interface SearchStats {
  documentCount: number;    // Total indexed documents
  [key: string]: number;    // Provider-specific stats
}
```

## Integration with NotesService

The search provider integrates with `NotesService` for automatic index updates:

```typescript
class NotesService {
  private searchProvider: SearchProvider;

  async createNote(input: CreateNoteInput): Promise<NoteWithContent> {
    const note = await this.repository.create(input);
    await this.searchProvider.addNote(note); // Auto-index
    return note;
  }

  async updateNote(input: UpdateNoteInput): Promise<NoteWithContent> {
    const note = await this.repository.update(input);
    await this.searchProvider.updateNote(note); // Auto-update
    return note;
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.repository.delete(noteId);
    await this.searchProvider.removeNote(noteId); // Auto-remove
  }
}
```

## Performance Considerations

### Full-Text Search (MiniSearch)
- **Indexing**: Fast, in-memory
- **Search**: Sub-millisecond for typical queries
- **Memory**: ~1-2KB per document
- **Best for**: Keyword search, exact matches, prefix matching

### Vector Search (Future)
- **Indexing**: Slower (requires embedding generation)
- **Search**: Fast with optimized vector DB
- **Memory**: ~4KB per document (768-dim embeddings)
- **Best for**: Semantic search, concept matching, similar notes

### Hybrid Approach
- Combine both providers for best results
- Use full-text for initial filtering
- Re-rank with vector search for semantic relevance

## Testing

### Unit Tests
```typescript
describe('SearchProvider', () => {
  let provider: SearchProvider;

  beforeEach(() => {
    provider = new MySearchProvider();
  });

  it('should index notes', async () => {
    await provider.indexNotes(mockNotes);
    expect(provider.isReady()).toBe(true);
    expect(provider.getStats().documentCount).toBe(mockNotes.length);
  });

  it('should search notes', async () => {
    await provider.indexNotes(mockNotes);
    const results = await provider.search('test query');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('score');
  });
});
```

### Integration Tests
- Test provider with actual NotesService
- Verify index updates on CRUD operations
- Test provider switching
- Benchmark performance

## Future Enhancements

1. **Search Analytics**
   - Track popular queries
   - Measure search quality
   - A/B test different providers

2. **Advanced Features**
   - Faceted search (filter by tag, date, etc.)
   - Highlighting matched text
   - "Did you mean?" suggestions
   - Related notes recommendations

3. **Optimization**
   - Incremental indexing
   - Background index rebuilding
   - Search result caching
   - Query optimization

## References

- MiniSearch: https://github.com/lucaong/minisearch
- Vector Search: Planned with AI infrastructure (radiant-fot)
- Provider Pattern: https://refactoring.guru/design-patterns/abstract-factory
