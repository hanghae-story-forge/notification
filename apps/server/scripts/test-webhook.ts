#!/usr/bin/env tsx
/**
 * GitHub Webhook Test Script
 *
 * Usage:
 *   pnpm test:webhook                    # List available payloads
 *   pnpm test:webhook issue-comment      # Test issue comment webhook
 *   pnpm test:webhook issues-opened      # Test issues opened webhook
 *
 * Or use curl directly:
 *   curl -X POST http://localhost:3000/webhook/github \
 *        -H "Content-Type: application/json" \
 *        -H "x-github-event: issue_comment" \
 *        -d @test-webhook/issue-comment-created.json
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WEBHOOK_DIR = join(__dirname, '../test-webhook');

// Available test payloads
const PAYLOADS = {
  'issue-comment': {
    file: 'issue-comment-created.json',
    event: 'issue_comment',
    description: 'Valid issue comment with blog URL',
  },
  'issue-comment-no-url': {
    file: 'issue-comment-no-url.json',
    event: 'issue_comment',
    description: 'Issue comment without URL (should return 400)',
  },
  'issues-opened': {
    file: 'issues-opened.json',
    event: 'issues',
    description: 'Valid issue opened with week pattern',
  },
  'issues-invalid': {
    file: 'issues-opened-invalid-title.json',
    event: 'issues',
    description: 'Issue opened without week pattern (should be ignored)',
  },
};

async function sendWebhook(payloadKey: string) {
  const payload = PAYLOADS[payloadKey as keyof typeof PAYLOADS];

  if (!payload) {
    console.error('Unknown payload:', payloadKey);
    console.log('\nAvailable payloads:');
    Object.entries(PAYLOADS).forEach(([key, data]) => {
      console.log(`  ${key.padEnd(25)} - ${data.description}`);
    });
    process.exit(1);
  }

  const filePath = join(WEBHOOK_DIR, payload.file);
  const body = readFileSync(filePath, 'utf-8');

  const webhookUrl = process.env.WEBHOOK_URL ?? 'http://localhost:3000/webhook/github';

  console.log(`\n📤 Sending webhook: ${payloadKey}`);
  console.log(`   Event: ${payload.event}`);
  console.log(`   URL: ${webhookUrl}\n`);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': payload.event,
      },
      body,
    });

    const responseBody = await response.text();

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response: ${responseBody}\n`);

    if (!response.ok) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error sending webhook:', error);
    process.exit(1);
  }
}

// CLI interface
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('\n📋 Available webhook test payloads:\n');
  Object.entries(PAYLOADS).forEach(([key, data]) => {
    console.log(`  ${key.padEnd(25)} - ${data.description}`);
  });
  console.log('\nUsage: pnpm test:webhook <payload-key>');
  console.log('Example: pnpm test:webhook issue-comment\n');
  process.exit(0);
}

await sendWebhook(args[0]);
