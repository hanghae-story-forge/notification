import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

const appRoot = new URL('../', import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, appRoot), 'utf8');
}

test('dashboard is a Vite React admin service built with shadcn-style components', async () => {
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

test('admin UX tells operators what to look at first', async () => {
  const app = await readProjectFile('src/App.tsx');

  assert.match(app, /운영자가 지금 봐야 할 것/);
  assert.match(app, /미제출 먼저 확인/);
  assert.match(app, /제출률 추이/);
  assert.match(app, /운영 액션/);
  assert.match(app, /Discord \/submit 안내/);
  assert.match(app, /현재 회차 불러오기/);
  assert.match(app, /제출 현황 새로고침/);
  assert.match(app, /미제출자에게 리마인드/);
});

test('admin client keeps same-origin status API and safe rendering helpers', async () => {
  const app = await readProjectFile('src/App.tsx');

  assert.match(app, /const API_BASE_URL = ''/);
  assert.doesNotMatch(app, /onrender\.com/);
  assert.match(app, /\/api\/status\/current\?organizationSlug=/);
  assert.match(app, /\/api\/status\/\$\{nextCycleId\.trim\(\)\}\?organizationSlug=/);
  assert.match(app, /type CycleStatus/);
  assert.match(app, /submissionRate/);
  assert.match(app, /notSubmitted/);
});

test('Pages config deploys built admin service and preserves status proxy', async () => {
  const config = await readProjectFile('wrangler.toml');
  const proxy = await readProjectFile('functions/api/status/[[path]].js');

  assert.match(config, /name\s*=\s*"donguel-donguel-dashboard"/);
  assert.match(config, /pages_build_output_dir\s*=\s*"dist"/);
  assert.match(proxy, /donguel-donguel-notification\.onrender\.com/);
  assert.match(proxy, /onRequestGet/);
  assert.match(proxy, /Access-Control-Allow-Origin/);
});
