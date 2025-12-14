<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { notesStore } from '../stores/notesStore';
  import NoteListItem from './NoteListItem.svelte';

  const store = notesStore;

  let notes = store.getState().notes;
  let currentNoteId = store.getState().currentNoteId;
  let searchQuery = store.getState().searchQuery;

  // Subscribe to store changes
  const unsubscribe = store.subscribe((state) => {
    notes = state.notes;
    currentNoteId = state.currentNoteId;
    searchQuery = state.searchQuery;
  });

  onDestroy(() => {
    unsubscribe();
  });

  // Filter notes based on search query
  $: filteredNotes = searchQuery
    ? notes.filter(
        (note) =>
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : notes;

  function handleNoteClick(noteId: string) {
    store.getState().selectNote(noteId);
  }
</script>

<div class="note-list">
  {#if filteredNotes.length === 0}
    <div class="empty-message">
      {#if searchQuery}
        <p>No notes found matching "{searchQuery}"</p>
      {:else}
        <p>No notes yet. Create your first note!</p>
      {/if}
    </div>
  {:else}
    <div class="list-header">
      <span class="count">{filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}</span>
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
    border-bottom: 1px solid #e5e7eb;
    background-color: #f9fafb;
  }

  .count {
    font-size: 0.85rem;
    font-weight: 600;
    color: #6b7280;
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
    color: #6b7280;
    font-size: 0.95rem;
  }
</style>
