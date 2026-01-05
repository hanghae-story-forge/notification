import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Context } from 'hono';

export type Bindings = {
  DISCORD_WEBHOOK_URL?: string;
  GITHUB_WEBHOOK_SECRET?: string;
};

export type Variables = Record<string, never>;

export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};

export type AppOpenAPIHono = OpenAPIHono<Env>;

export type AppContext = Context<Env>;

export function createRouter() {
  return new OpenAPIHono<Env>();
}

export { createRoute, z };
