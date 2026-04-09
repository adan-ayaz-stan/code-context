MY QUERY:

So I'm thinking to make a VS Code extension and here's a rough draft of my idea:
A Visual Studio Code extension that allows developers to right click on a file and copy it in way that context for the file comes in.
There are levels to it.
* I can copy the file itself only.
* I can copy till a specified depth. Like if I'm copying file A and it uses functions of file B and file C as a utility so basically file A depends on file B and file C, hence it will copy file A but also copy file B and file C in the clipboard. It will be copied like there's the commented pathname before the content of each file and hence we copy the dependencies even, they will their file path written on top.
* Another kind of utility I'm thinking that I'm able to copy functions and their dependencies. Like in a 1000 line code, if I have a function of 90 lines which utilizes dependencies from other files, I'm able to scan what the function uses as imports and import content that is highly surgical if you catch what I mean.
So this is a VS Code extension which I want to develop, I think I can start with making it just for javascript/typescript.

Can you please my greatest advisor from marketing basis and technical basis that if developing this is a good contributing tool and if anything like that exists already and basically if I am to develop it, you know actually I do want to develop it so I am, so please guide me on how to work towards this project and make it possible. Please give professional guidance and draft a plan. Plan should include things like how to start the project as an industry standard project, development direction, testing setup and development guideline and framework guide.


AI RESPONSE:

Great research done. Here's the full picture and your complete professional roadmap.

---

## Market Reality Check

The existing tools in this space — Copy4AI, which copies file/folder contents with project tree structure, and code-to-clipboard, which copies directory structure and file contents for LLM context — are all **structurally dumb**. They copy by file or folder, completely blind to the import/dependency graph. Nobody has built what you're describing: a **dependency-aware, AST-driven, surgical context copier**. That's your moat.

Your Level 3 idea — copying a single function *and only the imports that function actually uses* — is genuinely novel and solves a real pain point developers face daily when prompting AI tools. This is worth building.

---

## The Extension, Named & Positioned

Suggested name: **ContextSnip** (or **DepCopy** / **ContextPack**). Your positioning:

> *"Copy code with its actual dependencies — not just files, but the exact context an AI needs to understand your code."*

---

## Technical Architecture

Before the plan, you need to understand what makes your extension hard and interesting: **you need a real dependency graph**, not just file text. That means:

- **For Level 1 & 2:** Parse `import`/`require` statements with a simple regex or light AST pass, resolve them to file paths on disk, then recursively walk to the specified depth.
- **For Level 3 (the hard one):** You need a true AST — parse the file, find the target function's node, find all identifiers it references, cross-reference those against import declarations, and only include the imports *that function actually uses*. This requires `@typescript-eslint/typescript-estree` or the TypeScript Compiler API (`ts.createProgram`).

---

## Full Development Plan

### Phase 0 — Project Scaffolding (Industry Standard)

Use the official Yeoman generator. This is how every serious VS Code extension starts.

```bash
npm install -g yo generator-code
yo code
```

Select: **New Extension (TypeScript)**, bundler: **esbuild** (faster than webpack for extensions), enable ESLint.

Your resulting structure should look like this:

```
context-snip/
├── src/
│   ├── extension.ts          # Entry point, registers commands
│   ├── commands/
│   │   ├── copyFile.ts       # Level 1
│   │   ├── copyWithDeps.ts   # Level 2
│   │   └── copyFunction.ts   # Level 3
│   ├── core/
│   │   ├── dependencyResolver.ts   # Import graph walker
│   │   ├── astParser.ts            # TS/JS AST logic
│   │   ├── formatter.ts            # Output formatting
│   │   └── pathResolver.ts         # Resolve import paths to disk
│   └── test/
│       ├── suite/
│       └── fixtures/         # Sample TS/JS files for tests
├── package.json              # Extension manifest
├── tsconfig.json
├── .eslintrc.json
├── .vscodeignore
└── CHANGELOG.md
```

---

### Phase 1 — Level 1: Simple File Copy

This is your "hello world" that validates the extension pipeline end-to-end.

**package.json contributions** (right-click menu registration):
```json
"contributes": {
  "commands": [
    { "command": "contextSnip.copyFile", "title": "ContextSnip: Copy File" },
    { "command": "contextSnip.copyWithDeps", "title": "ContextSnip: Copy with Dependencies" },
    { "command": "contextSnip.copyFunction", "title": "ContextSnip: Copy Function + Dependencies" }
  ],
  "menus": {
    "explorer/context": [
      {
        "when": "resourceExtname == .ts || resourceExtname == .js || resourceExtname == .tsx || resourceExtname == .jsx",
        "command": "contextSnip.copyFile",
        "group": "contextSnip@1"
      }
    ]
  }
}
```

Output format for all levels:
```
// src/utils/auth.ts
<file content here>

// src/helpers/token.ts
<file content here>
```

---

### Phase 2 — Level 2: Dependency Depth Walking

This is where your core value starts. The algorithm:

