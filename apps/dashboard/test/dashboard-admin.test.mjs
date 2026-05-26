import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

const appRoot = new URL('../', import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, appRoot), 'utf8');
}

test('dashboard is a Vite React study portal built with shadcn-style components', async () => {
  const packageJson = JSON.parse(await readProjectFile('package.json'));
  const app = await readProjectFile('src/App.tsx');
  const button = await readProjectFile('src/components/ui/button.tsx');
  const card = await readProjectFile('src/components/ui/card.tsx');
  const badge = await readProjectFile('src/components/ui/badge.tsx');

  assert.equal(packageJson.scripts.build, 'vite build');
  assert.equal(packageJson.scripts.dev, 'vite --host 0.0.0.0');
  assert.match(packageJson.dependencies.react, /\^/);
  assert.match(packageJson.devDependencies.tailwindcss, /\^/);

  assert.match(button, /class-variance-authority/);
  assert.match(button, /buttonVariants/);
  assert.match(card, /CardHeader/);
  assert.match(badge, /badgeVariants/);
  assert.match(app, /from '.\/components\/ui\/button'/);
  assert.match(app, /from '.\/components\/ui\/card'/);
  assert.match(app, /from '.\/components\/ui\/badge'/);
});

test('portal UX focuses on study discovery, collected submissions, and my status', async () => {
  const app = await readProjectFile('src/App.tsx');

  assert.match(app, /스터디 탐색/);
  assert.match(app, /내 스터디/);
  assert.match(app, /전체 공개 스터디/);
  assert.match(app, /제출글 모아보기/);
  assert.match(app, /내 제출 상태/);
  assert.match(app, /Discord로 로그인/);
  assert.match(app, /\/submit url:https:\/\/your-blog\.com\/post/);
});

test('portal client keeps same-origin APIs and safe rendering helpers', async () => {
  const app = await readProjectFile('src/App.tsx');

  assert.match(app, /const API_BASE_URL = ''/);
  assert.doesNotMatch(app, /onrender\.com/);
  assert.match(app, /\/api\/studies/);
  assert.match(app, /\/api\/studies\/me/);
  assert.match(app, /\/api\/auth\/me/);
  assert.match(app, /\/api\/status\/\$\{cycleId\}/);
  assert.match(app, /formatAuthor/);
  assert.match(app, /getSubmissionTitle/);
});

test('Pages config deploys built portal and preserves API proxies', async () => {
  const config = await readProjectFile('wrangler.toml');
  const statusProxy = await readProjectFile('functions/api/status/[[path]].js');
  const studiesProxy = await readProjectFile('functions/api/studies/[[path]].js');
  const authLogin = await readProjectFile('functions/api/auth/discord/login.js');
  const authMe = await readProjectFile('functions/api/auth/me.js');

  assert.match(config, /name\s*=\s*"donguel-donguel-dashboard"/);
  assert.match(config, /pages_build_output_dir\s*=\s*"dist"/);
  assert.match(statusProxy, /donguel-donguel-notification\.onrender\.com/);
  assert.match(studiesProxy, /\/api\/studies/);
  assert.match(authLogin, /DISCORD_CLIENT_ID/);
  assert.match(authLogin, /discord\.com\/oauth2\/authorize/);
  assert.match(authMe, /discord_session/);
});
