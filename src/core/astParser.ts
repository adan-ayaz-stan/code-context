import { parse, simpleTraverse } from '@typescript-eslint/typescript-estree';
import type {
  TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/typescript-estree';

export interface ImportInfo {
  /** The raw specifier string, e.g. './utils' */
  specifier: string;
  /** All names imported: default import name, named imports, namespace alias */
  importedNames: string[];
  /** Source line range of the import statement */
  range: { start: number; end: number };
}

export interface FunctionNode {
  /** The AST node for the function */
  node: TSESTree.Node;
  /** All identifier names referenced inside the function body */
  referencedIdentifiers: Set<string>;
  /** Start/end character offsets in the source */
  start: number;
  end: number;
  /** Human-readable name (if available) */
  name: string | null;
}

/**
 * Parse a file's source and extract all local-looking import declarations.
 */
export function extractImports(fileContent: string, filePath: string): ImportInfo[] {
  let ast: TSESTree.Program;
  try {
    ast = parse(fileContent, {
      jsx: true,
      loc: true,
      range: true,
      tolerant: true,
      filePath,
    });
  } catch {
    return [];
  }

  const imports: ImportInfo[] = [];

  for (const node of ast.body) {
    if (node.type !== ('ImportDeclaration' as AST_NODE_TYPES.ImportDeclaration)) {
      continue;
    }
    const importNode = node as TSESTree.ImportDeclaration;
    const specifier = importNode.source.value as string;

    const importedNames: string[] = [];
    for (const spec of importNode.specifiers) {
      if (spec.type === ('ImportDefaultSpecifier' as AST_NODE_TYPES.ImportDefaultSpecifier)) {
        importedNames.push(spec.local.name);
      } else if (spec.type === ('ImportNamespaceSpecifier' as AST_NODE_TYPES.ImportNamespaceSpecifier)) {
        importedNames.push(spec.local.name);
      } else if (spec.type === ('ImportSpecifier' as AST_NODE_TYPES.ImportSpecifier)) {
        importedNames.push(spec.local.name);
      }
    }

    imports.push({
      specifier,
      importedNames,
      range: {
        start: importNode.loc!.start.line,
        end: importNode.loc!.end.line,
      },
    });
  }

  return imports;
}

/**
 * Find the innermost function node (declaration, expression, or arrow) that
 * contains the given 0-indexed cursor position (line, column).
 */
export function extractFunctionAtPosition(
  fileContent: string,
  filePath: string,
  line: number,
  column: number
): FunctionNode | null {
  let ast: TSESTree.Program;
  try {
    ast = parse(fileContent, {
      jsx: true,
      loc: true,
      range: true,
      tolerant: true,
      filePath,
    });
  } catch {
    return null;
  }

  const FUNCTION_TYPES = new Set([
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
  ]);

  let bestMatch: TSESTree.Node | null = null;
  let bestSize = Infinity;

  simpleTraverse(ast, {
    enter(node) {
      if (!FUNCTION_TYPES.has(node.type)) {
        return;
      }
      const loc = node.loc!;
      const insideStart =
        line > loc.start.line - 1 ||
        (line === loc.start.line - 1 && column >= loc.start.column);
      const insideEnd =
        line < loc.end.line - 1 ||
        (line === loc.end.line - 1 && column <= loc.end.column);

      if (insideStart && insideEnd) {
        const size = node.range![1] - node.range![0];
        if (size < bestSize) {
          bestSize = size;
          bestMatch = node;
        }
      }
    },
  });

  if (!bestMatch) {
    return null;
  }

  const funcNode = bestMatch as TSESTree.Node;
  const referencedIdentifiers = collectIdentifiers(funcNode);
  const name = getFunctionName(funcNode);

  return {
    node: funcNode,
    referencedIdentifiers,
    start: funcNode.range![0],
    end: funcNode.range![1],
    name,
  };
}

/**
 * Given a function node and the file's full import list, return only the
 * imports whose imported names are actually referenced inside the function.
 */
export function getFunctionImports(
  funcNode: FunctionNode,
  allImports: ImportInfo[]
): ImportInfo[] {
  return allImports.filter((imp) =>
    imp.importedNames.some((name) => funcNode.referencedIdentifiers.has(name))
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function collectIdentifiers(node: TSESTree.Node): Set<string> {
  const names = new Set<string>();
  simpleTraverse(node, {
    enter(n) {
      if (n.type === ('Identifier' as AST_NODE_TYPES.Identifier)) {
        names.add((n as TSESTree.Identifier).name);
      }
    },
  });
  return names;
}

function getFunctionName(node: TSESTree.Node): string | null {
  if (node.type === ('FunctionDeclaration' as AST_NODE_TYPES.FunctionDeclaration)) {
    return (node as TSESTree.FunctionDeclaration).id?.name ?? null;
  }
  // FunctionExpression / ArrowFunctionExpression — check if assigned to a variable
  const parent = (node as { parent?: TSESTree.Node }).parent;
  if (parent?.type === ('VariableDeclarator' as AST_NODE_TYPES.VariableDeclarator)) {
    const decl = parent as TSESTree.VariableDeclarator;
    if (decl.id.type === ('Identifier' as AST_NODE_TYPES.Identifier)) {
      return (decl.id as TSESTree.Identifier).name;
    }
  }
  return null;
}
