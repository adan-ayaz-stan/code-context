import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { extractImports, extractFunctionAtPosition, getFunctionImports } from '../core/astParser';
import { resolveSpecificImports } from '../core/dependencyResolver';
import { formatFunctionWithDeps, type OutputFormat } from '../core/formatter';
import { findWorkspaceRoot } from '../core/pathResolver';
import type { StatusBarFeedback } from '../extension';

/**
 * Level 3 — Copy the function at the cursor position + only the imports
 * that function actually uses, recursively resolved.
 *
 * Must be triggered from within an open editor (not explorer).
 */
export async function copyFunction(statusBar: StatusBarFeedback): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('Code Context: Open a file in the editor first.');
    return;
  }

  const document = editor.document;
  const filePath = document.uri.fsPath;
  const ext = path.extname(filePath).toLowerCase();
  const supported = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'];

  if (!supported.includes(ext)) {
    vscode.window.showErrorMessage(
      'Code Context: "Copy Function" only supports TypeScript/JavaScript files.'
    );
    return;
  }

  const position = editor.selection.active;
  const fileContent = document.getText();

  // Find the function enclosing the cursor
  const funcNode = extractFunctionAtPosition(
    fileContent,
    filePath,
    position.line,   // 0-indexed
    position.character
  );

  if (!funcNode) {
    vscode.window.showWarningMessage(
      'Code Context: No function found at cursor position. Place your cursor inside a function body.'
    );
    return;
  }

  const config = vscode.workspace.getConfiguration('codeContext');
  const excludePatterns = config.get<string[]>('excludePatterns', []);
  const followTsConfigPaths = config.get<boolean>('followTsConfigPaths', true);
  const format = config.get<OutputFormat>('outputFormat', 'comment-path');

  const workspaceRoot = findWorkspaceRoot(filePath);
  const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');

  // Get only the imports this function uses
  const allImports = extractImports(fileContent, filePath);
  const usedImports = getFunctionImports(funcNode, allImports);
  const usedSpecifiers = usedImports.map((i) => i.specifier);

  // Extract the function source text
  const functionText = fileContent.slice(funcNode.start, funcNode.end);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Code Context: Resolving function dependencies…',
      cancellable: false,
    },
    async () => {
      const depFiles = await resolveSpecificImports(usedSpecifiers, filePath, {
        excludePatterns,
        followTsConfigPaths,
        workspaceRoot,
      });

      const result = formatFunctionWithDeps(
        functionText,
        relativePath,
        funcNode.name,
        depFiles,
        { format }
      );

      await vscode.env.clipboard.writeText(result.text);
      statusBar.show(result.fileCount, result.lineCount);
    }
  );
}
