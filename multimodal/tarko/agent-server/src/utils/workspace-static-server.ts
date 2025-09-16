/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';

/**
 * Extract session ID from referer URL
 * @param referer The referer header value
 * @returns Session ID or null if not found
 */
function extractSessionIdFromReferer(referer: string | undefined): string | undefined {
  if (!referer) {
    return;
  }

  try {
    const url = new URL(referer);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Assume the last non-empty path segment is the session ID
    // You might want to adjust this logic based on your URL structure
    if (pathParts.length > 0) {
      const potentialSessionId = pathParts[pathParts.length - 1];

      // Basic validation - session ID should be alphanumeric and of reasonable length
      if (/^[a-zA-Z0-9_-]{10,}$/.test(potentialSessionId)) {
        return potentialSessionId;
      }
    }
  } catch (error) {
    // Invalid URL, ignore
  }

  return;
}

/**
 * Workspace file resolver that handles session isolation and absolute paths
 */
export class WorkspaceFileResolver {
  constructor(private baseWorkspacePath: string) {}

  /**
   * Resolve file path considering session isolation and security
   * @param requestPath The requested file path
   * @param sessionId Optional session ID for isolated sessions
   * @returns Resolved file path or null if not found/not allowed
   */
  resolveFilePath(requestPath: string, sessionId?: string): string | null {
    // Security check: prevent path traversal
    const normalizedPath = path.normalize(requestPath);
    if (normalizedPath.includes('..')) {
      return null;
    }

    const pathsToTry: string[] = [];

    pathsToTry.push(normalizedPath);

    // Always try the base workspace path as fallback
    const basePath = path.join(this.baseWorkspacePath, normalizedPath);
    pathsToTry.push(basePath);

    // Find the first existing file
    for (const filePath of pathsToTry) {
      if (this.isPathSafe(filePath) && fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Security check: ensure the resolved path is within allowed directories
   */
  private isPathSafe(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    const resolvedWorkspace = path.resolve(this.baseWorkspacePath);

    return resolvedPath.startsWith(resolvedWorkspace);
  }

  /**
   * List all accessible directories for a given session
   * @param sessionId Optional session ID
   * @returns Array of accessible directory paths
   */
  getAccessibleDirectories(sessionId?: string): string[] {
    const directories: string[] = [];

    // Add base workspace directory
    if (fs.existsSync(this.baseWorkspacePath)) {
      directories.push(this.baseWorkspacePath);
    }

    return directories;
  }
}

/**
 * Handle directory listing with session-aware navigation
 */
function handleDirectoryListing(
  req: express.Request,
  res: express.Response,
  directoryPath: string,
  fileResolver: WorkspaceFileResolver,
  sessionId: string | undefined,
  baseWorkspacePath: string,
): express.Response {
  try {
    const files = fs.readdirSync(directoryPath).map((file) => {
      const filePath = path.join(directoryPath, file);
      const fileStats = fs.statSync(filePath);
      return {
        name: file,
        isDirectory: fileStats.isDirectory(),
        size: fileStats.size,
        modified: fileStats.mtime,
      };
    });

    const relativePath = path.relative(baseWorkspacePath, directoryPath);
    const breadcrumb = relativePath ? relativePath.split(path.sep) : [];

    // Add session context to the listing
    const sessionContext = sessionId ? ` (Session: ${sessionId})` : '';
    const html = generateDirectoryListingHTML(
      files,
      req.path,
      breadcrumb,
      sessionContext,
      sessionId,
    );
    return res.send(html);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to read directory' });
  }
}

/**
 * Generate HTML for directory listing with session context
 */
function generateDirectoryListingHTML(
  files: Array<{ name: string; isDirectory: boolean; size: number; modified: Date }>,
  currentPath: string,
  breadcrumb: string[],
  sessionContext = '',
  sessionId?: string,
): string {
  const title = `Directory: ${currentPath}${sessionContext}`;

  const breadcrumbHTML =
    breadcrumb.length > 0
      ? breadcrumb
          .map((part, index) => {
            const href = '/' + breadcrumb.slice(0, index + 1).join('/');
            const sessionParam = sessionId ? `?sessionId=${sessionId}` : '';
            return `<a href="${href}${sessionParam}">${part}</a>`;
          })
          .join(' / ')
      : 'workspace';

  const parentLink =
    currentPath !== '/'
      ? `<tr><td><a href="${path.dirname(currentPath)}${sessionId ? `?sessionId=${sessionId}` : ''}">📁 ..</a></td><td>-</td><td>-</td></tr>`
      : '';

  const fileRows = files
    .sort((a, b) => {
      // Directories first, then files
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    })
    .map((file) => {
      const icon = file.isDirectory ? '📁' : '📄';
      const href = path.join(currentPath, file.name).replace(/\\/g, '/');
      const sessionParam = sessionId ? `?sessionId=${sessionId}` : '';
      const size = file.isDirectory ? '-' : formatFileSize(file.size);
      const modified =
        file.modified.toLocaleDateString() + ' ' + file.modified.toLocaleTimeString();

      return `<tr>
        <td><a href="${href}${sessionParam}">${icon} ${file.name}</a></td>
        <td>${size}</td>
        <td>${modified}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .breadcrumb { margin-bottom: 20px; color: #666; }
        .session-info { margin-bottom: 20px; padding: 10px; background-color: #f0f8ff; border-radius: 5px; color: #0066cc; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background-color: #f5f5f5; font-weight: bold; }
        a { text-decoration: none; color: #0066cc; }
        a:hover { text-decoration: underline; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <h1>Agent Workspace${sessionContext}</h1>
    ${sessionId ? `<div class="session-info">📋 Browsing files for session: <strong>${sessionId}</strong></div>` : ''}
    <div class="breadcrumb">📁 ${breadcrumbHTML}</div>
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Modified</th>
            </tr>
        </thead>
        <tbody>
            ${parentLink}
            ${fileRows}
        </tbody>
    </table>
    <div class="footer">
        Agent Workspace Static Server${sessionContext}
        ${sessionId ? `<br/>Tip: Remove <code>?sessionId=${sessionId}</code> from URL to browse base workspace` : ''}
    </div>
</body>
</html>`;
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Setup workspace static server with session isolation support
 * Serves static files from workspace directories with proper session handling
 * @param app Express application instance
 * @param workspacePath Path to workspace directory
 * @param isDebug Whether to show debug logs
 */
export function setupWorkspaceStaticServer(
  app: express.Application,
  workspacePath: string,
  isDebug = false,
): void {
  if (!workspacePath || !fs.existsSync(workspacePath)) {
    if (isDebug) {
      console.log('Workspace path not found, skipping static server setup');
    }
    return;
  }

  if (isDebug) {
    console.log(`Setting up workspace static server at: ${workspacePath}`);
  }

  const fileResolver = new WorkspaceFileResolver(workspacePath);

  // Serve workspace files with lower priority (after web UI)
  // Use a middleware function to handle directory listing and file serving
  app.use('/', (req, res, next) => {
    // Skip if this looks like an API request
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Skip if this looks like a web UI route (no file extension and not a static asset)
    if (
      !req.path.includes('.') &&
      !req.path.startsWith('/static/') &&
      !req.path.startsWith('/assets/')
    ) {
      return next();
    }

    // Try to extract session ID from query params or headers
    const sessionId =
      (req.query.sessionId as string) ||
      (req.headers['x-session-id'] as string) ||
      extractSessionIdFromReferer(req.headers.referer);

    // Resolve the file path using the file resolver
    const resolvedPath = fileResolver.resolveFilePath(req.path, sessionId);
    if (!resolvedPath) {
      return next();
    }

    try {
      const stats = fs.statSync(resolvedPath);

      if (stats.isFile()) {
        // Serve the file
        return res.sendFile(resolvedPath);
      } else if (stats.isDirectory()) {
        // For directories, try to serve index.html or provide directory listing
        const indexPath = path.join(resolvedPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          return res.sendFile(indexPath);
        } else {
          // Provide directory listing with session context
          return handleDirectoryListing(
            req,
            res,
            resolvedPath,
            fileResolver,
            sessionId,
            workspacePath,
          );
        }
      }
    } catch (error) {
      // File access error, continue to next middleware
      return next();
    }

    // File not found, continue to next middleware
    next();
  });
}
