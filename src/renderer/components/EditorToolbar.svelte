<script lang="ts">
  import type { Editor } from '@tiptap/core';

  interface Props {
    editor: Editor | null;
  }

  let { editor }: Props = $props();

  let canUndo = $derived(editor?.can().undo() ?? false);
  let canRedo = $derived(editor?.can().redo() ?? false);

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

  let isBold = $derived(editor?.isActive('bold') ?? false);
  let isItalic = $derived(editor?.isActive('italic') ?? false);
  let isStrike = $derived(editor?.isActive('strike') ?? false);
  let isCode = $derived(editor?.isActive('code') ?? false);
  let isH1 = $derived(editor?.isActive('heading', { level: 1 }) ?? false);
  let isH2 = $derived(editor?.isActive('heading', { level: 2 }) ?? false);
  let isH3 = $derived(editor?.isActive('heading', { level: 3 }) ?? false);
  let isBulletList = $derived(editor?.isActive('bulletList') ?? false);
  let isOrderedList = $derived(editor?.isActive('orderedList') ?? false);
  let isBlockquote = $derived(editor?.isActive('blockquote') ?? false);
  let isCodeBlock = $derived(editor?.isActive('codeBlock') ?? false);
</script>

<div class="toolbar">
  <div class="toolbar-group">
    <button
      class="toolbar-button"
      class:active={isBold}
      onclick={toggleBold}
      title="Bold (Cmd+B)"
    >
      <strong>B</strong>
    </button>
    <button
      class="toolbar-button"
      class:active={isItalic}
      onclick={toggleItalic}
      title="Italic (Cmd+I)"
    >
      <em>I</em>
    </button>
    <button
      class="toolbar-button"
      class:active={isStrike}
      onclick={toggleStrike}
      title="Strikethrough"
    >
      <s>S</s>
    </button>
    <button
      class="toolbar-button"
      class:active={isCode}
      onclick={toggleCode}
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
      onclick={() => setHeading(1)}
      title="Heading 1"
    >
      H1
    </button>
    <button
      class="toolbar-button"
      class:active={isH2}
      onclick={() => setHeading(2)}
      title="Heading 2"
    >
      H2
    </button>
    <button
      class="toolbar-button"
      class:active={isH3}
      onclick={() => setHeading(3)}
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
      onclick={toggleBulletList}
      title="Bullet List"
    >
      •
    </button>
    <button
      class="toolbar-button"
      class:active={isOrderedList}
      onclick={toggleOrderedList}
      title="Numbered List"
    >
      1.
    </button>
    <button
      class="toolbar-button"
      class:active={isBlockquote}
      onclick={toggleBlockquote}
      title="Quote"
    >
      "
    </button>
    <button
      class="toolbar-button"
      class:active={isCodeBlock}
      onclick={toggleCodeBlock}
      title="Code Block"
    >
      {'{}'}
    </button>
  </div>

  <div class="toolbar-divider"></div>

  <div class="toolbar-group">
    <button
      class="toolbar-button"
      onclick={undo}
      disabled={!canUndo}
      title="Undo (Cmd+Z)"
    >
      ↶
    </button>
    <button
      class="toolbar-button"
      onclick={redo}
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
    background-color: var(--color-mantle);
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
  }

  .toolbar-group {
    display: flex;
    gap: 0.25rem;
  }

  .toolbar-divider {
    width: 1px;
    height: 24px;
    background-color: var(--color-border);
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
    transition:
      background-color 0.15s,
      border-color 0.15s;
    color: var(--color-text);
  }

  .toolbar-button:hover:not(:disabled) {
    background-color: var(--color-hover);
  }

  .toolbar-button.active {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-base);
  }

  .toolbar-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .toolbar-button:active:not(:disabled) {
    background-color: var(--color-surface);
  }
</style>
