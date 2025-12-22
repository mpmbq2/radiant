import { createLogger } from '../../utils/logger';

const logger = createLogger('withLoading');

/**
 * Generic helper function to wrap async operations with consistent loading state management.
 * Works with any Zustand store that has `isLoading` and `error` properties.
 * Ensures isLoading is always reset even when errors occur.
 *
 * @template T - The return type of the operation
 * @template S - The store state type (must have isLoading and error properties)
 * @param set - The Zustand store's setState function
 * @param operation - The async operation to wrap
 * @param operationName - Name of the operation for logging purposes
 * @param options - Configuration options
 * @param options.silent - When true, does not set isLoading state (for background operations)
 * @returns The result of the operation or void if an error occurred and rethrow is false
 */
export const withLoading = async <
  T,
  S extends { isLoading: boolean; error: string | null },
>(
  set: (state: Partial<S> | ((state: S) => Partial<S>)) => void,
  operation: () => Promise<T>,
  operationName = 'Operation',
  options: { rethrow?: boolean; silent?: boolean } = {}
): Promise<T | void> => {
  if (!options.silent) {
    set({ isLoading: true, error: null } as Partial<S>);
  }
  try {
    return await operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `${operationName} failed:`,
      error instanceof Error ? error : new Error(String(error))
    );
    set({ error: errorMessage } as Partial<S>);
    if (options.rethrow) {
      throw error;
    }
  } finally {
    if (!options.silent) {
      set({ isLoading: false } as Partial<S>);
    }
  }
};
