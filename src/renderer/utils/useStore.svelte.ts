import { onDestroy } from 'svelte';
import type { StoreApi } from 'zustand/vanilla';

/**
 * Subscribe to a Zustand vanilla store with automatic cleanup.
 * This is a lightweight wrapper that eliminates the manual onDestroy boilerplate.
 *
 * For Svelte 5 components, declare your reactive variables with $state
 * and update them in the callback.
 *
 * @param store - The Zustand vanilla store to subscribe to
 * @param callback - Function called with new state on each store change
 *
 * @example
 * // Before (30-40 lines of boilerplate):
 * let currentNote = store.getState().currentNote;
 * let isLoading = store.getState().isLoading;
 * const unsubscribe = store.subscribe((state) => {
 *   currentNote = state.currentNote;
 *   isLoading = state.isLoading;
 * });
 * onDestroy(() => {
 *   unsubscribe();
 * });
 *
 * // After (clean and concise):
 * let currentNote = $state(store.getState().currentNote);
 * let isLoading = $state(store.getState().isLoading);
 * subscribeStore(store, (state) => {
 *   currentNote = state.currentNote;
 *   isLoading = state.isLoading;
 * });
 */
export function subscribeStore<T>(
  store: StoreApi<T>,
  callback: (state: T) => void
): void {
  const unsubscribe = store.subscribe(callback);
  onDestroy(unsubscribe);
}

/**
 * Create reactive store bindings with a selector function.
 * Returns a reactive container that automatically updates when the store changes.
 *
 * This is useful when you need a single computed value from the store.
 *
 * @param store - The Zustand vanilla store
 * @param selector - Function to select/derive a value from store state
 * @returns Reactive state container with a `value` property
 *
 * @example
 * const currentNote = useStore(notesStore, s => s.currentNote);
 * const isLoading = useStore(notesStore, s => s.isLoading);
 * // Access values: currentNote.value, isLoading.value
 */
export function useStore<T, U>(
  store: StoreApi<T>,
  selector: (state: T) => U
): { value: U } {
  let value = $state(selector(store.getState())) as U;

  const unsubscribe = store.subscribe((state) => {
    value = selector(state);
  });

  onDestroy(unsubscribe);

  return {
    get value() {
      return value;
    }
  };
}
