<script lang="ts">
  import { notesStore } from '../stores/notesStore';
  import { subscribeStore } from '../utils/useStore.svelte';
  import NoteListItem from './NoteListItem.svelte';

  const store = notesStore;

  let currentNoteId = $state(store.getState().currentNoteId);
  let searchQuery = $state(store.getState().searchQuery);
  let activeFiltersCount = $state(store.getState().activeFilters.length);

  // Subscribe to store changes with automatic cleanup
  subscribeStore(store, (state) => {
    currentNoteId = state.currentNoteId;
    searchQuery = state.searchQuery;
    activeFiltersCount = state.activeFilters.length;
  });

  // Get filtered notes from store (applies both filters and search)
  let filteredNotes = $derived(store.getState().getFilteredNotes());

  function handleNoteClick(noteId: string) {
    store.getState().selectNote(noteId);
  }
</script>

<div class="note-list">
  {#if filteredNotes.length === 0}
    <div class="empty-message">
      {#if searchQuery || activeFiltersCount > 0}
        <p>No notes found matching your {searchQuery ? 'search' : ''}{searchQuery && activeFiltersCount > 0 ? ' and ' : ''}{activeFiltersCount > 0 ? 'filters' : ''}</p>
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
