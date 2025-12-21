import { vi } from 'vitest';
import path from 'path';
import os from 'os';

// Mock Electron app before any imports that use it
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') {
        return path.join(os.tmpdir(), 'radiant-test-userData');
      }
      return os.tmpdir();
    }),
  },
}));
