<script lang="ts">
  import { notesStore } from '../stores/notesStore';
  import { subscribeStore } from '../utils/useStore.svelte';
  import { TagFilter, DateRangeFilter, ContentFilter } from '../../filters';
  import {
    FilterType,
    DateRangePreset,
    DateField,
    LogicalOperator,
    ComparisonOperator,
  } from '../../filters/types';
  import type { FilterInterface } from '../../filters';

  const store = notesStore;

  let activeFilters = $state<FilterInterface[]>([]);
  let allTags = $state<string[]>([]);
  let showFilterMenu = $state(false);
  let showTagFilterModal = $state(false);
  let showDateFilterModal = $state(false);
  let showContentFilterModal = $state(false);

  // Subscribe to store changes
  subscribeStore(store, (state) => {
    activeFilters = state.activeFilters;
  });

  // Load all available tags on mount
  $effect(() => {
    loadTags();
  });

  async function loadTags() {
    allTags = await window.electronAPI.notes.getAllTags();
  }

  function toggleFilterMenu() {
    showFilterMenu = !showFilterMenu;
  }

  function openTagFilterModal() {
    showTagFilterModal = true;
    showFilterMenu = false;
  }

  function openDateFilterModal() {
    showDateFilterModal = true;
    showFilterMenu = false;
  }

  function openContentFilterModal() {
    showContentFilterModal = true;
    showFilterMenu = false;
  }

  function removeFilter(index: number) {
    store.getState().removeFilter(index);
  }

  function clearAllFilters() {
    store.getState().clearFilters();
  }

  // Tag Filter Modal State
  let selectedTags = $state<string[]>([]);
  let tagOperator = $state<LogicalOperator.AND | LogicalOperator.OR>(
    LogicalOperator.OR
  );

  function addTagFilter() {
    if (selectedTags.length > 0) {
      const filter = new TagFilter({
        tags: selectedTags,
        operator: tagOperator,
      });
      store.getState().addFilter(filter);
      selectedTags = [];
      showTagFilterModal = false;
    }
  }

  function toggleTagSelection(tag: string) {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter((t) => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
  }

  // Date Filter Modal State
  let datePreset = $state<DateRangePreset>(DateRangePreset.LAST_7_DAYS);
  let dateField = $state<DateField>(DateField.MODIFIED_AT);

  function addDateFilter() {
    const filter = new DateRangeFilter({
      field: dateField,
      preset: datePreset,
    });
    store.getState().addFilter(filter);
    showDateFilterModal = false;
  }

  // Content Filter Modal State
  let contentQuery = $state('');

  function addContentFilter() {
    if (contentQuery.trim()) {
      const filter = new ContentFilter({
        query: contentQuery.trim(),
        operator: ComparisonOperator.CONTAINS,
        searchTitle: true,
        searchContent: true,
      });
      store.getState().addFilter(filter);
      contentQuery = '';
      showContentFilterModal = false;
    }
  }

  // Helper to get filter display text
  function getFilterDisplayText(filter: FilterInterface): string {
    const config = filter.serialize();

    if (config.type === FilterType.TAG) {
      const tags = (config as any).tags || [];
      const operator = (config as any).operator || LogicalOperator.OR;
      return `Tags: ${tags.join(operator === LogicalOperator.AND ? ' AND ' : ' OR ')}`;
    }

    if (config.type === FilterType.DATE_RANGE) {
      const preset = (config as any).preset;
      const field = (config as any).field;
      const fieldName = field === DateField.CREATED_AT ? 'Created' : 'Modified';
      const presetName = preset.replace(/_/g, ' ').toLowerCase();
      return `${fieldName}: ${presetName}`;
    }

    if (config.type === FilterType.CONTENT) {
      const query = (config as any).query || '';
      return `Content: "${query}"`;
    }

    return 'Filter';
  }

  // Close modals when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (
      !target.closest('.filter-modal') &&
      !target.closest('.filter-menu') &&
      !target.closest('.filter-trigger')
    ) {
      showFilterMenu = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="filter-bar">
  {#if activeFilters.length > 0}
    <div class="active-filters">
      {#each activeFilters as filter, index (index)}
        <div class="filter-chip">
          <span class="filter-text">{getFilterDisplayText(filter)}</span>
          <button
            class="remove-filter"
            on:click={() => removeFilter(index)}
            aria-label="Remove filter"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
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
        </div>
      {/each}
      <button class="clear-all-button" on:click={clearAllFilters}>
        Clear all
      </button>
    </div>
  {/if}

  <div class="filter-actions">
    <button
      class="add-filter-button filter-trigger"
      on:click={toggleFilterMenu}
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
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
      Add Filter
    </button>

    {#if showFilterMenu}
      <div class="filter-menu">
        <button class="filter-menu-item" on:click={openTagFilterModal}>
          <span class="menu-icon">🏷️</span>
          <span>Tag Filter</span>
        </button>
        <button class="filter-menu-item" on:click={openDateFilterModal}>
          <span class="menu-icon">📅</span>
          <span>Date Filter</span>
        </button>
        <button class="filter-menu-item" on:click={openContentFilterModal}>
          <span class="menu-icon">🔍</span>
          <span>Content Filter</span>
        </button>
      </div>
    {/if}
  </div>
</div>

<!-- Tag Filter Modal -->
{#if showTagFilterModal}
  <div class="modal-overlay" on:click={() => (showTagFilterModal = false)}>
    <div class="filter-modal" on:click={(e) => e.stopPropagation()}>
      <h3>Add Tag Filter</h3>

      <div class="form-group">
        <label>Match Type:</label>
        <select bind:value={tagOperator}>
          <option value={LogicalOperator.OR}>Any tag (OR)</option>
          <option value={LogicalOperator.AND}>All tags (AND)</option>
        </select>
      </div>

      <div class="form-group">
        <label>Select Tags:</label>
        <div class="tag-list">
          {#if allTags.length === 0}
            <p class="no-tags">No tags available</p>
          {:else}
            {#each allTags as tag}
              <label class="tag-checkbox">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  on:change={() => toggleTagSelection(tag)}
                />
                <span>{tag}</span>
              </label>
            {/each}
          {/if}
        </div>
      </div>

      <div class="modal-actions">
        <button
          class="cancel-button"
          on:click={() => (showTagFilterModal = false)}
        >
          Cancel
        </button>
        <button
          class="apply-button"
          on:click={addTagFilter}
          disabled={selectedTags.length === 0}
        >
          Apply Filter
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Date Filter Modal -->
{#if showDateFilterModal}
  <div class="modal-overlay" on:click={() => (showDateFilterModal = false)}>
    <div class="filter-modal" on:click={(e) => e.stopPropagation()}>
      <h3>Add Date Filter</h3>

      <div class="form-group">
        <label>Date Field:</label>
        <select bind:value={dateField}>
          <option value={DateField.CREATED_AT}>Created Date</option>
          <option value={DateField.MODIFIED_AT}>Modified Date</option>
        </select>
      </div>

      <div class="form-group">
        <label>Time Period:</label>
        <select bind:value={datePreset}>
          <option value={DateRangePreset.TODAY}>Today</option>
          <option value={DateRangePreset.YESTERDAY}>Yesterday</option>
          <option value={DateRangePreset.LAST_7_DAYS}>Last 7 Days</option>
          <option value={DateRangePreset.LAST_30_DAYS}>Last 30 Days</option>
          <option value={DateRangePreset.THIS_WEEK}>This Week</option>
          <option value={DateRangePreset.LAST_WEEK}>Last Week</option>
          <option value={DateRangePreset.THIS_MONTH}>This Month</option>
          <option value={DateRangePreset.LAST_MONTH}>Last Month</option>
        </select>
      </div>

      <div class="modal-actions">
        <button
          class="cancel-button"
          on:click={() => (showDateFilterModal = false)}
        >
          Cancel
        </button>
        <button class="apply-button" on:click={addDateFilter}>
          Apply Filter
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Content Filter Modal -->
{#if showContentFilterModal}
  <div class="modal-overlay" on:click={() => (showContentFilterModal = false)}>
    <div class="filter-modal" on:click={(e) => e.stopPropagation()}>
      <h3>Add Content Filter</h3>

      <div class="form-group">
        <label>Search Text:</label>
        <input
          type="text"
          bind:value={contentQuery}
          placeholder="Enter text to search..."
          class="text-input"
        />
      </div>

      <div class="modal-actions">
        <button
          class="cancel-button"
          on:click={() => (showContentFilterModal = false)}
        >
          Cancel
        </button>
        <button
          class="apply-button"
          on:click={addContentFilter}
          disabled={!contentQuery.trim()}
        >
          Apply Filter
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .filter-bar {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-mantle);
  }

  .active-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .filter-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background-color: var(--color-accent);
    color: var(--color-base);
    border-radius: 16px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .filter-text {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-filter {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    color: var(--color-base);
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.15s;
  }

  .remove-filter:hover {
    opacity: 1;
  }

  .clear-all-button {
    padding: 0.375rem 0.75rem;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 16px;
    font-size: 0.85rem;
    color: var(--color-subtext);
    cursor: pointer;
    transition: all 0.15s;
  }

  .clear-all-button:hover {
    background-color: var(--color-surface-0);
    color: var(--color-text);
  }

  .filter-actions {
    position: relative;
  }

  .add-filter-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    background-color: var(--color-surface-0);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 0.9rem;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
  }

  .add-filter-button:hover {
    background-color: var(--color-surface-1);
    border-color: var(--color-accent);
  }

  .filter-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.5rem;
    background-color: var(--color-surface-0);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10;
    min-width: 180px;
  }

  .filter-menu-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    color: var(--color-text);
    font-size: 0.9rem;
    transition: background-color 0.15s;
  }

  .filter-menu-item:first-child {
    border-radius: 8px 8px 0 0;
  }

  .filter-menu-item:last-child {
    border-radius: 0 0 8px 8px;
  }

  .filter-menu-item:hover {
    background-color: var(--color-surface-1);
  }

  .menu-icon {
    font-size: 1.25rem;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .filter-modal {
    background-color: var(--color-base);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  }

  .filter-modal h3 {
    margin: 0 0 1.25rem 0;
    font-size: 1.25rem;
    color: var(--color-text);
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .form-group select,
  .text-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background-color: var(--color-surface-0);
    color: var(--color-text);
    font-size: 0.9rem;
  }

  .text-input {
    outline: none;
    transition: border-color 0.15s;
  }

  .text-input:focus {
    border-color: var(--color-accent);
  }

  .tag-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.5rem;
    background-color: var(--color-surface-0);
  }

  .tag-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.15s;
  }

  .tag-checkbox:hover {
    background-color: var(--color-surface-1);
  }

  .tag-checkbox input[type='checkbox'] {
    cursor: pointer;
  }

  .no-tags {
    padding: 1rem;
    text-align: center;
    color: var(--color-subtext);
    font-size: 0.9rem;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .cancel-button,
  .apply-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .cancel-button {
    background-color: var(--color-surface-0);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .cancel-button:hover {
    background-color: var(--color-surface-1);
  }

  .apply-button {
    background-color: var(--color-accent);
    color: var(--color-base);
  }

  .apply-button:hover:not(:disabled) {
    background-color: var(--color-accent-secondary);
  }

  .apply-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
