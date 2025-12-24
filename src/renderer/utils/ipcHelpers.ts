import type { IPCResponse } from '../../types';

/**
 * Unwraps an IPC response and throws if it contains an error.
 * This helper simplifies error handling in stores by converting
 * the IPC response format back into thrown errors that can be
 * caught by withLoading.
 *
 * @param response - The IPC response to unwrap
 * @returns The data if successful
 * @throws Error if the response contains an error
 */
export function unwrapIPCResponse<T>(response: IPCResponse<T>): T {
  if (!response.success) {
    const error = new Error(response.error.message);
    // Preserve error code if available
    if (response.error.code) {
      (error as Error & { code?: string }).code = response.error.code;
    }
    throw error;
  }
  return response.data;
}
