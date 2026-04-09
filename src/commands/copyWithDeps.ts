import * as vscode from 'vscode';
import { resolveDependencies } from '../core/dependencyResolver';
import { formatFiles, type OutputFormat } from '../core/formatter';
import { findWorkspaceRoot } from '../core/pathResolver';
import { resolveFilePath } from './copyFile';
import type { StatusBarFeedback } from '../extension';

/**
 * Level 2 — Copy a file and all its local dependencies up to a configurable depth.
 * Prompts the user for depth (pre-filled with the configured default).
 */
export async function copyWithDeps(
  uri: vscode.Uri | undefined,
  statusBar: StatusBarFeedback
): Promise<void> {
  const filePath = resolveFilePath(uri);
  if (!filePath) {
    vscode.window.showErrorMessage('Code Context: No file selected.');
    return;
  }

  const config = vscode.workspace.getConfiguration('codeContext');
  const defaultDepth = config.get<number>('defaultDepth', 2);
  const excludePatterns = config.get<string[]>('excludePatterns', []);
  const followTsConfigPaths = config.get<boolean>('followTsConfigPaths', true);
  const format = config.get<OutputFormat>('outputFormat', 'comment-path');

  // Prompt for depth
  const depthInput = await vscode.window.showInputBox({
    title: 'Code Context: Dependency Depth',
    prompt: 'How many levels of imports should be followed? (1 = direct imports only)',
    value: String(defaultDepth),
    validateInput(value) {
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 1 || n > 10) {
        return 'Please enter a number between 1 and 10';
      }
      return null;
    },
  });

  if (depthInput === undefined) {
    // User cancelled
    return;
  }

  const maxDepth = parseInt(depthInput, 10);
  const workspaceRoot = findWorkspaceRoot(filePath);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Code Context: Resolving dependencies…',
      cancellable: false,
    },
    async () => {
      const files = await resolveDependencies(filePath, {
        maxDepth,
        excludePatterns,
        followTsConfigPaths,
        workspaceRoot,
      });

      const result = formatFiles(files, { format });
      await vscode.env.clipboard.writeText(result.text);
      statusBar.show(result.fileCount, result.lineCount);
    }
  );
}
