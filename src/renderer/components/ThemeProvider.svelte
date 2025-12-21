<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import type { CatppuccinFlavor } from '../themes/catppuccin';
  import { themeStore } from '../stores/themeStore';

  // Import the theme CSS
  import '../themes/theme.css';

  interface ThemeContext {
    currentTheme: () => CatppuccinFlavor;
    setTheme: (theme: CatppuccinFlavor) => void;
  }

  // Subscribe to theme store state
  let currentTheme = $state<CatppuccinFlavor>(
    themeStore.getState().currentTheme
  );
  let isLoading = $state<boolean>(themeStore.getState().isLoading);

  // Subscribe to store updates
  themeStore.subscribe((state) => {
    currentTheme = state.currentTheme;
    isLoading = state.isLoading;

    // Apply theme class whenever it changes
    applyTheme(state.currentTheme);
  });

  // Apply theme class to document root
  function applyTheme(theme: CatppuccinFlavor) {
    const root = document.documentElement;

    // Remove all existing theme classes
    root.classList.remove(
      'theme-latte',
      'theme-frappe',
      'theme-macchiato',
      'theme-mocha'
    );

    // Add the new theme class
    root.classList.add(`theme-${theme}`);
  }

  // Set theme via store (persists to backend)
  async function setTheme(theme: CatppuccinFlavor) {
    await themeStore.getState().setTheme(theme);
  }

  // Load theme preference on mount
  onMount(async () => {
    // Load theme from backend via IPC
    await themeStore.getState().loadTheme();
  });

  // Provide theme context to child components
  setContext<ThemeContext>('theme', {
    currentTheme: () => currentTheme,
    setTheme,
  });

  // Export props
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="theme-provider">
  {@render children?.()}
</div>

<style>
  .theme-provider {
    width: 100%;
    height: 100%;
  }
</style>
