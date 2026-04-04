import { vi } from 'vitest';

// Make native Node.js 'fs' module spy-able by re-exporting via a mocked module.
// This is needed because native ESM named exports are non-configurable.
vi.mock('fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('fs')>();
  return { ...original, default: original };
});
