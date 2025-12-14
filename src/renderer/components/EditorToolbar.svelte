<script lang="ts">
  import type { Editor } from '@tiptap/core';

  export let editor: Editor | null;

  $: canUndo = editor?.can().undo() ?? false;
  $: canRedo = editor?.can().redo() ?? false;

  function toggleBold() {
    editor?.chain().focus().toggleBold().run();
  }

  function toggleItalic() {
    editor?.chain().focus().toggleItalic().run();
  }

  function toggleStrike() {
    editor?.chain().focus().toggleStrike().run();
  }

  function toggleCode() {
    editor?.chain().focus().toggleCode().run();
  }

  function setHeading(level: 1 | 2 | 3) {
    editor?.chain().focus().toggleHeading({ level }).run();
  }

  function toggleBulletList() {
    editor?.chain().focus().toggleBulletList().run();
  }

  function toggleOrderedList() {
    editor?.chain().focus().toggleOrderedList().run();
  }

  function toggleBlockquote() {
    editor?.chain().focus().toggleBlockquote().run();
  }

  function toggleCodeBlock() {
    editor?.chain().focus().toggleCodeBlock().run();
  }

  function undo() {
    editor?.chain().focus().undo().run();
  }

  function redo() {
    editor?.chain().focus().redo().run();
  }

  $: isBold = editor?.isActive('bold') ?? false;
  $: isItalic = editor?.isActive('italic') ?? false;
  $: isStrike = editor?.isActive('strike') ?? false;
  $: isCode = editor?.isActive('code') ?? false;
  $: isH1 = editor?.isActive('heading', { level: 1 }) ?? false;
  $: isH2 = editor?.isActive('heading', { level: 2 }) ?? false;
  $: isH3 = editor?.isActive('heading', { level: 3 }) ?? false;
  $: isBulletList = editor?.isActive('bulletList') ?? false;
  $: isOrderedList = editor?.isActive('orderedList') ?? false;
  $: isBlockquote = editor?.isActive('blockquote') ?? false;
  $: isCodeBlock = editor?.isActive('codeBlock') ?? false;
</script>

<div class="toolbar">
  <div class="toolbar-group">
    <button
      class="toolbar-button"
      class:active={isBold}
      on:click={toggleBold}
      title="Bold (Cmd+B)"
    >
      <strong>B</strong>
    </button>
    <button
      class="toolbar-button"
      class:active={isItalic}
      on:click={toggleItalic}
      title="Italic (Cmd+I)"
    >
      <em>I</em>
    </button>
    <button
      class="toolbar-button"
      class:active={isStrike}
      on:click={toggleStrike}
      title="Strikethrough"
    >
      <s>S</s>
    </button>
    <button
      class="toolbar-button"
      class:active={isCode}
      on:click={toggleCode}
      title="Inline Code"
    >
      {'</>'}
    </button>
  </div>

  <div class="toolbar-divider"></div>

  <div class="toolbar-group">
    <button
      class="toolbar-button"
      class:active={isH1}
      on:click={() => setHeading(1)}
      title="Heading 1"
    >
      H1
    </button>
    <button
      class="toolbar-button"
      class:active={isH2}
      on:click={() => setHeading(2)}
      title="Heading 2"
    >
      H2
    </button>
    <button
      class="toolbar-button"
      class:active={isH3}
      on:click={() => setHeading(3)}
      title="Heading 3"
    >
      H3
    </button>
  </div>

  <div class="toolbar-divider"></div>

  <div class="toolbar-group">
    <button
      class="toolbar-button"
      class:active={isBulletList}
      on:click={toggleBulletList}
      title="Bullet List"
    >
      •
    </button>
    <button
      class="toolbar-button"
      class:active={isOrderedList}
      on:click={toggleOrderedList}
      title="Numbered List"
    >
      1.
    </button>
    <button
      class="toolbar-button"
      class:active={isBlockquote}
      on:click={toggleBlockquote}
      title="Quote"
    >
      "
    </button>
    <button
      class="toolbar-button"
      class:active={isCodeBlock}
      on:click={toggleCodeBlock}
      title="Code Block"
    >
      {'{}'}
    </button>
  </div>

  <div class="toolbar-divider"></div>

  <div class="toolbar-group">
    <button
      class="toolbar-button"
      on:click={undo}
      disabled={!canUndo}
      title="Undo (Cmd+Z)"
    >
      ↶
    </button>
    <button
      class="toolbar-button"
      on:click={redo}
      disabled={!canRedo}
      title="Redo (Cmd+Shift+Z)"
    >
      ↷
    </button>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    flex-wrap: wrap;
  }

  .toolbar-group {
    display: flex;
    gap: 0.25rem;
  }

  .toolbar-divider {
    width: 1px;
    height: 24px;
    background-color: #d1d5db;
    margin: 0 0.5rem;
  }

  .toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    padding: 0 0.5rem;
    border: 1px solid transparent;
    background-color: transparent;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
    color: #374151;
  }

  .toolbar-button:hover:not(:disabled) {
    background-color: #e5e7eb;
  }

  .toolbar-button.active {
    background-color: #dbeafe;
    border-color: #3b82f6;
    color: #1e40af;
  }

  .toolbar-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .toolbar-button:active:not(:disabled) {
    background-color: #d1d5db;
  }
</style>
