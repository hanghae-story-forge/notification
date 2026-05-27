import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

const appRoot = new URL('../', import.meta.url);
const repoRoot = new URL('../../', appRoot);

async function readProjectFile(path) {
  return readFile(new URL(path, appRoot), 'utf8');
}

async function readRepoFile(path) {
  return readFile(new URL(path, repoRoot), 'utf8');
}

test('study portal reflects interviewed product requirements', async () => {
  const app = await readProjectFile('src/App.tsx');
  const styles = await readProjectFile('src/styles.css');

  assert.match(app, /스터디 탐색/);
  assert.match(app, /내 스터디/);
  assert.match(app, /제출글 모아보기/);
  assert.match(app, /내 제출 상태/);
  assert.match(app, /Discord로 로그인/);
  assert.match(app, /\/submit url:https:\/\/your-blog\.com\/post/);
  assert.match(app, /전체 공개 스터디/);
  assert.match(app, /로그인하면 내 제출 상태/);
  assert.match(app, /블로그 글을 제출하고 함께 읽는 공간/);
  assert.match(app, /현재 진행 중인 회차/);
  assert.doesNotMatch(app, /TanStack Query 프리페칭/);
  assert.doesNotMatch(app, /Airbnb 참고/);
  assert.doesNotMatch(app, /제목이 없으면 URL/);
  assert.doesNotMatch(app, /예: 박준형 @bbakjun/);
  assert.doesNotMatch(app, /syncing/);
  assert.doesNotMatch(app, /OAuth 설정 필요/);
  assert.match(styles, /color-scheme: light/);
  assert.match(styles, /#ffffff/);
});

test('portal document metadata is customer-facing, not admin or implementation copy', async () => {
  const html = await readProjectFile('index.html');

  assert.match(html, /스터디 제출 현황/);
  assert.match(html, /스터디원들과 제출 현황을 함께 확인하는 공개 포털/);
  assert.doesNotMatch(html, /어드민/);
  assert.doesNotMatch(html, /운영자를 위한/);
});

test('dashboard client uses public studies API, Discord auth session, cycle status proxy, and API envelopes', async () => {
  const app = await readProjectFile('src/App.tsx');
  const shared = await readProjectFile('functions/_shared.js');
  const studiesProxy = await readProjectFile(
    'functions/api/studies/[[path]].js',
  );
  const authLogin = await readProjectFile(
    'functions/api/auth/discord/login.js',
  );
  const authMe = await readProjectFile('functions/api/auth/me.js');

  assert.match(app, /\/api\/studies/);
  assert.match(app, /\/api\/studies\/me/);
  assert.match(app, /\/api\/auth\/me/);
  assert.match(app, /\/api\/status\/\$\{cycleId\}/);
  assert.match(app, /unwrapApiResponse/);
  assert.match(app, /success/);
  assert.match(app, /data/);
  assert.doesNotMatch(app, /onrender\.com/);
  assert.match(shared, /apiSuccess/);
  assert.match(shared, /apiFailure/);
  assert.match(studiesProxy, /\/api\/studies/);
  assert.match(authLogin, /DISCORD_CLIENT_ID/);
  assert.match(authLogin, /discord\.com\/oauth2\/authorize/);
  assert.match(authMe, /apiSuccess/);
});

test('server wraps REST API responses in a standard envelope', async () => {
  const index = await readRepoFile('apps/server/src/index.ts');
  const envelope = await readRepoFile(
    'apps/server/src/presentation/shared/api-envelope.ts',
  );

  assert.match(index, /apiEnvelopeMiddleware/);
  assert.match(index, /app\.use\('\/api\/\*'/);
  assert.match(envelope, /success: true/);
  assert.match(envelope, /success: false/);
  assert.match(envelope, /data/);
  assert.match(envelope, /error/);
  assert.match(envelope, /requestId/);
  assert.match(envelope, /timestamp/);
});

test('server exposes study portal read APIs backed by organization-as-study model', async () => {
  const index = await readRepoFile('apps/server/src/index.ts');
  const handlers = await readRepoFile(
    'apps/server/src/presentation/http/studies/studies.handlers.ts',
  );

  assert.match(index, /getPublicStudies/);
  assert.match(index, /\/api\/studies/);
  assert.match(index, /\/api\/studies\/me/);
  assert.match(handlers, /organizations/);
  assert.match(handlers, /findByDiscordId/);
  assert.match(handlers, /findByMemberWithOrganizations/);
  assert.match(handlers, /mySubmissionStatus/);
});
