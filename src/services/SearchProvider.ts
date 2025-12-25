import type { NoteWithContent } from '../types';

/**
 * Search configuration options
 * Generic options that can be extended by specific providers
 */
export interface SearchOptions {
  /**
   * Maximum number of results to return
   * Default: 50
   */
  limit?: number;

  /**
   * Field-specific boost factors for relevance scoring
   */
  boost?: {
    title?: number;
    content?: number;
    tags?: number;
  };

  /**
   * Provider-specific options
   * Full-text search: fuzzy, prefix
   * Vector search: similarityThreshold, etc.
   */
  [key: string]: unknown;
}

/**
 * Search result with relevance score and matched fields
 */
export interface SearchResult {
  /**
   * Note ID
   */
  id: string;

  /**
   * Relevance score (higher = more relevant)
   * Scoring mechanism is provider-specific
   */
  score: number;

  /**
   * Fields that matched the query with matched terms
   * Key: field name (title, content, tags)
   * Value: array of matched terms
   */
  match: Record<string, string[]>;
}

/**
 * Search suggestion options
 */
export interface SuggestionOptions {
  /**
   * Maximum number of suggestions to return
   * Default: 5
   */
  limit?: number;
}

/**
 * Search index statistics
 */
export interface SearchStats {
  /**
   * Total number of documents in the index
   */
  documentCount: number;

  /**
   * Provider-specific statistics
   * Full-text: termCount
   * Vector: embeddingDimension, etc.
   */
  [key: string]: number;
}

/**
 * Abstract base class for search providers
 *
 * This interface defines the contract for all search implementations,
 * allowing the application to switch between different search backends
 * (full-text search, vector search, etc.) without changing the calling code.
 *
 * Implementations:
 * - MiniSearchProvider: Full-text search using MiniSearch library
 * - VectorSearchProvider (future): Semantic search using embeddings
 *
 * @example
 * ```typescript
 * const provider = new MiniSearchProvider();
 * await provider.indexNotes(allNotes);
 * const results = await provider.search('query string');
 * ```
 */
export abstract class SearchProvider {
  /**
   * Initialize or rebuild the search index with all notes
   *
   * This method should:
   * 1. Clear any existing index
   * 2. Process all notes for indexing
   * 3. Build the search index
   *
   * @param notes - Array of all notes to index
   */
  abstract indexNotes(notes: NoteWithContent[]): Promise<void>;

  /**
   * Add a single note to the search index
   *
   * This method should handle both new notes and updates to existing notes.
   * If the note already exists in the index, it should be updated.
   *
   * @param note - Note to add to the index
   */
  abstract addNote(note: NoteWithContent): Promise<void>;

  /**
   * Update a note in the search index
   *
   * This method updates an existing note in the index.
   * If the note doesn't exist, behavior is implementation-specific.
   *
   * @param note - Note with updated data
   */
  abstract updateNote(note: NoteWithContent): Promise<void>;

  /**
   * Remove a note from the search index
   *
   * @param noteId - ID of the note to remove
   */
  abstract removeNote(noteId: string): Promise<void>;

  /**
   * Search for notes matching the query
   *
   * @param query - Search query string
   * @param options - Search configuration options
   * @returns Array of search results with scores and match information
   */
  abstract search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]>;

  /**
   * Get search suggestions for autocomplete
   *
   * This method is optional and may not be supported by all providers.
   * Default implementation returns an empty array.
   *
   * @param query - Partial query string
   * @param options - Suggestion options
   * @returns Array of suggested completions
   */
  async getSuggestions(
    query: string,
    options?: SuggestionOptions
  ): Promise<string[]> {
    // Default implementation - providers can override
    return [];
  }

  /**
   * Check if the search index is initialized and ready
   *
   * @returns true if index is ready, false otherwise
   */
  abstract isReady(): boolean;

  /**
   * Get statistics about the search index
   *
   * @returns Index statistics (document count, etc.)
   */
  abstract getStats(): SearchStats;

  /**
   * Optional: Clean up resources when the provider is no longer needed
   *
   * This method can be overridden by providers that need cleanup
   * (e.g., closing database connections, releasing memory)
   */
  async dispose(): Promise<void> {
    // Default implementation - providers can override if needed
  }
}
