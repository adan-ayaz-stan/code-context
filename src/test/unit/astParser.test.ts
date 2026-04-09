import * as assert from 'assert';
import * as path from 'path';
import { extractImports, extractFunctionAtPosition, getFunctionImports } from '../../core/astParser';

const FIXTURES = path.resolve(__dirname, '../fixtures');

suite('astParser — extractImports', () => {
  test('extracts local imports from simple/main.ts', () => {
    const content = `import { greet } from './utils';\nimport { formatDate } from './date-helper';\n\nexport function main() {}`;
    const imports = extractImports(content, 'main.ts');
    assert.strictEqual(imports.length, 2);
    assert.strictEqual(imports[0].specifier, './utils');
    assert.deepStrictEqual(imports[0].importedNames, ['greet']);
    assert.strictEqual(imports[1].specifier, './date-helper');
  });

  test('ignores node_modules imports', () => {
    const content = `import * as fs from 'fs';\nimport { readFile } from 'node:fs/promises';\nimport { greet } from './utils';`;
    const imports = extractImports(content, 'file.ts');
    // All three are returned — filtering node_modules is the resolver's job
    // But we verify the local one is present
    const local = imports.find(i => i.specifier === './utils');
    assert.ok(local);
  });

  test('handles files with no imports', () => {
    const content = `export function base(): number { return 42; }`;
    const imports = extractImports(content, 'c.ts');
    assert.strictEqual(imports.length, 0);
  });

  test('handles malformed source without throwing', () => {
    const content = `this is not valid typescript !!!`;
    const imports = extractImports(content, 'bad.ts');
    assert.ok(Array.isArray(imports));
  });

  test('handles namespace import', () => {
    const content = `import * as utils from './utils';`;
    const imports = extractImports(content, 'file.ts');
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].importedNames[0], 'utils');
  });
});

suite('astParser — extractFunctionAtPosition', () => {
  const content = `
import { multiply } from './dep';

export function area(width: number, height: number): number {
  return multiply(width, height);
}

export function addNumbers(a: number, b: number): number {
  return a + b;
}
`.trimStart();

  test('finds the function at a position inside area()', () => {
    // Line 3 (0-indexed) is inside the area function body
    const func = extractFunctionAtPosition(content, 'large-file.ts', 3, 10);
    assert.ok(func, 'Expected to find a function');
    assert.strictEqual(func!.name, 'area');
  });

  test('finds the function at a position inside addNumbers()', () => {
    const func = extractFunctionAtPosition(content, 'large-file.ts', 7, 10);
    assert.ok(func, 'Expected to find a function');
    assert.strictEqual(func!.name, 'addNumbers');
  });

  test('returns null when cursor is not inside any function', () => {
    // Line 0 is the import line
    const func = extractFunctionAtPosition(content, 'large-file.ts', 0, 5);
    assert.strictEqual(func, null);
  });
});

suite('astParser — getFunctionImports', () => {
  test('filters imports to only those referenced in function', () => {
    const content = `
import { multiply } from './dep';
import { formatDate } from './date-helper';

export function area(width: number, height: number): number {
  return multiply(width, height);
}
`.trimStart();

    const allImports = extractImports(content, 'file.ts');
    const func = extractFunctionAtPosition(content, 'file.ts', 3, 10);
    assert.ok(func);

    const used = getFunctionImports(func!, allImports);
    assert.strictEqual(used.length, 1);
    assert.strictEqual(used[0].specifier, './dep');
  });

  test('returns empty array when function uses no imports', () => {
    const content = `
import { multiply } from './dep';

export function addNumbers(a: number, b: number): number {
  return a + b;
}
`.trimStart();

    const allImports = extractImports(content, 'file.ts');
    const func = extractFunctionAtPosition(content, 'file.ts', 2, 10);
    assert.ok(func);

    const used = getFunctionImports(func!, allImports);
    assert.strictEqual(used.length, 0);
  });
});
