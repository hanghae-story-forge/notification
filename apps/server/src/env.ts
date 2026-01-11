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
    APP_ENV: z.enum(['local', 'production']).default('local'),
    DISCORD_WEBHOOK_URL: z
      .string()
      .url({ message: 'Invalid DISCORD_WEBHOOK_URL format' })
      .optional(),
    DISCORD_BOT_TOKEN: z
      .string()
      .min(1, { message: 'DISCORD_BOT_TOKEN is required' }),
    DISCORD_CLIENT_ID: z
      .string()
      .min(1, { message: 'DISCORD_CLIENT_ID is required' }),
    DISCORD_GUILD_ID: z
      .string()
      .min(1, { message: 'DISCORD_GUILD_ID is required' }),
    APP_ID: z.string().min(1, { message: 'APP_ID is required' }).optional(),
    APP_PRIVATE_KEY: z
      .string()
      .min(1, { message: 'APP_PRIVATE_KEY is required' })
      .optional(),
    APP_INSTALLATION_ID: z
      .string()
      .min(1, { message: 'APP_INSTALLATION_ID is required' })
      .optional(),
    // Discord OAuth2
    DISCORD_OAUTH_CLIENT_ID: z
      .string()
      .min(1, { message: 'DISCORD_OAUTH_CLIENT_ID is required' })
      .optional(),
    DISCORD_OAUTH_CLIENT_SECRET: z
      .string()
      .min(1, { message: 'DISCORD_OAUTH_CLIENT_SECRET is required' })
      .optional(),
    DISCORD_OAUTH_REDIRECT_URI: z
      .string()
      .url({ message: 'Invalid DISCORD_OAUTH_REDIRECT_URI format' })
      .optional(),
    // JWT
    JWT_SECRET: z
      .string()
      .min(32, { message: 'JWT_SECRET must be at least 32 characters' })
      .optional(),
    JWT_EXPIRES_IN: z.string().default('7d'),
    JWT_ISSUER: z.string().default('dongueldonguel'),
    JWT_AUDIENCE: z.string().default('dongueldonguel-api'),
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
    APP_ENV: process.env.APP_ENV,
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
    APP_ID: process.env.APP_ID,
    APP_PRIVATE_KEY: process.env.APP_PRIVATE_KEY,
    APP_INSTALLATION_ID: process.env.APP_INSTALLATION_ID,
    // Discord OAuth2
    DISCORD_OAUTH_CLIENT_ID: process.env.DISCORD_OAUTH_CLIENT_ID,
    DISCORD_OAUTH_CLIENT_SECRET: process.env.DISCORD_OAUTH_CLIENT_SECRET,
    DISCORD_OAUTH_REDIRECT_URI: process.env.DISCORD_OAUTH_REDIRECT_URI,
    // JWT
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    JWT_ISSUER: process.env.JWT_ISSUER,
    JWT_AUDIENCE: process.env.JWT_AUDIENCE,
  },

  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
   * Useful for Docker builds or CI environments.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Called when env validation fails.
   */
  onValidationError: (error: unknown) => {
    console.error('❌ Invalid environment variables:');
    console.error(error);
    throw new Error('Invalid environment variables');
  },
});
