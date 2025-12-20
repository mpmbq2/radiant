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
          class: 'prose prose-sm max-w-none focus:outline-none',
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
    background-color: #3b82f6;
    color: white;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    z-index: 10;
    opacity: 0.9;
  }

  .editor {
    padding: 2rem;
    min-height: 100%;
  }

  :global(.editor .ProseMirror) {
    outline: none;
  }

  :global(.editor .ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: #9ca3af;
    pointer-events: none;
    height: 0;
  }

  /* Basic prose styling */
  :global(.editor .ProseMirror) {
    font-size: 1rem;
    line-height: 1.75;
    color: #1f2937;
  }

  :global(.editor .ProseMirror h1) {
    font-size: 2em;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 0.8em;
    line-height: 1.1;
  }

  :global(.editor .ProseMirror h2) {
    font-size: 1.5em;
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.75em;
    line-height: 1.2;
  }

  :global(.editor .ProseMirror h3) {
    font-size: 1.25em;
    font-weight: 600;
    margin-top: 1.25em;
    margin-bottom: 0.5em;
    line-height: 1.3;
  }

  :global(.editor .ProseMirror p) {
    margin-top: 0;
    margin-bottom: 1em;
  }

  :global(.editor .ProseMirror ul),
  :global(.editor .ProseMirror ol) {
    padding-left: 1.5em;
    margin-top: 0;
    margin-bottom: 1em;
  }

  :global(.editor .ProseMirror li) {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }

  :global(.editor .ProseMirror code) {
    background-color: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }

  :global(.editor .ProseMirror pre) {
    background-color: #1f2937;
    color: #f3f4f6;
    padding: 1em;
    border-radius: 6px;
    overflow-x: auto;
    margin-top: 1em;
    margin-bottom: 1em;
  }

  :global(.editor .ProseMirror pre code) {
    background-color: transparent;
    padding: 0;
    color: inherit;
  }

  :global(.editor .ProseMirror blockquote) {
    border-left: 3px solid #d1d5db;
    padding-left: 1em;
    margin-left: 0;
    margin-right: 0;
    font-style: italic;
    color: #6b7280;
  }

  :global(.editor .ProseMirror strong) {
    font-weight: 600;
  }

  :global(.editor .ProseMirror em) {
    font-style: italic;
  }
</style>