1. Read the file, extract all local import paths (ignore `node_modules`).
2. Resolve each import to an absolute path using Node's module resolution logic — use the `resolve` npm package.
3. Recurse to the user-specified depth (prompt them with a QuickPick input box).
4. Deduplicate (track visited paths in a `Set`).
5. Build the output string in topological order (dependencies first, then the root file).

Key library: `@typescript-eslint/typescript-estree` for parsing imports without invoking the full TS compiler. It's fast and handles both `.ts` and `.js`.

```typescript
import { parse } from '@typescript-eslint/typescript-estree';

function extractImports(fileContent: string): string[] {
  const ast = parse(fileContent, { jsx: true });
  return ast.body
    .filter(node => node.type === 'ImportDeclaration')
    .map(node => node.source.value as string)
    .filter(path => path.startsWith('.')); // local only
}
```

---

### Phase 3 — Level 3: Surgical Function + Dependency Copy

This is the hardest and most unique feature. The flow:

1. User right-clicks inside an open editor on a function (or selects its name).
2. You get the cursor position from `vscode.window.activeTextEditor.selection`.
3. Parse the file AST, find the function node that contains/matches that position.
4. Walk the function's AST subtree, collect all `Identifier` nodes.
5. Cross-reference those identifiers against the file's `ImportDeclaration` nodes.
6. Only include the imports that are *actually referenced inside that function*.
7. For each included import, recursively resolve its file and include it.

For step 3-5, use the **TypeScript Language Server** via `vscode.executeDefinitionProvider` — VS Code already has this running. This gives you go-to-definition quality accuracy without you building a type resolver from scratch.

---

### Phase 4 — Testing Setup

Use the **VS Code Extension Test Runner** (Mocha-based, official):

```bash
npm install --save-dev @vscode/test-cli @vscode/test-electron
```

Create fixture files in `src/test/fixtures/` that represent real dependency chains:

```
fixtures/
├── simple/
│   ├── main.ts       # imports from utils.ts
│   └── utils.ts
├── nested/
│   ├── a.ts          # imports b.ts
│   ├── b.ts          # imports c.ts
│   └── c.ts
└── function-level/
    ├── large-file.ts  # 500 line file with multiple functions
    └── dep.ts
```

Write tests that assert: given file X, the dependency resolver returns files [Y, Z] in the correct order with correct path headers.

---

### Phase 5 — Configuration & UX Polish

Add VS Code settings the user can configure:

```json
"contextSnip.defaultDepth": 2,
"contextSnip.includeNodeModulesTypes": false,
"contextSnip.outputFormat": "comment-path | markdown-codeblock",
"contextSnip.excludePatterns": ["**/*.test.ts", "**/*.spec.ts"]
```

Add a **status bar item** that shows "Copied 3 files (847 lines)" after each copy, so users get feedback.

---

### Development Guidelines & Guardrails

**Do this from day one:**
- Write everything in TypeScript — no exceptions.
- Use `esbuild` as your bundler (compile times are 10x faster than webpack for extensions).
- Use `changesets` for versioning (`npm install -D @changesets/cli`) — this makes publishing to the VS Code Marketplace and keeping a changelog clean.
- Set up a GitHub Actions workflow immediately that runs tests on every PR.
- Never ship the `src/` folder — only `dist/`. Use `.vscodeignore` to control this.

**Extension-specific pitfalls to avoid:**
- Extensions run in a sandboxed Node process — you cannot use browser APIs.
- The extension host has a startup time budget. Keep your `activate()` function fast — defer heavy work (like AST parsing) to when commands are actually invoked, not on activation.
- When resolving import paths, handle `tsconfig.json` path aliases (`@/utils` → `src/utils`). Use the `tsconfig-paths` package for this.
- Depth-first dependency walking can hit circular imports. Track visited files in a `Set<string>` and skip already-visited paths.

---

### Publishing Checklist

1. Create a publisher on the [VS Code Marketplace](https://marketplace.visualstudio.com/manage).
2. Add a proper `README.md` with GIF demos — this is the #1 factor in installs.
3. Use `vsce package` then `vsce publish` via the `@vscode/vsce` CLI.
4. Set up `ovsx publish` in parallel to also publish to the **Open VSX Registry** (used by Cursor, VSCodium, and other forks — huge audience for AI-tool users specifically).

---

## Recommended Build Order

| Week | Goal |
|---|---|
| 1 | Scaffold project, Level 1 working end-to-end, CI setup |
| 2 | Level 2 dependency walker, depth prompt, path resolution |
| 3 | tsconfig path alias support, deduplication, test fixtures |
| 4 | Level 3 AST function parser, function-scope import filtering |
| 5 | Settings, output formats, status bar feedback |
| 6 | Polish, GIF demos, publish to Marketplace + Open VSX |

---

The gap you've identified is real. What exists is blunt — copy a folder. What you're building is precise — copy exactly what an AI needs to understand *this* piece of code. That's the pitch, and it's a good one. Start with Level 2 as your MVP differentiator since Level 1 already exists elsewhere, and Level 3 will make you famous in the dev tooling community.

MY ACTIONS:
- I have already run the yo code command and set up the project. You can inspect the file structure to know that.