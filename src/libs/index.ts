import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Context } from 'hono';

export type Bindings = {
  DISCORD_WEBHOOK_URL?: string;
  GITHUB_WEBHOOK_SECRET?: string;
};

export type Variables = Record<string, never>;

export type AppOpenAPIHono = OpenAPIHono<{
  Bindings: Bindings;
  Variables: Variables;
}>;

export type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

export function createRouter() {
  return new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();
}

export { createRoute, z };
