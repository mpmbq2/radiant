<script lang="ts">
  import { notesStore } from '../stores/notesStore';
  import { subscribeStore } from '../utils/useStore.svelte';
  import NoteListItem from './NoteListItem.svelte';
  import type { NoteWithContent } from '../../types';
  import type { FilterInterface } from '../../filters';

  const store = notesStore;

  let notes = $state(store.getState().notes);
  let currentNoteId = $state(store.getState().currentNoteId);
  let searchQuery = $state(store.getState().searchQuery);
  let activeFilters = $state(store.getState().activeFilters);

  // Subscribe to store changes with automatic cleanup
  subscribeStore(store, (state) => {
    notes = state.notes;
    currentNoteId = state.currentNoteId;
    searchQuery = state.searchQuery;
    activeFilters = state.activeFilters;
  });

  // Compute filtered notes reactively
  let filteredNotes = $derived(
    computeFilteredNotes(notes, activeFilters, searchQuery)
  );

  function computeFilteredNotes(
    notes: NoteWithContent[],
    filters: FilterInterface[],
    query: string
  ): NoteWithContent[] {
    let filtered = notes;

    // Apply all active filters sequentially
    for (const filter of filters) {
      filtered = filter.applyWithContent(filtered);
    }

    // Apply search query if present
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(lowerQuery) ||
          note.content.toLowerCase().includes(lowerQuery) ||
          note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    }

    return filtered;
  }

  function handleNoteClick(noteId: string) {
    store.getState().selectNote(noteId);
  }
</script>

<div class="note-list">
  {#if filteredNotes.length === 0}
    <div class="empty-message">
      {#if searchQuery || activeFilters.length > 0}
        <p>
          No notes found matching your {searchQuery
            ? 'search'
            : ''}{searchQuery && activeFilters.length > 0
            ? ' and '
            : ''}{activeFilters.length > 0 ? 'filters' : ''}
        </p>
      {:else}
        <p>No notes yet. Create your first note!</p>
      {/if}
    </div>
  {:else}
    <div class="list-header">
      <span class="count"
        >{filteredNotes.length}
        {filteredNotes.length === 1 ? 'note' : 'notes'}</span
      >
    </div>
    <div class="list-items">
      {#each filteredNotes as note (note.id)}
        <NoteListItem
          {note}
          isSelected={note.id === currentNoteId}
          onClick={() => handleNoteClick(note.id)}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .note-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .list-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-mantle);
  }

  .count {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-subtext);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .list-items {
    flex: 1;
    overflow-y: auto;
  }

  .empty-message {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    text-align: center;
  }

  .empty-message p {
    color: var(--color-subtext);
    font-size: 0.95rem;
  }
</style>
