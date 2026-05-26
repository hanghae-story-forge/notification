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
  assert.match(app, /박준형 @bbakjun/);
  assert.match(app, /제목이 없으면 URL/);
  assert.match(styles, /color-scheme: light/);
  assert.match(styles, /#ffffff/);
});

test('dashboard client uses public studies API, Discord auth session, and cycle status proxy', async () => {
  const app = await readProjectFile('src/App.tsx');
  const studiesProxy = await readProjectFile('functions/api/studies/[[path]].js');
  const authLogin = await readProjectFile('functions/api/auth/discord/login.js');
  const authMe = await readProjectFile('functions/api/auth/me.js');

  assert.match(app, /\/api\/studies/);
  assert.match(app, /\/api\/studies\/me/);
  assert.match(app, /\/api\/auth\/me/);
  assert.match(app, /\/api\/status\/\$\{cycleId\}/);
  assert.doesNotMatch(app, /onrender\.com/);
  assert.match(studiesProxy, /\/api\/studies/);
  assert.match(authLogin, /DISCORD_CLIENT_ID/);
  assert.match(authLogin, /discord\.com\/oauth2\/authorize/);
  assert.match(authMe, /discord_session/);
});

test('server exposes study portal read APIs backed by organization-as-study model', async () => {
  const index = await readRepoFile('apps/server/src/index.ts');
  const handlers = await readRepoFile('apps/server/src/presentation/http/studies/studies.handlers.ts');

  assert.match(index, /getPublicStudies/);
  assert.match(index, /\/api\/studies/);
  assert.match(index, /\/api\/studies\/me/);
  assert.match(handlers, /organizations/);
  assert.match(handlers, /findByDiscordId/);
  assert.match(handlers, /findByMemberWithOrganizations/);
  assert.match(handlers, /mySubmissionStatus/);
});
