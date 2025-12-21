<script lang="ts">
  import { notesStore } from '../stores/notesStore';
  import { subscribeStore } from '../utils/useStore.svelte';
  import Editor from './Editor.svelte';
  import EmptyState from './EmptyState.svelte';

  const store = notesStore;

  let currentNote = $state(store.getState().currentNote);
  let isLoading = $state(store.getState().isLoading);

  // Subscribe to store changes with automatic cleanup
  subscribeStore(store, (state) => {
    currentNote = state.currentNote;
    isLoading = state.isLoading;
  });

  let titleInput: HTMLInputElement;
  let isEditingTitle = false;

  function handleTitleClick() {
    isEditingTitle = true;
    setTimeout(() => {
      titleInput?.focus();
      titleInput?.select();
    }, 0);
  }

  async function handleTitleBlur() {
    isEditingTitle = false;
    if (currentNote && titleInput) {
      const newTitle = titleInput.value.trim();
      if (newTitle && newTitle !== currentNote.title) {
        await store.getState().updateNote(currentNote.id, { title: newTitle });
      }
    }
  }

  async function handleTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      titleInput?.blur();
    } else if (event.key === 'Escape') {
      isEditingTitle = false;
      if (currentNote && titleInput) {
        titleInput.value = currentNote.title;
      }
    }
  }

  async function handleDeleteNote() {
    if (currentNote && confirm(`Delete "${currentNote.title}"?`)) {
      await store.getState().deleteNote(currentNote.id);
    }
  }
</script>

<div class="editor-view">
  {#if isLoading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else if currentNote}
    <div class="note-header">
      <div class="title-section">
        {#if isEditingTitle}
          <input
            bind:this={titleInput}
            type="text"
            class="title-input"
            value={currentNote.title}
            on:blur={handleTitleBlur}
            on:keydown={handleTitleKeydown}
          />
        {:else}
          <button
            class="note-title"
            on:click={handleTitleClick}
            title="Click to edit title"
          >
            {currentNote.title || 'Untitled'}
          </button>
        {/if}
      </div>

      <div class="header-actions">
        <button
          class="delete-button"
          on:click={handleDeleteNote}
          title="Delete Note"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>

    <Editor />
  {:else}
    <EmptyState
      message="No note selected"
      description="Select a note from the sidebar or create a new one to get started"
    />
  {/if}
</div>

<style>
  .editor-view {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--color-base);
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-subtext);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 2rem 1rem 2rem;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-base);
  }

  .title-section {
    flex: 1;
    min-width: 0;
  }

  .note-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background-color 0.15s;
    border: none;
    background: transparent;
    text-align: left;
    font-family: inherit;
  }

  .note-title:hover {
    background-color: var(--color-hover);
  }

  .title-input {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
    border: 2px solid var(--color-accent);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    outline: none;
    width: 100%;
    background-color: var(--color-base);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    margin-left: 1rem;
  }

  .delete-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background-color: transparent;
    color: var(--color-subtext);
    border-radius: 6px;
    cursor: pointer;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .delete-button:hover {
    background-color: var(--color-error);
    color: var(--color-base);
    opacity: 0.9;
  }
</style>
