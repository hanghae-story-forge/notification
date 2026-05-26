import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

const root = new URL('../public/', import.meta.url);

async function readAsset(name) {
  return readFile(new URL(name, root), 'utf8');
}

test('dashboard shell exposes study status controls and SEO metadata', async () => {
  const html = await readAsset('index.html');

  assert.match(html, /똥글똥글 스터디 현황판/);
  assert.match(html, /id="organizationSlug"/);
  assert.match(html, /id="cycleId"/);
  assert.match(html, /data-testid="load-current-cycle"/);
  assert.match(html, /data-testid="load-cycle-status"/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow"/);
  assert.match(html, /app\.js/);
}
);

test('dashboard client uses same-origin API and renders submission summary', async () => {
  const js = await readAsset('app.js');

  assert.match(js, /API_BASE_URL\s*=\s*['"]['"]/);
  assert.doesNotMatch(js, /onrender\.com/);
  assert.match(js, /\/api\/status\/current\?organizationSlug=/);
  assert.match(js, /\/api\/status\/\$\{cycleId\}\?organizationSlug=/);
  assert.match(js, /function renderStatus/);
  assert.match(js, /submitted/);
  assert.match(js, /notSubmitted/);
  assert.match(js, /제출률/);
}
);

test('Pages Function proxies status API with CORS-safe same-origin path', async () => {
  const fn = await readFile(new URL('../functions/api/status/[[path]].js', import.meta.url), 'utf8');

  assert.match(fn, /donguel-donguel-notification\.onrender\.com/);
  assert.match(fn, /onRequestGet/);
  assert.match(fn, /context\.params\.path/);
  assert.match(fn, /Access-Control-Allow-Origin/);
}
);

test('dashboard has production Pages config', async () => {
  const config = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');

  assert.match(config, /name\s*=\s*"donguel-donguel-dashboard"/);
  assert.match(config, /pages_build_output_dir\s*=\s*"public"/);
}
);
