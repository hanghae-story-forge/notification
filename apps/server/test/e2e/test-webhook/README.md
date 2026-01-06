# GitHub Webhook Test Guide

This directory contains sample GitHub webhook payloads for testing the `/webhook/github` endpoint.

## Quick Start

### Option 1: Test Server (Recommended - No DB Required)

The test server uses an **in-memory SQLite database** with pre-seeded test data.

```bash
# Terminal 1: Start test server (port 3001)
pnpm test:server

# Terminal 2: Send test webhooks
WEBHOOK_URL=http://localhost:3001/webhook/github pnpm test:webhook issue-comment
```

**Pre-seeded test data:**
| Type | Value |
|------|-------|
| Generation | 똥글똥글 1기 |
| Cycle | 1주차 |
| Member | `test-user` (GitHub username) |
| Issue URL | `https://github.com/dongueldonguel/test/issues/1` |

### Option 2: Main Development Server

Requires PostgreSQL database running.

```bash
# Terminal 1: Start dev server
pnpm dev

# Terminal 2: Send test webhooks
pnpm test:webhook issue-comment
```

## Running Tests

**List all available payloads:**
```bash
pnpm test:webhook
```

**Test specific webhook:**
```bash
# Valid issue comment with blog URL
pnpm test:webhook issue-comment

# Issue comment without URL (should return 400)
pnpm test:webhook issue-comment-no-url

# Valid issue opened with week pattern
pnpm test:webhook issues-opened

# Issue without week pattern (should be ignored)
pnpm test:webhook issues-invalid
```

## Available Test Payloads

| Payload | Event Type | Description |
|---------|------------|-------------|
| `issue-comment-created.json` | `issue_comment` | Normal submission with blog URL |
| `issue-comment-no-url.json` | `issue_comment` | Comment without URL (bad request) |
| `issues-opened.json` | `issues` | New cycle with valid week pattern |
| `issues-opened-invalid-title.json` | `issues` | Issue without week pattern (ignored) |

## Using curl Directly

**Test server (port 3001):**
```bash
curl -X POST http://localhost:3001/webhook/github \
  -H "Content-Type: application/json" \
  -H "x-github-event: issue_comment" \
  -d @test-webhook/issue-comment-created.json
```

**Main server (port 3000):**
```bash
curl -X POST http://localhost:3000/webhook/github \
  -H "Content-Type: application/json" \
  -H "x-github-event: issue_comment" \
  -d @test-webhook/issue-comment-created.json
```

## Expected Responses

| Scenario | Status | Response |
|----------|--------|----------|
| Valid submission | 200 | Submission recorded |
| No URL in comment | 400 | No URL found in comment |
| Unknown issue URL | 404 | No cycle found for this issue |
| Unknown user | 404 | Member not found |
| Duplicate submission | 200 | Already submitted |
| Valid cycle creation | 201 | Cycle created |
| No week pattern | 200 | No week pattern found (ignored) |

## Setup for Real Webhook Testing

To test with real GitHub webhooks:

1. **Use ngrok or similar** to expose localhost:
   ```bash
   ngrok http 3001
   ```

2. **Add webhook to GitHub repo:**
   - Go to repo Settings → Webhooks → Add webhook
   - Payload URL: `https://your-ngrok-url.ngrok.io/webhook/github`
   - Content type: `application/json`
   - Events: `Issue comments` → `Comment created`, `Issues` → `Issue created`

3. **Check GitHub webhook deliveries:**
   - GitHub repo → Settings → Webhooks → Recent deliveries
