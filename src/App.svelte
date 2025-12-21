<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { notesStore } from './renderer/stores/notesStore';
  import { setupKeyboardShortcuts } from './renderer/utils/keyboardShortcuts';
  import { subscribeStore } from './renderer/utils/useStore.svelte';
  import ThemeProvider from './renderer/components/ThemeProvider.svelte';
  import Sidebar from './renderer/components/Sidebar.svelte';
  import EditorView from './renderer/components/EditorView.svelte';

  const store = notesStore;

  let cleanupShortcuts: (() => void) | null = null;

  let isSidebarCollapsed = $state(store.getState().isSidebarCollapsed);

  // Subscribe to store changes with automatic cleanup
  subscribeStore(store, (state) => {
    isSidebarCollapsed = state.isSidebarCollapsed;
  });

  onMount(async () => {
    // Load notes on app start
    await store.getState().loadNotes();

    // Set up keyboard shortcuts
    cleanupShortcuts = setupKeyboardShortcuts();
  });

  onDestroy(() => {
    if (cleanupShortcuts) {
      cleanupShortcuts();
    }
  });
</script>

<ThemeProvider>
  <main class="app" class:sidebar-collapsed={isSidebarCollapsed}>
    {#if !isSidebarCollapsed}
      <Sidebar />
    {/if}
    <EditorView />
  </main>
</ThemeProvider>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .app {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .app.sidebar-collapsed {
    /* Optional: Add styles for collapsed sidebar state */
  }
</style>
