import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

const appRoot = new URL('../', import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, appRoot), 'utf8');
}

test('dashboard uses TanStack Router and Query as the portal shell', async () => {
  const pkg = JSON.parse(await readProjectFile('package.json'));
  const main = await readProjectFile('src/main.tsx');
  const app = await readProjectFile('src/App.tsx');

  assert.ok(pkg.dependencies['@tanstack/react-router'], 'TanStack Router dependency is required');
  assert.ok(pkg.dependencies['@tanstack/react-query'], 'TanStack Query dependency is required');
  assert.match(main, /RouterProvider/);
  assert.match(main, /QueryClientProvider/);
  assert.match(app, /createRootRoute/);
  assert.match(app, /createRoute/);
  assert.match(app, /createRouter/);
});

test('study cards prefetch cycle status before users click', async () => {
  const app = await readProjectFile('src/App.tsx');

  assert.match(app, /useQueryClient/);
  assert.match(app, /prefetchQuery/);
  assert.match(app, /onMouseEnter=\{onPrefetch\}/);
  assert.match(app, /onFocus=\{onPrefetch\}/);
  assert.match(app, /cycleStatusQueryOptions/);
  assert.match(app, /staleTime:\s*1000 \* 60/);
});

test('portal route keeps study and search state shareable in the URL', async () => {
  const app = await readProjectFile('src/App.tsx');

  assert.match(app, /validateSearch/);
  assert.match(app, /studySlug/);
  assert.match(app, /searchQuery/);
  assert.match(app, /navigate\(\{ search:/);
  assert.match(app, /replace:\s*true/);
});

test('portal normalizes invalid shared study slugs after data loads', async () => {
  const app = await readProjectFile('src/App.tsx');

  assert.match(app, /isInvalidStudySlug/);
  assert.match(app, /selectedStudy\.slug/);
  assert.match(app, /studySlug !== selectedStudy\.slug/);
});
