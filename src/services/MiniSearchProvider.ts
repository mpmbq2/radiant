import MiniSearch from 'minisearch';
import type { NoteWithContent } from '../types';
import {
  SearchProvider,
  type SearchOptions,
  type SearchResult,
  type SuggestionOptions,
  type SearchStats,
} from './SearchProvider';
import { createLogger } from '../utils/logger';

const logger = createLogger('MiniSearchProvider');

/**
 * Document structure for MiniSearch indexing
 */
interface SearchDocument {
  id: string;
  title: string;
  content: string;
  tags: string;
}

/**
 * Extended search options for MiniSearch-specific features
 */
export interface MiniSearchOptions extends SearchOptions {
  /**
   * Fuzzy matching threshold (0-1, where 1 is exact match)
   * Can also be a boolean (true = 0.2)
   * Default: 0.2
   */
  fuzzy?: number | boolean;

  /**
   * Prefix matching (autocomplete-style)
   * Default: true
   */
  prefix?: boolean;

  /**
   * Combine terms with AND or OR
   * Default: 'AND'
   */
  combineWith?: 'AND' | 'OR';
}

/**
 * MiniSearch-based implementation of SearchProvider
 *
 * Provides full-text search with:
 * - Fuzzy matching for typo tolerance
 * - Prefix matching for autocomplete
 * - Field-specific boosting (title > tags > content)
 * - Incremental index updates
 * - Auto-suggestions
 *
 * @example
 * ```typescript
 * const provider = new MiniSearchProvider();
 * await provider.indexNotes(allNotes);
 * const results = await provider.search('javascript async', {
 *   fuzzy: 0.2,
 *   prefix: true,
 *   limit: 10
 * });
 * ```
 */
export class MiniSearchProvider extends SearchProvider {
  private miniSearch: MiniSearch<SearchDocument>;
  private isInitialized = false;

  constructor() {
    super();

    // Configure MiniSearch with optimized settings
    this.miniSearch = new MiniSearch<SearchDocument>({
      // Fields to index
      fields: ['title', 'content', 'tags'],

      // Fields to store for display (all fields)
      storeFields: ['title', 'content', 'tags'],

      // Field for document ID
      idField: 'id',

      // Boost title matches over content and tags
      boost: {
        title: 3, // Title matches are 3x more important
        tags: 2, // Tag matches are 2x more important
        content: 1, // Content has base importance
      },

      // Tokenization options
      processTerm: (term) => {
        // Convert to lowercase and remove very short terms
        const processed = term.toLowerCase();
        return processed.length < 2 ? null : processed;
      },

      // Search options defaults
      searchOptions: {
        boost: {
          title: 3,
          tags: 2,
          content: 1,
        },
        fuzzy: 0.2, // Allow some typos
        prefix: true, // Enable prefix matching (autocomplete)
        combineWith: 'AND', // All terms must match
      },
    });

    logger.info('MiniSearchProvider initialized');
  }

  /**
   * Initialize or rebuild the search index with all notes
   */
  async indexNotes(notes: NoteWithContent[]): Promise<void> {
    logger.info('Indexing notes', { count: notes.length });

    try {
      // Clear existing index
      this.miniSearch.removeAll();

      // Convert notes to search documents
      const documents: SearchDocument[] = notes.map((note) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags.join(' '), // Join tags into searchable text
      }));

      // Bulk add documents to index
      this.miniSearch.addAll(documents);
      this.isInitialized = true;

      logger.info('Search index built successfully', {
        documentCount: documents.length,
      });
    } catch (error) {
      logger.error('Failed to build search index', error);
      throw error;
    }
  }

  /**
   * Add a single note to the search index
   * Handles both new notes and updates to existing notes
   */
  async addNote(note: NoteWithContent): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('Search index not initialized, skipping add operation');
      return;
    }

    const document: SearchDocument = {
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags.join(' '),
    };

    try {
      this.miniSearch.add(document);
      logger.debug('Note added to search index', { noteId: note.id });
    } catch (error) {
      // If document already exists, update it instead
      this.miniSearch.replace(document);
      logger.debug('Note replaced in search index', { noteId: note.id });
    }
  }

  /**
   * Update a note in the search index
   */
  async updateNote(note: NoteWithContent): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('Search index not initialized, skipping update operation');
      return;
    }

    const document: SearchDocument = {
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags.join(' '),
    };

    try {
      this.miniSearch.replace(document);
      logger.debug('Note updated in search index', { noteId: note.id });
    } catch (error) {
      logger.error('Failed to update note in search index', error);
      throw error;
    }
  }

  /**
   * Remove a note from the search index
   */
  async removeNote(noteId: string): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('Search index not initialized, skipping remove operation');
      return;
    }

    try {
      this.miniSearch.discard(noteId);
      logger.debug('Note removed from search index', { noteId });
    } catch (error) {
      logger.error('Failed to remove note from search index', error);
      throw error;
    }
  }

  /**
   * Search notes using full-text search with ranking
   *
   * Results are automatically ranked by MiniSearch based on:
   * - Field boost factors (title > tags > content)
   * - Term frequency (TF-IDF)
   * - Match quality (exact vs fuzzy vs prefix)
   */
  async search(
    query: string,
    options: MiniSearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      logger.warn('Search index not initialized, returning empty results');
      return [];
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      // Merge user options with defaults
      const searchOptions = {
        fuzzy: options.fuzzy ?? 0.2,
        prefix: options.prefix ?? true,
        boost: options.boost ?? { title: 3, tags: 2, content: 1 },
        combineWith: (options.combineWith ?? 'AND') as 'AND' | 'OR',
      };

      // Perform search
      const rawResults = this.miniSearch.search(query, searchOptions);

      // Apply result limit if specified
      const limitedResults = options.limit
        ? rawResults.slice(0, options.limit)
        : rawResults.slice(0, 50);

      // Transform to SearchResult format with highlighting info
      const results: SearchResult[] = limitedResults.map((result) => ({
        id: result.id,
        score: result.score,
        match: result.match ?? {}, // Include matched fields for highlighting
      }));

      logger.debug('Search completed', {
        query,
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Search failed', error);
      throw error;
    }
  }

  /**
   * Get search suggestions for autocomplete
   *
   * Returns suggested query completions based on indexed content
   */
  async getSuggestions(
    query: string,
    options: SuggestionOptions = {}
  ): Promise<string[]> {
    if (!this.isInitialized || !query || query.trim().length === 0) {
      return [];
    }

    try {
      const suggestions = this.miniSearch.autoSuggest(query, {
        fuzzy: 0.2,
        boost: { title: 3, tags: 2, content: 1 },
      });

      const limit = options.limit ?? 5;
      return suggestions.slice(0, limit).map((s) => s.suggestion);
    } catch (error) {
      logger.error('Failed to get search suggestions', error);
      return [];
    }
  }

  /**
   * Check if the search index is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get statistics about the search index
   */
  getStats(): SearchStats {
    return {
      documentCount: this.miniSearch.documentCount,
      termCount: this.miniSearch.termCount,
    };
  }

  /**
   * Clean up resources
   * MiniSearch is in-memory, so no cleanup needed
   */
  async dispose(): Promise<void> {
    this.miniSearch.removeAll();
    this.isInitialized = false;
    logger.info('MiniSearchProvider disposed');
  }
}
