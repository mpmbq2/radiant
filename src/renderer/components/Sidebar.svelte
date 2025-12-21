<script lang="ts">
  import { notesStore } from '../stores/notesStore';
  import SearchBar from './SearchBar.svelte';
  import NoteList from './NoteList.svelte';
  import ThemeSelector from './ThemeSelector.svelte';

  const store = notesStore;

  async function handleNewNote() {
    const title = `Note ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    await store.getState().createNote(title, '');
  }
</script>

<div class="sidebar">
  <div class="sidebar-header">
    <h1 class="app-title">Radiant</h1>
    <button
      class="new-note-button"
      on:click={handleNewNote}
      title="New Note (Cmd+N)"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </button>
  </div>

  <SearchBar />

  <div class="sidebar-content">
    <NoteList />
  </div>

  <ThemeSelector />
</div>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 280px;
    height: 100vh;
    background-color: var(--color-base);
    border-right: 1px solid var(--color-border);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .app-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .new-note-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background-color: var(--color-accent);
    color: var(--color-base);
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .new-note-button:hover {
    background-color: var(--color-accent-secondary);
  }

  .new-note-button:active {
    background-color: var(--color-accent-secondary);
    opacity: 0.8;
  }

  .sidebar-content {
    flex: 1;
    overflow: hidden;
  }
</style>
