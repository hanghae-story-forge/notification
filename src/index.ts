import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { githubWebhook } from './routes/github';
import { reminder } from './routes/reminder';
import { status } from './routes/status';

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

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server ready on http://localhost:${port}`);
