<script lang="ts">
  interface Props {
    message?: string;
    description?: string;
    showIcon?: boolean;
  }

  let {
    message = 'No note selected',
    description = 'Select a note from the list or create a new one',
    showIcon = true,
  }: Props = $props();
</script>

<div class="empty-state">
  {#if showIcon}
    <div class="icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
        />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    </div>
  {/if}
  <h2 class="message">{message}</h2>
  <p class="description">{description}</p>
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    text-align: center;
    color: var(--color-subtext);
  }

  .icon {
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .message {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--color-text);
  }

  .description {
    font-size: 0.95rem;
    color: var(--color-subtext);
  }
</style>
