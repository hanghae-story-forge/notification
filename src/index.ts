import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ApolloServer } from '@apollo/server';
import { githubWebhook } from './routes/github';
import { reminder } from './routes/reminder';
import { status } from './routes/status';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';

import './env';

const app = new Hono();

// CORS 허용
app.use('/*', cors());

// Health check
app.get('/', (c) => c.json({ status: 'ok', message: '똥글똥글 API' }));

// GitHub webhook
app.route('/webhook/github', githubWebhook);

// n8n용 API
app.route('/api/reminder', reminder);
app.route('/api/status', status);

// Apollo Server 설정
const apollo = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // 개발용 스키마 탐색 허용
});

// GraphQL 엔드포인트
app.all('/graphql', async (c) => {
  const { method } = c.req;
  if (method !== 'GET' && method !== 'POST') {
    return c.text('Method Not Allowed', 405);
  }

  const query = c.req.query();
  const body = method === 'POST' ? await c.req.json() : null;

  const response = await apollo.executeOperation({
    query: body?.query || query.query,
    variables: body?.variables || query.variables,
    operationName: body?.operationName || query.operationName,
  });

  const headers: Record<string, string> = {};
  response.http.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const result = 'body' in response ? (response.body as { singleResult: unknown }) : response;

  return c.json(result, 200, headers);
});

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server ready on http://localhost:${port}`);
console.log(`📊 GraphQL: http://localhost:${port}/graphql`);
