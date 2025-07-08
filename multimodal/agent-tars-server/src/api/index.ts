/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { registerAllRoutes } from './routes';

/**
 * Get default CORS options if none are provided
 *
 * TODO: support cors config.
 */
export function getDefaultCorsOptions(): cors.CorsOptions {
  return {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

/**
 * Setup workspace static server
 * Serves static files from the workspace directory
 * @param app Express application instance
 * @param workspacePath Path to workspace directory
 * @param isDebug Whether to show debug logs
 */
function setupWorkspaceStaticServer(
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

    const requestedPath = path.join(workspacePath, req.path);

    // Security check: ensure the requested path is within workspace
    const normalizedWorkspace = path.resolve(workspacePath);
    const normalizedRequest = path.resolve(requestedPath);

    if (!normalizedRequest.startsWith(normalizedWorkspace)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (fs.existsSync(requestedPath)) {
      const stats = fs.statSync(requestedPath);

      if (stats.isFile()) {
        // Serve the file
        return res.sendFile(requestedPath);
      } else if (stats.isDirectory()) {
        // For directories, try to serve index.html or provide directory listing
        const indexPath = path.join(requestedPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          return res.sendFile(indexPath);
        } else {
          // Provide simple directory listing
          try {
            const files = fs.readdirSync(requestedPath).map((file) => {
              const filePath = path.join(requestedPath, file);
              const fileStats = fs.statSync(filePath);
              return {
                name: file,
                isDirectory: fileStats.isDirectory(),
                size: fileStats.size,
                modified: fileStats.mtime,
              };
            });

            const relativePath = path.relative(workspacePath, requestedPath);
            const breadcrumb = relativePath ? relativePath.split(path.sep) : [];

            const html = generateDirectoryListingHTML(files, req.path, breadcrumb);
            return res.send(html);
          } catch (error) {
            return res.status(500).json({ error: 'Failed to read directory' });
          }
        }
      }
    }

    // File not found, continue to next middleware
    next();
  });
}

/**
 * Generate HTML for directory listing
 */
function generateDirectoryListingHTML(
  files: Array<{ name: string; isDirectory: boolean; size: number; modified: Date }>,
  currentPath: string,
  breadcrumb: string[],
): string {
  const title = `Directory: ${currentPath}`;

  const breadcrumbHTML =
    breadcrumb.length > 0
      ? breadcrumb
          .map((part, index) => {
            const href = '/' + breadcrumb.slice(0, index + 1).join('/');
            return `<a href="${href}">${part}</a>`;
          })
          .join(' / ')
      : 'workspace';

  const parentLink =
    currentPath !== '/'
      ? `<tr><td><a href="${path.dirname(currentPath)}">📁 ..</a></td><td>-</td><td>-</td></tr>`
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
      const size = file.isDirectory ? '-' : formatFileSize(file.size);
      const modified =
        file.modified.toLocaleDateString() + ' ' + file.modified.toLocaleTimeString();

      return `<tr>
        <td><a href="${href}">${icon} ${file.name}</a></td>
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
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background-color: #f5f5f5; font-weight: bold; }
        a { text-decoration: none; color: #0066cc; }
        a:hover { text-decoration: underline; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <h1>Agent TARS Workspace</h1>
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
        Agent TARS Workspace Static Server
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
 * Setup API middleware and routes
 * @param app Express application instance
 * @param options Server options
 */
export function setupAPI(
  app: express.Application,
  options?: {
    workspacePath?: string;
    isDebug?: boolean;
  },
) {
  // Apply CORS middleware
  app.use(cors(getDefaultCorsOptions()));

  // Apply JSON body parser middleware
  app.use(express.json({ limit: '20mb' }));

  // Register all API routes first (highest priority)
  registerAllRoutes(app);

  // Setup workspace static server (lower priority, after API routes)
  if (options?.workspacePath) {
    setupWorkspaceStaticServer(app, options.workspacePath, options.isDebug);
  }
}
