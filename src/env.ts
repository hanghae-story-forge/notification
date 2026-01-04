import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here.
   */
  server: {
    DATABASE_URL: z
      .string()
      .url()
      .default('postgresql://localhost:5432/dongueldonguel'),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    DISCORD_WEBHOOK_URL: z.string().url().optional(),
  },

  /**
   * Specify your client-side environment variables schema here.
   * This is optional if you don't have client-side environment variables.
   */
  client: {
    // Add client-side variables here if needed
  },

  /**
   * Client prefix for client-side environment variables
   */
  clientPrefix: '',

  /**
   * Runtime environment variables
   */
  runtimeEnvStrict: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  },

  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
   * Useful for Docker builds or CI environments.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Called when env validation fails.
   */
  onValidationError: (error) => {
    console.error('❌ Invalid environment variables:');
    console.error(error);
    throw new Error('Invalid environment variables');
  },
});
