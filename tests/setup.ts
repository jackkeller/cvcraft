import { vi, beforeEach } from 'vitest';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock process.exit to prevent tests from actually exiting
vi.stubGlobal('process', {
  ...process,
  exit: vi.fn(),
});

// Setup global test environment
beforeEach(() => {
  vi.clearAllMocks();
});
