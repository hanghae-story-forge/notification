import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here.
   */
  server: {
    DATABASE_URL: z.string().url({ message: 'Invalid DATABASE_URL format' }),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    DISCORD_WEBHOOK_URL: z
      .string()
      .url({ message: 'Invalid DISCORD_WEBHOOK_URL format' })
      .optional(),
    DISCORD_BOT_TOKEN: z
      .string()
      .min(1, { message: 'DISCORD_BOT_TOKEN is required' })
      .optional(),
    DISCORD_CLIENT_ID: z
      .string()
      .min(1, { message: 'DISCORD_CLIENT_ID is required' })
      .optional(),
    DISCORD_GUILD_ID: z
      .string()
      .min(1, { message: 'DISCORD_GUILD_ID is required' })
      .optional(),
    APP_ID: z.string().min(1, { message: 'APP_ID is required' }).optional(),
    APP_PRIVATE_KEY: z
      .string()
      .min(1, { message: 'APP_PRIVATE_KEY is required' })
      .optional(),
    APP_INSTALLATION_ID: z
      .string()
      .min(1, { message: 'APP_INSTALLATION_ID is required' })
      .optional(),
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
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
    APP_ID: process.env.APP_ID,
    APP_PRIVATE_KEY: process.env.APP_PRIVATE_KEY,
    APP_INSTALLATION_ID: process.env.APP_INSTALLATION_ID,
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
