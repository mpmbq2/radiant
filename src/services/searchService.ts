import MiniSearch from 'minisearch';
import type { NoteWithContent } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('SearchService');

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
 * Search configuration options
 */
export interface SearchOptions {
  /**
   * Fuzzy matching threshold (0-1, where 1 is exact match)
   * Default: 0.2
   */
  fuzzy?: number | boolean;

  /**
   * Prefix matching (autocomplete-style)
   * Default: true
   */
  prefix?: boolean;

  /**
   * Maximum number of results to return
   * Default: 50
   */
  limit?: number;

  /**
   * Boost factor for field importance
   */
  boost?: {
    title?: number;
    content?: number;
    tags?: number;
  };
}

/**
 * Search result with score and highlights
 */
export interface SearchResult {
  note: NoteWithContent;
  score: number;
  match: Record<string, string[]>;
}

/**
 * Service for full-text search using MiniSearch
 * Runs in the main process and indexes all notes
 */
export class SearchService {
  private miniSearch: MiniSearch<SearchDocument>;
  private isInitialized = false;

  constructor() {
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

    logger.info('SearchService initialized with MiniSearch configuration');
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
   * Search notes using full-text search
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<{ id: string; score: number; match: Record<string, string[]> }[]> {
    if (!this.isInitialized) {
      logger.warn('Search index not initialized, returning empty results');
      return [];
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      const results = this.miniSearch.search(query, {
        fuzzy: options.fuzzy ?? 0.2,
        prefix: options.prefix ?? true,
        boost: options.boost ?? { title: 3, tags: 2, content: 1 },
        combineWith: 'AND',
      });

      // Apply result limit if specified
      const limitedResults = options.limit
        ? results.slice(0, options.limit)
        : results.slice(0, 50);

      logger.debug('Search completed', {
        query,
        resultCount: limitedResults.length,
      });

      return limitedResults;
    } catch (error) {
      logger.error('Search failed', error);
      throw error;
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(
    query: string,
    options: { limit?: number } = {}
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
   * Check if the search index is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get index statistics
   */
  getStats(): { documentCount: number; termCount: number } {
    return {
      documentCount: this.miniSearch.documentCount,
      termCount: this.miniSearch.termCount,
    };
  }
}

// Lazy singleton instance
let _instance: SearchService | null = null;

export function getSearchService(): SearchService {
  if (!_instance) {
    _instance = new SearchService();
  }
  return _instance;
}
