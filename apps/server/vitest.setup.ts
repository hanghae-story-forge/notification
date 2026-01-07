/**
 * Vitest Setup File
 *
 * This file runs before all tests to set up the test environment.
 */

import { vi } from 'vitest';

// Mock environment variables that are required by the application
process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
process.env.DISCORD_CLIENT_ID = 'test-client-id';
process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';

// Suppress console errors during tests (optional, for cleaner output)
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};
