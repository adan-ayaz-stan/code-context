import * as vscode from 'vscode';
import { copyFile } from './commands/copyFile';
import { copyWithDeps } from './commands/copyWithDeps';
import { copyFunction } from './commands/copyFunction';

/** Interface passed to every command so they can update the status bar. */
export interface StatusBarFeedback {
  show(fileCount: number, lineCount: number): void;
}

export function activate(context: vscode.ExtensionContext) {
  // ─── Status Bar ─────────────────────────────────────────────────────────
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.tooltip = 'Code Context — last copy summary';
  context.subscriptions.push(statusBarItem);

  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const statusBar: StatusBarFeedback = {
    show(fileCount: number, lineCount: number) {
      const filesLabel = fileCount === 1 ? '1 file' : `${fileCount} files`;
      const linesLabel = lineCount === 1 ? '1 line' : `${lineCount} lines`;
      statusBarItem.text = `$(copy) Copied ${filesLabel} (${linesLabel})`;
      statusBarItem.show();

      // Auto-hide after 5 seconds
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      hideTimer = setTimeout(() => statusBarItem.hide(), 5000);
    },
  };

  // ─── Commands ───────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codeContext.copyFile',
      (uri?: vscode.Uri) => copyFile(uri, statusBar)
    ),

    vscode.commands.registerCommand(
      'codeContext.copyWithDeps',
      (uri?: vscode.Uri) => copyWithDeps(uri, statusBar)
    ),

    vscode.commands.registerCommand(
      'codeContext.copyFunction',
      () => copyFunction(statusBar)
    )
  );
}

export function deactivate() {}
