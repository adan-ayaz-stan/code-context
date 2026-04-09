import * as assert from 'assert';
import * as path from 'path';
import { resolveImport, loadTsConfigPaths, findWorkspaceRoot } from '../../core/pathResolver';

// __dirname at runtime = out/test/unit; fixtures live in src/test/fixtures as .ts source files
const FIXTURES = path.resolve(__dirname, '../../../src/test/fixtures');

suite('pathResolver', () => {
  const workspaceRoot = FIXTURES;
  const emptyPaths = {};
  const baseUrl = workspaceRoot;

  test('resolves a relative .ts import without extension', () => {
    const from = path.join(FIXTURES, 'simple', 'main.ts');
    const result = resolveImport('./utils', from, workspaceRoot, emptyPaths, baseUrl, false);
    assert.strictEqual(result, path.join(FIXTURES, 'simple', 'utils.ts'));
  });

  test('resolves a relative .ts import with another sibling', () => {
    const from = path.join(FIXTURES, 'simple', 'main.ts');
    const result = resolveImport('./date-helper', from, workspaceRoot, emptyPaths, baseUrl, false);
    assert.strictEqual(result, path.join(FIXTURES, 'simple', 'date-helper.ts'));
  });

  test('resolves a deeper relative path', () => {
    const from = path.join(FIXTURES, 'nested', 'a.ts');
    const result = resolveImport('./b', from, workspaceRoot, emptyPaths, baseUrl, false);
    assert.strictEqual(result, path.join(FIXTURES, 'nested', 'b.ts'));
  });

  test('returns null for node_modules imports', () => {
    const from = path.join(FIXTURES, 'function-level', 'large-file.ts');
    const result = resolveImport('fs', from, workspaceRoot, emptyPaths, baseUrl, false);
    assert.strictEqual(result, null);
  });

  test('returns null for non-existent files', () => {
    const from = path.join(FIXTURES, 'simple', 'main.ts');
    const result = resolveImport('./nonexistent', from, workspaceRoot, emptyPaths, baseUrl, false);
    assert.strictEqual(result, null);
  });

  test('findWorkspaceRoot walks up to find package.json', () => {
    const from = path.join(FIXTURES, 'simple', 'main.ts');
    // Our test fixtures live inside the extension project, so root should be the project root
    const root = findWorkspaceRoot(from);
    assert.ok(root.length > 0);
    assert.ok(!root.includes('fixtures'));
  });

  test('loadTsConfigPaths returns empty paths gracefully for non-existent tsconfig', () => {
    const r = loadTsConfigPaths('/nonexistent/path');
    assert.deepStrictEqual(r.paths, {});
  });
});
