import * as assert from 'assert';
import { formatFiles, formatFunctionWithDeps } from '../../core/formatter';
import type { ResolvedFile } from '../../core/dependencyResolver';

const makeFile = (relativePath: string, content: string): ResolvedFile => ({
  absolutePath: `/tmp/${relativePath}`,
  relativePath,
  content,
});

suite('formatter — formatFiles', () => {
  test('comment-path format: single file', () => {
    const files = [makeFile('src/utils.ts', 'export const x = 1;')];
    const { text, fileCount, lineCount } = formatFiles(files, { format: 'comment-path' });
    assert.ok(text.startsWith('// src/utils.ts'));
    assert.ok(text.includes('export const x = 1;'));
    assert.strictEqual(fileCount, 1);
    assert.strictEqual(lineCount, 1);
  });

  test('comment-path format: multiple files separated by blank line', () => {
    const files = [
      makeFile('src/a.ts', 'const a = 1;'),
      makeFile('src/b.ts', 'const b = 2;'),
    ];
    const { text } = formatFiles(files, { format: 'comment-path' });
    assert.ok(text.includes('// src/a.ts'));
    assert.ok(text.includes('// src/b.ts'));
    // Files separated by double newline
    assert.ok(text.includes('\n\n'));
  });

  test('markdown-codeblock format: wraps in triple backticks', () => {
    const files = [makeFile('src/utils.ts', 'export const x = 1;')];
    const { text } = formatFiles(files, { format: 'markdown-codeblock' });
    assert.ok(text.startsWith('```typescript'));
    assert.ok(text.endsWith('```'));
    assert.ok(text.includes('// src/utils.ts'));
  });

  test('markdown-codeblock: uses correct language tag for tsx', () => {
    const files = [makeFile('src/App.tsx', 'export default function App() {}')];
    const { text } = formatFiles(files, { format: 'markdown-codeblock' });
    assert.ok(text.startsWith('```tsx'));
  });

  test('markdown-codeblock: uses correct language tag for js', () => {
    const files = [makeFile('src/app.js', 'const x = 1;')];
    const { text } = formatFiles(files, { format: 'markdown-codeblock' });
    assert.ok(text.startsWith('```javascript'));
  });

  test('returns correct lineCount across multiple files', () => {
    const files = [
      makeFile('a.ts', 'line1\nline2\nline3'),
      makeFile('b.ts', 'line1\nline2'),
    ];
    const { lineCount } = formatFiles(files, { format: 'comment-path' });
    assert.strictEqual(lineCount, 5);
  });
});

suite('formatter — formatFunctionWithDeps', () => {
  test('includes function header with name', () => {
    const depFiles = [makeFile('src/dep.ts', 'export const x = 1;')];
    const { text } = formatFunctionWithDeps(
      'function foo() { return 1; }',
      'src/main.ts',
      'foo',
      depFiles,
      { format: 'comment-path' }
    );
    assert.ok(text.includes('// src/main.ts — function: foo'));
    assert.ok(text.includes('function foo()'));
    assert.ok(text.includes('// src/dep.ts'));
  });

  test('handles null function name gracefully', () => {
    const { text } = formatFunctionWithDeps(
      '() => 42',
      'src/main.ts',
      null,
      [],
      { format: 'comment-path' }
    );
    assert.ok(text.includes('// src/main.ts'));
    assert.ok(!text.includes('function:'));
  });

  test('fileCount includes root + deps', () => {
    const depFiles = [makeFile('dep1.ts', 'x'), makeFile('dep2.ts', 'y')];
    const { fileCount } = formatFunctionWithDeps('fn(){}', 'main.ts', 'fn', depFiles, {
      format: 'comment-path',
    });
    assert.strictEqual(fileCount, 3); // 1 (function file) + 2 deps
  });
});
