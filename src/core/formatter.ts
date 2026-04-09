import type { ResolvedFile } from './dependencyResolver';

export type OutputFormat = 'comment-path' | 'markdown-codeblock';

export interface FormatterOptions {
  format: OutputFormat;
}

export interface FormattedResult {
  /** The full clipboard string */
  text: string;
  /** Number of files included */
  fileCount: number;
  /** Total number of lines across all files */
  lineCount: number;
}

/**
 * Format a list of resolved files into a clipboard-ready string.
 *
 * Formats:
 *  - comment-path: each file preceded by `// relative/path.ts`
 *  - markdown-codeblock: each file wrapped in ```ts / ``` with path as comment
 */
export function formatFiles(
  files: ResolvedFile[],
  options: FormatterOptions
): FormattedResult {
  const parts: string[] = [];
  let lineCount = 0;

  for (const file of files) {
    const fileLines = file.content.split('\n').length;
    lineCount += fileLines;

    if (options.format === 'markdown-codeblock') {
      const lang = getLanguageTag(file.relativePath);
      parts.push(`\`\`\`${lang}\n// ${file.relativePath}\n${file.content.trimEnd()}\n\`\`\``);
    } else {
      // comment-path (default)
      parts.push(`// ${file.relativePath}\n${file.content.trimEnd()}`);
    }
  }

  const text = parts.join('\n\n');

  return {
    text,
    fileCount: files.length,
    lineCount,
  };
}

/**
 * Format a single function's source text along with its dependency files.
 *
 * The function text is shown first (from the root file), then deps follow.
 */
export function formatFunctionWithDeps(
  functionText: string,
  rootRelativePath: string,
  functionName: string | null,
  depFiles: ResolvedFile[],
  options: FormatterOptions
): FormattedResult {
  const header = functionName
    ? `// ${rootRelativePath} — function: ${functionName}`
    : `// ${rootRelativePath}`;

  const parts: string[] = [];
  let lineCount = functionText.split('\n').length;

  if (options.format === 'markdown-codeblock') {
    const lang = getLanguageTag(rootRelativePath);
    parts.push(`\`\`\`${lang}\n${header}\n${functionText.trimEnd()}\n\`\`\``);
  } else {
    parts.push(`${header}\n${functionText.trimEnd()}`);
  }

  for (const dep of depFiles) {
    const depLines = dep.content.split('\n').length;
    lineCount += depLines;

    if (options.format === 'markdown-codeblock') {
      const lang = getLanguageTag(dep.relativePath);
      parts.push(`\`\`\`${lang}\n// ${dep.relativePath}\n${dep.content.trimEnd()}\n\`\`\``);
    } else {
      parts.push(`// ${dep.relativePath}\n${dep.content.trimEnd()}`);
    }
  }

  return {
    text: parts.join('\n\n'),
    fileCount: 1 + depFiles.length,
    lineCount,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getLanguageTag(relativePath: string): string {
  const ext = relativePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    mts: 'typescript',
    cts: 'typescript',
    mjs: 'javascript',
    cjs: 'javascript',
  };
  return map[ext] ?? 'typescript';
}
