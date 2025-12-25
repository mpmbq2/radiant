import type { NoteWithContent } from '../types';
import { MiniSearchProvider } from './MiniSearchProvider';
import type { SearchOptions, SearchResult } from './SearchProvider';
import { createLogger } from '../utils/logger';

const logger = createLogger('SearchService');

/**
 * Service for full-text search using MiniSearchProvider
 * Runs in the main process and indexes all notes
 *
 * This service acts as a facade, delegating to the MiniSearchProvider
 * implementation while maintaining backward compatibility.
 */
export class SearchService {
  private provider: MiniSearchProvider;

  constructor() {
    // Use MiniSearchProvider for search functionality
    this.provider = new MiniSearchProvider();
    logger.info('SearchService initialized with MiniSearchProvider');
  }

  /**
   * Initialize or rebuild the search index with all notes
   */
  async indexNotes(notes: NoteWithContent[]): Promise<void> {
    return this.provider.indexNotes(notes);
  }

  /**
   * Add a single note to the search index
   */
  async addNote(note: NoteWithContent): Promise<void> {
    return this.provider.addNote(note);
  }

  /**
   * Update a note in the search index
   */
  async updateNote(note: NoteWithContent): Promise<void> {
    return this.provider.updateNote(note);
  }

  /**
   * Remove a note from the search index
   */
  async removeNote(noteId: string): Promise<void> {
    return this.provider.removeNote(noteId);
  }

  /**
   * Search notes using full-text search
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    return this.provider.search(query, options);
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(
    query: string,
    options: { limit?: number } = {}
  ): Promise<string[]> {
    return this.provider.getSuggestions(query, options);
  }

  /**
   * Check if the search index is initialized
   */
  isReady(): boolean {
    return this.provider.isReady();
  }

  /**
   * Get index statistics
   */
  getStats(): { documentCount: number; termCount: number } {
    return this.provider.getStats();
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
