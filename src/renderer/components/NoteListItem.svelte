<script lang="ts">
  import type { NoteWithContent } from '../../types';
  import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
  import { HTML_TAG_PATTERN } from '../../utils/regexPatterns';

  interface Props {
    note: NoteWithContent;
    isSelected?: boolean;
    onClick: () => void;
  }

  let { note, isSelected = false, onClick }: Props = $props();

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);

    if (isToday(date)) {
      return 'Today';
    }

    if (isYesterday(date)) {
      return 'Yesterday';
    }

    // For dates within the last 6 days, show relative time
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff < 7) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    // For older dates, show the date in short format
    return format(date, 'MMM d, yyyy');
  }

  function stripHtmlTags(html: string): string {
    return html.replace(HTML_TAG_PATTERN, '');
  }

  function truncateContent(content: string, maxLength: number = 100): string {
    const plainText = stripHtmlTags(content);
    if (plainText.length <= maxLength) {
      return plainText;
    }
    return plainText.substring(0, maxLength).trim() + '...';
  }
</script>

<div
  class="note-item"
  class:selected={isSelected}
  onclick={onClick}
  onkeydown={(e) => e.key === 'Enter' && onClick()}
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
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .note-item:hover {
    background-color: var(--color-mantle);
  }

  .note-item.selected {
    background-color: var(--color-surface-0);
    border-left: 3px solid var(--color-accent);
  }

  .note-item:focus {
    outline: 2px solid var(--color-accent);
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
    color: var(--color-text);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .note-date {
    font-size: 0.75rem;
    color: var(--color-subtext);
    flex-shrink: 0;
    margin-left: 0.5rem;
  }

  .note-preview {
    font-size: 0.85rem;
    color: var(--color-subtext);
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
    background-color: var(--color-accent);
    color: var(--color-base);
    border-radius: 9999px;
    opacity: 0.8;
  }

  .tag-more {
    font-size: 0.7rem;
    padding: 0.125rem 0.5rem;
    background-color: var(--color-surface);
    color: var(--color-subtext);
    border-radius: 9999px;
  }

  .note-meta {
    font-size: 0.75rem;
    color: var(--color-subtext-0);
  }
</style>
