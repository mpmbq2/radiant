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
