<div align="center">

<br/>

<img src="assets/images/logo_512x512.png" alt="Code Context Logo (512x512)" width="96" height="96" />

<br/>
<br/>

# Code Context

**Copy code with its actual dependencies.**  
**Surgical AI context. Zero clipboard bloat.**

<br/>

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/code-context.code-context?style=flat-square&label=Marketplace&color=0066b8&logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=AdanAyaz.cc4ai)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/code-context.code-context?style=flat-square&color=0066b8&logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=AdanAyaz.cc4ai)
[![Tests](https://img.shields.io/badge/tests-33%20passing-22c55e?style=flat-square&logo=checkmarx&logoColor=white)](https://github.com/adan-ayaz-stan/code-context)
[![TypeScript](https://img.shields.io/badge/TypeScript%20%2F%20JS-supported-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://github.com/adan-ayaz-stan/code-context)
[![License: MIT](https://img.shields.io/badge/license-MIT-f59e0b?style=flat-square)](LICENSE)

<br/>

[**Install Now**](https://marketplace.visualstudio.com/items?itemName=code-context.code-context) · [**Report a Bug**](https://github.com/adan-ayaz-stan/code-context/issues) · [**Request a Feature**](https://github.com/adan-ayaz-stan/code-context/issues)

<br/>
<br/>

---

</div>

## The Problem

When you paste code into an AI chat, the AI only sees what you copied.

Your function imports from three files. The AI sees none of them. It guesses. You get a hallucinated answer.

The obvious fix — copying the whole folder — just trades one problem for another. Test files, unrelated utilities, 2,000 lines of noise for a 40-line question.

**Code Context reads your actual import graph and copies exactly what's needed. Nothing more.**

<br/>

---

## Three Levels of Precision

Right-click any file. One menu. Three modes.

<br/>

### `Level 1` &nbsp; Copy File

The foundation. Copies a single file with its workspace-relative path as a clean header — formatted and ready to paste.

```
$(copy) Copied 1 file (47 lines)
```

<br/>

### `Level 2` &nbsp; Copy with Dependencies

Walks your import graph up to a configurable depth. Copies the root file **plus every local dependency it imports** — deduplicated, ordered dependencies-first, exactly how an LLM needs to read them.

```
$(copy) Copied 3 files (211 lines)
```

<br/>

### `Level 3` &nbsp; Copy Function + Dependencies &nbsp; ✦

> The one that changes how you work.

Place your cursor inside any function. Right-click. That's it.

Code Context parses the AST, finds your function, traces every identifier it references, and copies **only that function** with **only the imports it actually uses**. A 1,000-line file with 15 imports? You get the function and the 2 files it needs. The other 13 are ignored.

```
$(copy) Copied function `area` + 1 dependency (23 lines)
```

<br/>

---

## See It in Action

### Level 2 · Copy with Dependencies

You have this structure:

```
src/
├── main.ts          ← right-click here
├── utils.ts
└── date-helper.ts
```

**`src/main.ts`**

```typescript
import { greet } from "./utils";
import { formatDate } from "./date-helper";

export function main() {
  const message = greet("World");
  const today = formatDate(new Date());
  console.log(`${message} — today is ${today}`);
}
```

After **Copy with Dependencies (depth 1)**, your clipboard:

```typescript
// src/date-helper.ts
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// src/utils.ts
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

// src/main.ts
import { greet } from "./utils";
import { formatDate } from "./date-helper";

export function main() {
  const message = greet("World");
  const today = formatDate(new Date());
  console.log(`${message} — today is ${today}`);
}
```

Dependencies appear **before** the files that import them. Exactly the reading order an LLM needs.

<br/>

---

### Level 3 · Copy Function + Dependencies

A 500-line service file. Many imports. You only care about `area()`.

```typescript
// src/services/geometry.ts

import { multiply, square } from "./math/operations";
import { fetchConfig } from "./config/loader";
import { Logger } from "./utils/logger";
import * as fs from "fs";

export function area(width: number, height: number): number {
  return multiply(width, height); // ← cursor is here
}

export function squareArea(side: number): number {
  return square(side);
}

export function readConfig(path: string) {
  Logger.info("loading");
  return fetchConfig(path);
}

// ... 400 more lines
```

**Copy Function + Dependencies** gives you:

```typescript
// Dependency: src/math/operations.ts
export function multiply(a: number, b: number): number {
  return a * b;
}

export function square(n: number): number {
  return multiply(n, n);
}

// Function: area  (src/services/geometry.ts)
export function area(width: number, height: number): number {
  return multiply(width, height);
}
```

`fetchConfig`, `Logger`, and `fs` are **not included.** The AST confirmed `area` never touches them.

<br/>

---

## How It Compares

|                                  | Folder copy tools | **Code Context** |
| -------------------------------- | :---------------: | :--------------: |
| Copies file content              |        ✅         |        ✅        |
| Skips unrelated files            |        ❌         |        ✅        |
| Follows the actual import graph  |        ❌         |        ✅        |
| Dependency-first ordering        |        ❌         |        ✅        |
| Function-level granularity       |        ❌         |        ✅        |
| Respects `tsconfig` path aliases |        ❌         |        ✅        |
| Excludes test files by default   |        ❌         |        ✅        |

<br/>

---

## Installation

**From the Marketplace:**

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P`
3. Paste: `ext install code-context.code-context`
4. Hit Enter

**Or** open the Extensions panel (`Ctrl+Shift+X`) and search **`Code Context`**.

<br/>

---

## Usage

All commands appear in both the **Explorer context menu** and the **Editor context menu.** Right-click any `.ts`, `.tsx`, `.js`, or `.jsx` file.

| Command                                        | Where                           | What happens                                 |
| ---------------------------------------------- | ------------------------------- | -------------------------------------------- |
| **Code Context: Copy File**                    | Explorer · Editor               | Copies the file with a path header           |
| **Code Context: Copy with Dependencies**       | Explorer · Editor               | Prompts for depth, walks the import graph    |
| **Code Context: Copy Function + Dependencies** | Editor (cursor inside function) | Copies just that function + its used imports |

<br/>

### Depth Prompt (Level 2)

A quick-input appears pre-filled with your configured default:

```
How many levels of imports should be followed? (1 = direct imports only)
> 2
```

| Depth | What you get                        |
| ----- | ----------------------------------- |
| `1`   | Root file + its direct imports      |
| `2`   | Root + imports + imports-of-imports |
| `N`   | Full transitive graph up to N hops  |

Circular imports are handled safely — each file is visited at most once.

<br/>

### Status Bar Feedback

Every copy shows a brief summary in the status bar, then fades after 5 seconds:

```
$(copy) Copied 3 files (247 lines)
```

<br/>

---

## Configuration

All settings live under the `codeContext` namespace. Search **`Code Context`** in Settings (`Ctrl+,`) or edit `settings.json` directly.

| Setting                           | Type                                      | Default           | Description                            |
| --------------------------------- | ----------------------------------------- | ----------------- | -------------------------------------- |
| `codeContext.defaultDepth`        | `number` (1–10)                           | `2`               | Depth pre-filled in the Level 2 prompt |
| `codeContext.outputFormat`        | `"comment-path"` · `"markdown-codeblock"` | `"comment-path"`  | How each file is wrapped in the output |
| `codeContext.excludePatterns`     | `string[]`                                | test & spec files | Glob patterns for files to skip        |
| `codeContext.followTsConfigPaths` | `boolean`                                 | `true`            | Resolve `tsconfig.json` path aliases   |

**Example `settings.json`:**

```json
{
  "codeContext.defaultDepth": 3,
  "codeContext.outputFormat": "markdown-codeblock",
  "codeContext.excludePatterns": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/mocks/**"
  ],
  "codeContext.followTsConfigPaths": true
}
```

<br/>

### Output Formats

**`comment-path`** (default) — clean, works in any AI chat:

```typescript
// src/utils/auth.ts
export async function verifyToken(token: string): Promise<Payload> {
  // ...
}
```

**`markdown-codeblock`** — renders beautifully in Markdown-aware tools:

````
```typescript
// src/utils/auth.ts
export async function verifyToken(token: string): Promise<Payload> {
  // ...
}
```
````

<br/>

---

## Supported Languages

| Extension       | Language                      |
| --------------- | ----------------------------- |
| `.ts` · `.tsx`  | TypeScript · TypeScript + JSX |
| `.js` · `.jsx`  | JavaScript · JavaScript + JSX |
| `.mts` · `.cts` | TypeScript ESM · CommonJS     |
| `.mjs` · `.cjs` | JavaScript ESM · CommonJS     |

> **`tsconfig` path aliases** (`@/`, `~`, custom prefixes) are fully resolved when `codeContext.followTsConfigPaths` is enabled and a `tsconfig.json` exists in the workspace root.

<br/>

---

## How It Works

<details>
<summary><strong>Import Graph Walking (Level 2)</strong></summary>
<br/>

1. Parses the file's AST using [`@typescript-eslint/typescript-estree`](https://typescript-eslint.io/packages/typescript-estree/) — handles TS and JS without invoking the full TypeScript compiler.
2. Extracts all `ImportDeclaration` nodes and resolves specifiers to absolute paths on disk.
3. Skips `node_modules` and anything matching your `excludePatterns`.
4. Performs a **BFS walk** up to `maxDepth`, tracking visited files in a `Set` to handle circular imports safely.
5. Reverses the collection so dependencies appear before the files that consume them.

</details>

<details>
<summary><strong>Surgical Function Copy (Level 3)</strong></summary>
<br/>

1. Parses the full file AST.
2. Finds the **innermost function node** (declaration, expression, or arrow function) containing the cursor position.
3. Traverses that function's AST subtree, collecting every `Identifier` it references.
4. Cross-references those identifiers against the file's import declarations — only imports whose exported names appear inside the function are kept.
5. Resolves those import paths to disk and reads each dependency file.

</details>

<details>
<summary><strong>Path Resolution</strong></summary>
<br/>

`resolveImport` probes each candidate in order:

1. Exact match (specifier already has an extension)
2. With each extension: `.ts` → `.tsx` → `.js` → `.jsx` → `.mts` → `.cts` → `.mjs` → `.cjs`
3. As a directory index file (`index.ts`, `index.js`, etc.)
4. Via `tsconfig.json` path aliases (when `followTsConfigPaths` is enabled)

</details>

<br/>

---

## Project Structure

```
code-context/
├── src/
│   ├── extension.ts              # Entry point — registers commands & status bar
│   ├── commands/
│   │   ├── copyFile.ts           # Level 1 — single file copy
│   │   ├── copyWithDeps.ts       # Level 2 — dependency graph copy
│   │   └── copyFunction.ts       # Level 3 — function + surgical imports
│   ├── core/
│   │   ├── astParser.ts          # AST parsing: imports, function nodes, identifiers
│   │   ├── dependencyResolver.ts # BFS graph walker + import resolver
│   │   ├── pathResolver.ts       # Import specifier → absolute path on disk
│   │   └── formatter.ts          # Output formatting
│   └── test/
│       ├── fixtures/
│       │   ├── simple/           # main.ts → utils.ts, date-helper.ts
│       │   ├── nested/           # a.ts → b.ts → c.ts
│       │   ├── circular/         # x.ts ↔ y.ts (circular guard)
│       │   └── function-level/   # multi-function with selective imports
│       └── unit/
│           ├── pathResolver.test.ts
│           ├── dependencyResolver.test.ts
│           ├── astParser.test.ts
│           └── formatter.test.ts
├── esbuild.js
├── tsconfig.json
└── package.json
```

<br/>

---

## Development

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`
- VS Code 1.114.0+

### Setup

```bash
git clone https://github.com/adan-ayaz-stan/code-context
cd code-context
pnpm install
```

### Run in Development

Press **`F5`** in VS Code to launch an Extension Development Host with the extension loaded.

Or start the watch build manually:

```bash
pnpm run watch
```

### Run Tests

```bash
pnpm test
```

The test suite runs inside a real VS Code instance via [`@vscode/test-electron`](https://github.com/microsoft/vscode-test). All 33 tests must pass before a PR is merged.

```
  pathResolver
    ✔ resolves a relative .ts import without extension
    ✔ resolves a relative .ts import with a sibling
    ✔ resolves a deeper relative path
    ✔ returns null for node_modules imports
    ✔ returns null for non-existent files
    ✔ findWorkspaceRoot walks up to find package.json
    ✔ loadTsConfigPaths returns empty paths gracefully

  formatter — formatFiles
    ✔ comment-path format: single file
    ✔ comment-path format: multiple files separated by blank line
    ✔ markdown-codeblock format: wraps in triple backticks
    ...

  dependencyResolver
    ✔ depth 0 — returns only the root file
    ✔ depth 1 — returns root + direct imports (simple)
    ✔ depth 2 — walks nested chain a → b → c
    ✔ depth 1 — stops at depth limit
    ✔ handles circular imports without infinite loop
    ✔ returns files in dependency-first order

  33 passing
```

### Build for Production

```bash
pnpm run package
```

Produces `dist/extension.js` via esbuild — minified, tree-shaken, fast.

### Lint

```bash
pnpm run lint
```

<br/>

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss direction.

1. Fork the repo
2. Create your branch: `git checkout -b feat/my-feature`
3. Make your changes with test coverage
4. Run `pnpm test` — all 33 tests must pass
5. Open a PR with a clear description of the change

<br/>

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.

<br/>

---

<div align="center">

Built for the AI-assisted development workflow.

**Copy less. Context more.**

<br/>

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/code-context.code-context?style=flat-square&label=Install%20on%20Marketplace&color=0066b8&logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=code-context.code-context)

</div>
