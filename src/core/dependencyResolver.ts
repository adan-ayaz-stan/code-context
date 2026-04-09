import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
import { extractImports } from './astParser';
import {
  resolveImport,
  loadTsConfigPaths,
  findWorkspaceRoot,
  type TsConfigPaths,
} from './pathResolver';

export interface ResolvedFile {
  /** Absolute path on disk */
  absolutePath: string;
  /** Path relative to workspace root, used in headers (e.g. src/utils/auth.ts) */
  relativePath: string;
  /** File content */
  content: string;
}

export interface ResolveDepsOptions {
  maxDepth: number;
  excludePatterns: string[];
  followTsConfigPaths: boolean;
  workspaceRoot?: string;
}

/**
 * Starting from `rootPath`, perform a BFS walk of local import dependencies
 * up to `maxDepth` levels deep.
 *
 * Returns files in dependency-first order (deepest deps first, root last),
 * with no duplicates.
 */
export async function resolveDependencies(
  rootPath: string,
  options: ResolveDepsOptions
): Promise<ResolvedFile[]> {
  const { maxDepth, excludePatterns, followTsConfigPaths } = options;
  const workspaceRoot = options.workspaceRoot ?? findWorkspaceRoot(rootPath);

  const { paths: tsConfigPaths, baseUrl } = loadTsConfigPaths(workspaceRoot);

  // BFS queue: [absolutePath, currentDepth]
  const queue: Array<[string, number]> = [[rootPath, 0]];
  const visited = new Set<string>();
  // dependency-first → collect in reverse then flip
  const ordered: ResolvedFile[] = [];

  while (queue.length > 0) {
    const [currentPath, depth] = queue.shift()!;

    if (visited.has(currentPath)) {
      continue;
    }
    visited.add(currentPath);

    if (isExcluded(currentPath, excludePatterns, workspaceRoot)) {
      continue;
    }

    let content: string;
    try {
      content = fs.readFileSync(currentPath, 'utf-8');
    } catch {
      continue; // file can't be read — skip silently
    }

    const relativePath = path
      .relative(workspaceRoot, currentPath)
      .replace(/\\/g, '/');

    ordered.push({ absolutePath: currentPath, relativePath, content });

    if (depth < maxDepth) {
      const imports = extractImports(content, currentPath);
      for (const imp of imports) {
        const resolved = resolveImport(
          imp.specifier,
          currentPath,
          workspaceRoot,
          tsConfigPaths as TsConfigPaths,
          baseUrl,
          followTsConfigPaths
        );
        if (resolved && !visited.has(resolved)) {
          queue.push([resolved, depth + 1]);
        }
      }
    }
  }

  // Reverse so dependencies come before the files that import them
  return ordered.reverse();
}

/**
 * Resolve a specific list of import specifiers from a single file.
 * Used by Level 3 to resolve only the imports a function actually uses.
 */
export async function resolveSpecificImports(
  specifiers: string[],
  fromFile: string,
  options: Omit<ResolveDepsOptions, 'maxDepth'>
): Promise<ResolvedFile[]> {
  const { excludePatterns, followTsConfigPaths } = options;
  const workspaceRoot = options.workspaceRoot ?? findWorkspaceRoot(fromFile);
  const { paths: tsConfigPaths, baseUrl } = loadTsConfigPaths(workspaceRoot);

  const results: ResolvedFile[] = [];
  const visited = new Set<string>();

  for (const specifier of specifiers) {
    const resolved = resolveImport(
      specifier,
      fromFile,
      workspaceRoot,
      tsConfigPaths as TsConfigPaths,
      baseUrl,
      followTsConfigPaths
    );

    if (!resolved || visited.has(resolved)) {
      continue;
    }
    if (isExcluded(resolved, excludePatterns, workspaceRoot)) {
      continue;
    }

    visited.add(resolved);

    let content: string;
    try {
      content = fs.readFileSync(resolved, 'utf-8');
    } catch {
      continue;
    }

    const relativePath = path
      .relative(workspaceRoot, resolved)
      .replace(/\\/g, '/');

    results.push({ absolutePath: resolved, relativePath, content });
  }

  return results;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isExcluded(
  absolutePath: string,
  patterns: string[],
  workspaceRoot: string
): boolean {
  const relative = path.relative(workspaceRoot, absolutePath).replace(/\\/g, '/');
  return patterns.some((pattern) => minimatch(relative, pattern));
}
