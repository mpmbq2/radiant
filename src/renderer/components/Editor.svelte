<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Placeholder from '@tiptap/extension-placeholder';
  import Typography from '@tiptap/extension-typography';
  import { notesStore } from '../stores/notesStore';
  import { subscribeStore } from '../utils/useStore.svelte';
  import EditorToolbar from './EditorToolbar.svelte';

  const store = notesStore;

  let editorElement: HTMLDivElement;
  export let editor: Editor | null = null;
  let isSaving = false;

  let currentNote = $state(store.getState().currentNote);

  // Subscribe to store changes with automatic cleanup
  subscribeStore(store, (state) => {
    currentNote = state.currentNote;
  });

  // Debounced save function
  let saveTimeout: NodeJS.Timeout;
  function debouncedSave(content: string) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      if (currentNote) {
        isSaving = true;
        try {
          await store.getState().updateNote(currentNote.id, { content });
        } catch (error) {
          console.error('Failed to save note:', error);
        } finally {
          isSaving = false;
        }
      }
    }, 1000); // Save after 1 second of inactivity
  }

  onMount(() => {
    editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
        }),
        Placeholder.configure({
          placeholder: 'Start writing...',
        }),
        Typography,
      ],
      content: currentNote?.content || '',
      editorProps: {
        attributes: {
          class: 'prose prose-slate max-w-none focus:outline-none px-8 py-6',
        },
      },
      onUpdate: ({ editor }) => {
        const content = editor.getHTML();
        debouncedSave(content);
      },
    });
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
    clearTimeout(saveTimeout);
  });

  // Update editor content when note changes
  $: if (editor && currentNote) {
    const currentContent = editor.getHTML();
    if (currentContent !== currentNote.content) {
      editor.commands.setContent(currentNote.content);
    }
  }
</script>

<div class="editor-wrapper">
  {#if currentNote && editor}
    <EditorToolbar {editor} />
  {/if}
  <div class="editor-container">
    {#if isSaving}
      <div class="saving-indicator">Saving...</div>
    {/if}
    <div bind:this={editorElement} class="editor"></div>
  </div>
</div>

<style>
  .editor-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .editor-container {
    position: relative;
    flex: 1;
    overflow-y: auto;
  }

  .saving-indicator {
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.5rem 1rem;
    background-color: var(--color-primary, #3b82f6);
    color: var(--color-primary-text, white);
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    z-index: 10;
    opacity: 0.9;
  }

  .editor {
    min-height: 100%;
  }

  /* Editor-specific customizations */
  :global(.editor .ProseMirror) {
    outline: none;
  }

  /* Placeholder styling for empty editor */
  :global(.editor .ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--color-text-placeholder, #9ca3af);
    pointer-events: none;
    height: 0;
  }
</style>
