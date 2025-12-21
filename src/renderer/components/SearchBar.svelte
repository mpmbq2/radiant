<script lang="ts">
  import { notesStore } from '../stores/notesStore';

  const store = notesStore;

  let searchInput = $state('');

  // Update store when input changes
  $effect(() => {
    store.getState().setSearchQuery(searchInput);
  });

  function clearSearch() {
    searchInput = '';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      clearSearch();
    }
  }
</script>

<div class="search-bar">
  <div class="search-input-wrapper">
    <svg
      class="search-icon"
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>

    <input
      type="text"
      bind:value={searchInput}
      on:keydown={handleKeydown}
      placeholder="Search notes..."
      class="search-input"
    />

    {#if searchInput}
      <button
        class="clear-button"
        on:click={clearSearch}
        aria-label="Clear search"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    {/if}
  </div>
</div>

<style>
  .search-bar {
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    color: var(--color-subtext-0);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 2.5rem 0.5rem 2.5rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 0.9rem;
    outline: none;
    background-color: var(--color-base);
    color: var(--color-text);
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }

  .search-input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px
      color-mix(in srgb, var(--color-accent) 10%, transparent);
  }

  .search-input::placeholder {
    color: var(--color-subtext-0);
  }

  .clear-button {
    position: absolute;
    right: 0.5rem;
    padding: 0.25rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-subtext-0);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .clear-button:hover {
    background-color: var(--color-hover);
    color: var(--color-subtext);
  }
</style>
