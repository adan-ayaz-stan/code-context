import * as fs from 'fs';
import * as path from 'path';

export interface TsConfigPaths {
  [alias: string]: string[];
}

/**
 * Reads and parses tsconfig.json from the workspace root, returning its
 * `compilerOptions.paths` and `compilerOptions.baseUrl` if present.
 */
export function loadTsConfigPaths(workspaceRoot: string): {
  paths: TsConfigPaths;
  baseUrl: string;
} {
  const result: { paths: TsConfigPaths; baseUrl: string } = {
    paths: {},
    baseUrl: workspaceRoot,
  };

  const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    return result;
  }

  try {
    const raw = fs.readFileSync(tsconfigPath, 'utf-8');
    // Strip comments (tsconfig.json allows them)
    const stripped = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const parsed = JSON.parse(stripped);
    const opts = parsed?.compilerOptions ?? {};

    if (opts.baseUrl) {
      result.baseUrl = path.resolve(workspaceRoot, opts.baseUrl);
    }
    if (opts.paths) {
      result.paths = opts.paths as TsConfigPaths;
    }
  } catch {
    // If tsconfig can't be parsed, silently fall back to no aliases
  }

  return result;
}

/** Extensions to probe in order when resolving an import without an extension. */
const PROBE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'];

/**
 * Given an import specifier (e.g. './utils', '../helpers/auth', '@/lib/utils')
 * and the file that contains it, resolve it to an absolute path on disk.
 *
 * Returns `null` for:
 *  - node_modules imports (no leading './' or '/')
 *  - specifiers that can't be resolved
 */
export function resolveImport(
  specifier: string,
  fromFile: string,
  workspaceRoot: string,
  tsConfigPaths: TsConfigPaths,
  baseUrl: string,
  followTsConfigPaths: boolean
): string | null {
  // Skip node_modules / builtins — they don't start with . or /
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    if (followTsConfigPaths) {
      // Try path alias resolution
      const aliased = resolveAlias(specifier, tsConfigPaths, baseUrl);
      if (aliased) {
        return probeFile(aliased);
      }
    }
    return null;
  }

  const fromDir = path.dirname(fromFile);
  const candidate = path.resolve(fromDir, specifier);
  return probeFile(candidate);
}

/**
 * Probe for a file by trying the path as-is first, then with each extension,
 * then as an index file inside a directory.
 */
function probeFile(candidate: string): string | null {
  // Exact match (already has extension)
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  // Try appending extensions
  for (const ext of PROBE_EXTENSIONS) {
    const withExt = candidate + ext;
    if (fs.existsSync(withExt)) {
      return withExt;
    }
  }

  // Try as a directory with index file
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    for (const ext of PROBE_EXTENSIONS) {
      const index = path.join(candidate, `index${ext}`);
      if (fs.existsSync(index)) {
        return index;
      }
    }
  }

  return null;
}

/**
 * Resolve a path alias against tsconfig paths.
 * e.g. '@/utils/auth' with paths: { '@/*': ['src/*'] } → '<baseUrl>/src/utils/auth'
 */
function resolveAlias(
  specifier: string,
  paths: TsConfigPaths,
  baseUrl: string
): string | null {
  for (const [pattern, targets] of Object.entries(paths)) {
    const regex = patternToRegex(pattern);
    const match = specifier.match(regex);
    if (!match) {
      continue;
    }
    const wildcard = match[1] ?? '';
    for (const target of targets) {
      const resolved = path.resolve(baseUrl, target.replace('*', wildcard));
      const probed = probeFile(resolved);
      if (probed) {
        return probed;
      }
    }
  }
  return null;
}

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '(.*)');
  return new RegExp(`^${escaped}$`);
}

/**
 * Get the workspace root by walking up from a file until we find package.json or tsconfig.json.
 * Falls back to the file's directory if neither is found.
 */
export function findWorkspaceRoot(fromFile: string): string {
  let dir = path.dirname(fromFile);
  const root = path.parse(dir).root;

  while (dir !== root) {
    if (
      fs.existsSync(path.join(dir, 'package.json')) ||
      fs.existsSync(path.join(dir, 'tsconfig.json'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  return path.dirname(fromFile);
}
