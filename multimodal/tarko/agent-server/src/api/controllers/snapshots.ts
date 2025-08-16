/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { AgentServer } from '../../server';

/**
 * Get all available snapshots
 */
export async function getAllSnapshots(req: Request, res: Response): Promise<void> {
  try {
    const server = req.app.get('server') as AgentServer;
    const snapshotDirectory =
      server.appConfig.snapshot?.storageDirectory ?? path.join(os.homedir(), '.tarko', 'snapshots');

    // Check if snapshot directory exists
    try {
      await fs.access(snapshotDirectory);
    } catch {
      // Directory doesn't exist, return empty array
      res.json({ snapshots: [] });
      return;
    }

    // Read all session directories
    const entries = await fs.readdir(snapshotDirectory, { withFileTypes: true });
    const sessionIds = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    // Get snapshot info for each session
    const snapshots = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const sessionPath = path.join(snapshotDirectory, sessionId);
        try {
          const stats = await fs.stat(sessionPath);
          return {
            sessionId,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            path: sessionPath,
          };
        } catch {
          return null;
        }
      }),
    );

    // Filter out null results and sort by creation time
    const validSnapshots = snapshots
      .filter((snapshot) => snapshot !== null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({ snapshots: validSnapshots });
  } catch (error) {
    console.error('Error getting snapshots:', error);
    res.status(500).json({
      error: 'Failed to retrieve snapshots',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get specific snapshot by sessionId
 */
export async function getSnapshot(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const server = req.app.get('server') as AgentServer;
    const snapshotDirectory =
      server.appConfig.snapshot?.storageDirectory ?? path.join(os.homedir(), '.tarko', 'snapshots');

    const sessionPath = path.join(snapshotDirectory, sessionId);

    // Check if session snapshot exists
    try {
      const stats = await fs.stat(sessionPath);
      if (!stats.isDirectory()) {
        res.status(404).json({ error: 'Snapshot not found' });
        return;
      }

      // Get snapshot metadata
      const snapshot = {
        sessionId,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        path: sessionPath,
      };

      res.json({ snapshot });
    } catch {
      res.status(404).json({ error: 'Snapshot not found' });
    }
  } catch (error) {
    console.error('Error getting snapshot:', error);
    res.status(500).json({
      error: 'Failed to retrieve snapshot',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get trace data for a specific session
 */
export async function getSnapshotTrace(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const server = req.app.get('server') as AgentServer;
    const snapshotDirectory =
      server.appConfig.snapshot?.storageDirectory ?? path.join(os.homedir(), '.tarko', 'snapshots');

    const sessionPath = path.join(snapshotDirectory, sessionId);
    const tracePath = path.join(sessionPath, 'trace.json');

    try {
      const traceData = await fs.readFile(tracePath, 'utf-8');
      const trace = JSON.parse(traceData);
      res.json({ trace });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        res.status(404).json({ error: 'Trace data not found for this session' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting snapshot trace:', error);
    res.status(500).json({
      error: 'Failed to retrieve trace data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get snapshot files for a specific session
 */
export async function getSnapshotFiles(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const server = req.app.get('server') as AgentServer;
    const snapshotDirectory =
      server.appConfig.snapshot?.storageDirectory ?? path.join(os.homedir(), '.tarko', 'snapshots');

    const sessionPath = path.join(snapshotDirectory, sessionId);

    try {
      // Check if session directory exists
      await fs.access(sessionPath);

      // Read all files in the session directory
      const entries = await fs.readdir(sessionPath, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const filePath = path.join(sessionPath, entry.name);
          const stats = await fs.stat(filePath);
          return {
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            path: filePath,
          };
        }),
      );

      res.json({ files });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        res.status(404).json({ error: 'Snapshot not found' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting snapshot files:', error);
    res.status(500).json({
      error: 'Failed to retrieve snapshot files',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
