<script lang="ts">
  import type { NoteWithContent } from '../../types';

  export let note: NoteWithContent;
  export let isSelected: boolean = false;
  export let onClick: () => void;

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  function truncateContent(content: string, maxLength: number = 100): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength).trim() + '...';
  }
</script>

<div
  class="note-item"
  class:selected={isSelected}
  on:click={onClick}
  on:keydown={(e) => e.key === 'Enter' && onClick()}
  role="button"
  tabindex="0"
>
  <div class="note-header">
    <h3 class="note-title">{note.title || 'Untitled'}</h3>
    <span class="note-date">{formatDate(note.modified_at)}</span>
  </div>

  <p class="note-preview">{truncateContent(note.content)}</p>

  {#if note.tags.length > 0}
    <div class="note-tags">
      {#each note.tags.slice(0, 3) as tag}
        <span class="tag">{tag}</span>
      {/each}
      {#if note.tags.length > 3}
        <span class="tag-more">+{note.tags.length - 3}</span>
      {/if}
    </div>
  {/if}

  <div class="note-meta">
    <span>{note.word_count} words</span>
  </div>
</div>

<style>
  .note-item {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .note-item:hover {
    background-color: #f9fafb;
  }

  .note-item.selected {
    background-color: #eff6ff;
    border-left: 3px solid #3b82f6;
  }

  .note-item:focus {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }

  .note-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.5rem;
  }

  .note-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .note-date {
    font-size: 0.75rem;
    color: #6b7280;
    flex-shrink: 0;
    margin-left: 0.5rem;
  }

  .note-preview {
    font-size: 0.85rem;
    color: #4b5563;
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .note-tags {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  .tag {
    font-size: 0.7rem;
    padding: 0.125rem 0.5rem;
    background-color: #e0e7ff;
    color: #3730a3;
    border-radius: 9999px;
  }

  .tag-more {
    font-size: 0.7rem;
    padding: 0.125rem 0.5rem;
    background-color: #f3f4f6;
    color: #6b7280;
    border-radius: 9999px;
  }

  .note-meta {
    font-size: 0.75rem;
    color: #9ca3af;
  }
</style>
