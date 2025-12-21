<script lang="ts">
  import { themeStore } from '../stores/themeStore';
  import type { CatppuccinFlavor } from '../themes/catppuccin';

  // Theme options with display names and descriptions
  const themes: Array<{
    value: CatppuccinFlavor;
    label: string;
    description: string;
  }> = [
    { value: 'latte', label: 'Latte', description: 'Light & warm' },
    { value: 'frappe', label: 'Frappé', description: 'Medium warm' },
    { value: 'macchiato', label: 'Macchiato', description: 'Medium-dark cool' },
    { value: 'mocha', label: 'Mocha', description: 'Dark & cozy' },
  ];

  // Subscribe to theme store state
  let currentTheme = $state<CatppuccinFlavor>(
    themeStore.getState().currentTheme
  );
  let isLoading = $state<boolean>(themeStore.getState().isLoading);

  // Subscribe to store updates
  themeStore.subscribe((state) => {
    currentTheme = state.currentTheme;
    isLoading = state.isLoading;
  });

  // Handle theme selection
  async function handleThemeChange(theme: CatppuccinFlavor) {
    if (isLoading || theme === currentTheme) return;
    await themeStore.getState().setTheme(theme);
  }
</script>

<div class="theme-selector">
  <div class="theme-selector-header">
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
      class="theme-icon"
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
    </svg>
    <span class="theme-selector-title">Theme</span>
  </div>

  <div class="theme-options">
    {#each themes as theme}
      <button
        class="theme-option"
        class:selected={currentTheme === theme.value}
        disabled={isLoading}
        onclick={() => handleThemeChange(theme.value)}
        type="button"
        aria-label={`Select ${theme.label} theme`}
      >
        <div class="theme-option-radio">
          <div class="radio-outer">
            {#if currentTheme === theme.value}
              <div class="radio-inner"></div>
            {/if}
          </div>
        </div>
        <div class="theme-option-content">
          <span class="theme-option-label">{theme.label}</span>
          <span class="theme-option-description">{theme.description}</span>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .theme-selector {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    border-top: 1px solid var(--color-border);
  }

  .theme-selector-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-subtext);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .theme-icon {
    width: 14px;
    height: 14px;
  }

  .theme-selector-title {
    user-select: none;
  }

  .theme-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .theme-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem;
    background-color: transparent;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }

  .theme-option:hover {
    background-color: var(--color-hover);
    border-color: var(--color-accent);
  }

  .theme-option.selected {
    background-color: var(--color-surface-0);
    border-color: var(--color-accent);
    box-shadow: 0 0 0 1px var(--color-accent);
  }

  .theme-option:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .theme-option-radio {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .radio-outer {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-overlay-0);
    border-radius: 50%;
    transition: border-color 0.15s;
  }

  .theme-option:hover .radio-outer,
  .theme-option.selected .radio-outer {
    border-color: var(--color-accent);
  }

  .radio-inner {
    width: 8px;
    height: 8px;
    background-color: var(--color-accent);
    border-radius: 50%;
    animation: radioAppear 0.15s ease-out;
  }

  @keyframes radioAppear {
    from {
      transform: scale(0);
    }
    to {
      transform: scale(1);
    }
  }

  .theme-option-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex: 1;
  }

  .theme-option-label {
    color: var(--color-text);
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.2;
  }

  .theme-option-description {
    color: var(--color-subtext);
    font-size: 0.75rem;
    line-height: 1.2;
  }

  .theme-option.selected .theme-option-label {
    color: var(--color-accent);
    font-weight: 600;
  }
</style>
