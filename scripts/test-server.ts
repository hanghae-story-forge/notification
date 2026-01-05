#!/usr/bin/env tsx
/**
 * Test Server with SQLite In-Memory Database
 *
 * This script starts a test server with an in-memory SQLite database
 * for webhook testing purposes.
 *
 * Usage:
 *   pnpm test:server
 */

import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, and } from 'drizzle-orm';

// Import existing handlers
import { handleIssueComment, handleIssues, handleUnknownEvent } from '../src/routes/github/github.handlers';
import { sendDiscordWebhook, createSubmissionMessage } from '../src/services/discord';

// SQLite schema (simplified for testing)
interface SQLiteSchema {
  members: {
    id: number;
    github: string;
    discordId: string | null;
    name: string;
    createdAt: Date;
  }[];
  generations: {
    id: number;
    name: string;
    startedAt: Date;
    isActive: boolean;
    createdAt: Date;
  }[];
  cycles: {
    id: number;
    generationId: number;
    week: number;
    startDate: Date;
    endDate: Date;
    githubIssueUrl: string | null;
    createdAt: Date;
  }[];
  submissions: {
    id: number;
    cycleId: number;
    memberId: number;
    url: string;
    submittedAt: Date;
    githubCommentId: string | null;
  }[];
}

// Create in-memory SQLite database
const sqlite = new Database(':memory:');
const db = drizzle(sqlite);

// Initialize tables
sqlite.exec(`
  CREATE TABLE members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github TEXT NOT NULL UNIQUE,
    discord_id TEXT UNIQUE,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    started_at DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT 1 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    generation_id INTEGER NOT NULL REFERENCES generations(id),
    week INTEGER NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    github_issue_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_id INTEGER NOT NULL REFERENCES cycles(id),
    member_id INTEGER NOT NULL REFERENCES members(id),
    url TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    github_comment_id TEXT UNIQUE
  );

  CREATE INDEX cycles_generation_idx ON cycles(generation_id);
  CREATE INDEX submissions_cycle_member_idx ON submissions(cycle_id, member_id);
`);

// Seed test data
const now = new Date();
const weekInMs = 7 * 24 * 60 * 60 * 1000;

// Insert test generation
const genResult = sqlite.prepare('INSERT INTO generations (name, started_at, is_active) VALUES (?, ?, ?)').run(
  '똥글똥글 1기',
  now.toISOString(),
  1
);
const generationId = genResult.lastInsertRowid as number;

// Insert test cycle
const cycleResult = sqlite.prepare('INSERT INTO cycles (generation_id, week, start_date, end_date, github_issue_url) VALUES (?, ?, ?, ?, ?)').run(
  generationId,
  1,
  now.toISOString(),
  new Date(now.getTime() + weekInMs).toISOString(),
  'https://github.com/dongueldonguel/test/issues/1'
);
const cycleId = cycleResult.lastInsertRowid as number;

// Insert test member
const memberResult = sqlite.prepare('INSERT INTO members (github, name, discord_id) VALUES (?, ?, ?)').run(
  'test-user',
  '테스트 사용자',
  '123456789'
);
const memberId = memberResult.lastInsertRowid as number;

console.log('\n📊 Test Database Initialized:');
console.log(`   - Generation: 똥글똥글 1기 (id: ${generationId})`);
console.log(`   - Cycle: 1주차 (id: ${cycleId})`);
console.log(`   - Member: test-user (id: ${memberId})`);
console.log(`   - Issue URL: https://github.com/dongueldonguel/test/issues/1\n`);

// Mock DB functions compatible with existing handlers
const mockDb = {
  select: (columns: any) => ({
    from: (table: any) => ({
      where: (condition: any) => {
        // Simple query execution
        let query = 'SELECT * FROM ' + table;
        const params: any[] = [];

        if (condition) {
          // Handle eq() conditions
          const right = condition._?.right;
          if (right !== undefined) {
            query += ' WHERE github = ?';
            params.push(right);
          }
        }

        const rows = sqlite.prepare(query).all(...params);
        return {
          length: rows.length,
          cycle: rows[0],
          [0]: rows[0]
        };
      },
      orderBy: () => ({
        limit: () => ({
          all: () => {
            const rows = sqlite.prepare('SELECT * FROM generations WHERE is_active = 1 ORDER BY created_at').all();
            return rows;
          }
        })
      })
    })
  }),
  insert: (table: any) => ({
    values: (data: any) => ({
      returning: () => {
        let tableName = '';
        if (table === 'members') tableName = 'members';
        else if (table === 'cycles') tableName = 'cycles';
        else if (table === 'submissions') tableName = 'submissions';
        else if (table === 'generations') tableName = 'generations';

        const result = sqlite.prepare(`INSERT INTO ${tableName} (${Object.keys(data).join(', ')}) VALUES (${Object.keys(data).map(() => '?').join(', ')})`).run(...Object.values(data));

        const inserted = sqlite.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`).get(result.lastInsertRowid);
        return [inserted];
      }
    })
  })
};

// Create Hono app
const app = new Hono();
app.use('/*', cors());

// Health check
app.get('/', (c) => c.json({ status: 'ok', message: 'Test Server (SQLite)' }));

// Mock Discord webhook (log instead of sending)
const mockSendDiscordWebhook = async (url: string, payload: any) => {
  console.log('\n📬 Discord Webhook (mock):');
  console.log(`   URL: ${url}`);
  console.log(`   Payload:`, JSON.stringify(payload, null, 2));
};

// Webhook endpoint
app.post('/webhook/github', async (c) => {
  const githubEvent = c.req.header('x-github-event');
  const payload = await c.req.json();

  console.log(`\n📥 Webhook received: ${githubEvent}`);
  console.log(`   Payload:`, JSON.stringify(payload, null, 2));

  // Route to appropriate handler
  if (githubEvent === 'issue_comment') {
    return handleIssueComment(c);
  } else if (githubEvent === 'issues') {
    return handleIssues(c);
  } else {
    return handleUnknownEvent(c);
  }
});

// Start server
const port = parseInt(process.env.TEST_PORT || '3001');

console.log(`🧪 Test Server starting on port ${port}`);
console.log(`🔗 Webhook URL: http://localhost:${port}/webhook/github`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Test server ready on http://localhost:${port}\n`);
console.log('💡 Use another terminal to send test webhooks:');
console.log(`   WEBHOOK_URL=http://localhost:${port}/webhook/github pnpm test:webhook issue-comment\n`);
