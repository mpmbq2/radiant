<script lang="ts">
  import { onMount } from 'svelte';
  import type { NoteWithContent } from '../types';

  let notes: NoteWithContent[] = [];
  let selectedNote: NoteWithContent | null = null;
  let newTitle = '';
  let newContent = '';
  let newTags = '';

  async function loadNotes() {
    notes = await window.electronAPI.notes.getAll();
    console.log('Loaded notes:', notes);
  }

  async function createNote() {
    if (!newTitle) {
      alert('Title is required');
      return;
    }

    const tags = newTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const note = await window.electronAPI.notes.create({
      title: newTitle,
      content: newContent,
      tags,
    });

    console.log('Created note:', note);
    newTitle = '';
    newContent = '';
    newTags = '';
    await loadNotes();
  }

  async function selectNote(note: NoteWithContent) {
    selectedNote = note;
  }

  async function deleteNote(noteId: string) {
    if (confirm('Delete this note?')) {
      await window.electronAPI.notes.delete(noteId);
      selectedNote = null;
      await loadNotes();
    }
  }

  onMount(() => {
    loadNotes();
  });
</script>

<div class="container">
  <div class="sidebar">
    <h2>Notes ({notes.length})</h2>
    <div class="note-list">
      {#each notes as note (note.id)}
        <div
          class="note-item"
          class:selected={selectedNote?.id === note.id}
          on:click={() => selectNote(note)}
        >
          <div class="note-title">{note.title}</div>
          <div class="note-meta">
            {new Date(note.modified_at).toLocaleDateString()}
          </div>
          {#if note.tags.length > 0}
            <div class="note-tags">
              {#each note.tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div class="main">
    <div class="create-form">
      <h2>Create Note</h2>
      <input type="text" bind:value={newTitle} placeholder="Title" />
      <textarea bind:value={newContent} placeholder="Content" rows="4" />
      <input type="text" bind:value={newTags} placeholder="Tags (comma-separated)" />
      <button on:click={createNote}>Create Note</button>
    </div>

    {#if selectedNote}
      <div class="note-detail">
        <div class="note-header">
          <h2>{selectedNote.title}</h2>
          <button on:click={() => deleteNote(selectedNote.id)}>Delete</button>
        </div>
        <div class="note-content">{selectedNote.content}</div>
        <div class="note-stats">
          <p>Words: {selectedNote.word_count}</p>
          <p>Characters: {selectedNote.character_count}</p>
          <p>Created: {new Date(selectedNote.created_at).toLocaleString()}</p>
          <p>Modified: {new Date(selectedNote.modified_at).toLocaleString()}</p>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .container {
    display: flex;
    height: 100vh;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .sidebar {
    width: 300px;
    border-right: 1px solid #ccc;
    padding: 1rem;
    overflow-y: auto;
  }

  .note-list {
    margin-top: 1rem;
  }

  .note-item {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
  }

  .note-item:hover {
    background: #f5f5f5;
  }

  .note-item.selected {
    background: #e3f2fd;
    border-color: #2196f3;
  }

  .note-title {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .note-meta {
    font-size: 0.85rem;
    color: #666;
  }

  .note-tags {
    margin-top: 0.5rem;
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .tag {
    background: #e0e0e0;
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
  }

  .main {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
  }

  .create-form {
    margin-bottom: 2rem;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .create-form input,
  .create-form textarea {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .create-form button {
    padding: 0.5rem 1rem;
    background: #2196f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .note-detail {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .note-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .note-header button {
    padding: 0.5rem 1rem;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .note-content {
    white-space: pre-wrap;
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 4px;
  }

  .note-stats p {
    margin: 0.25rem 0;
    font-size: 0.9rem;
    color: #666;
  }
</style>
