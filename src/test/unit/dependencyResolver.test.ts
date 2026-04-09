import * as assert from 'assert';
import * as path from 'path';
import { resolveDependencies } from '../../core/dependencyResolver';

// __dirname at runtime = out/test/unit; fixtures live in src/test/fixtures as .ts source files
const FIXTURES = path.resolve(__dirname, '../../../src/test/fixtures');

suite('dependencyResolver', () => {
  const opts = {
    excludePatterns: [],
    followTsConfigPaths: false,
    workspaceRoot: FIXTURES,
  };

  test('depth 0 — returns only the root file', async () => {
    const root = path.join(FIXTURES, 'simple', 'main.ts');
    const files = await resolveDependencies(root, { ...opts, maxDepth: 0 });
    assert.strictEqual(files.length, 1);
    assert.ok(files[0].absolutePath.endsWith('main.ts'));
  });

  test('depth 1 — returns root + direct imports (simple)', async () => {
    const root = path.join(FIXTURES, 'simple', 'main.ts');
    const files = await resolveDependencies(root, { ...opts, maxDepth: 1 });
    // main.ts + utils.ts + date-helper.ts
    assert.strictEqual(files.length, 3);
    const paths = files.map(f => f.relativePath);
    assert.ok(paths.some(p => p.includes('main.ts')));
    assert.ok(paths.some(p => p.includes('utils.ts')));
    assert.ok(paths.some(p => p.includes('date-helper.ts')));
  });

  test('depth 2 — walks nested chain a → b → c', async () => {
    const root = path.join(FIXTURES, 'nested', 'a.ts');
    const files = await resolveDependencies(root, { ...opts, maxDepth: 2 });
    assert.strictEqual(files.length, 3);
    const paths = files.map(f => f.relativePath);
    assert.ok(paths.some(p => p.includes('a.ts')));
    assert.ok(paths.some(p => p.includes('b.ts')));
    assert.ok(paths.some(p => p.includes('c.ts')));
  });

  test('depth 1 — stops at depth limit', async () => {
    const root = path.join(FIXTURES, 'nested', 'a.ts');
    const files = await resolveDependencies(root, { ...opts, maxDepth: 1 });
    // a.ts + b.ts — c.ts is depth 2 and should be excluded
    assert.strictEqual(files.length, 2);
    const paths = files.map(f => f.relativePath);
    assert.ok(!paths.some(p => p.includes('c.ts')));
  });

  test('handles circular imports without infinite loop', async () => {
    const root = path.join(FIXTURES, 'circular', 'x.ts');
    // Should not hang, should return x.ts and y.ts
    const files = await resolveDependencies(root, { ...opts, maxDepth: 10 });
    assert.ok(files.length <= 2, `Expected ≤2 files, got ${files.length}`);
    assert.ok(files.length >= 1);
  });

  test('returns files in dependency-first order', async () => {
    const root = path.join(FIXTURES, 'nested', 'a.ts');
    const files = await resolveDependencies(root, { ...opts, maxDepth: 2 });
    const paths = files.map(f => f.relativePath);
    // c.ts (deepest dep) should come before b.ts, which before a.ts
    const idxC = paths.findIndex(p => p.includes('c.ts'));
    const idxB = paths.findIndex(p => p.includes('b.ts'));
    const idxA = paths.findIndex(p => p.includes('a.ts'));
    assert.ok(idxC < idxB, 'c.ts should appear before b.ts');
    assert.ok(idxB < idxA, 'b.ts should appear before a.ts');
  });
});
