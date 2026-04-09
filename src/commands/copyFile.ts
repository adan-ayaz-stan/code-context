import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { formatFiles, type OutputFormat } from '../core/formatter';
import { findWorkspaceRoot } from '../core/pathResolver';
import type { StatusBarFeedback } from '../extension';

/**
 * Level 1 — Copy a single file to clipboard with a path header.
 * Works from the Explorer context menu (file URI passed as arg)
 * or from the active editor if no arg is provided.
 */
export async function copyFile(
  uri: vscode.Uri | undefined,
  statusBar: StatusBarFeedback
): Promise<void> {
  const filePath = resolveFilePath(uri);
  if (!filePath) {
    vscode.window.showErrorMessage('Code Context: No file selected.');
    return;
  }

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    vscode.window.showErrorMessage(`Code Context: Cannot read file — ${String(err)}`);
    return;
  }

  const workspaceRoot = findWorkspaceRoot(filePath);
  const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');

  const config = vscode.workspace.getConfiguration('codeContext');
  const format = config.get<OutputFormat>('outputFormat', 'comment-path');

  const result = formatFiles([{ absolutePath: filePath, relativePath, content }], { format });

  await vscode.env.clipboard.writeText(result.text);
  statusBar.show(result.fileCount, result.lineCount);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function resolveFilePath(uri: vscode.Uri | undefined): string | null {
  if (uri?.fsPath) {
    return uri.fsPath;
  }
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    return editor.document.uri.fsPath;
  }
  return null;
}
