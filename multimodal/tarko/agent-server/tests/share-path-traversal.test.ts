/**
 * Target path: multimodal/tarko/agent-server/tests/share-path-traversal.test.ts
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ShareService } from '../src/services/ShareService';

const createWorkspace = () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tars-workspace-'));
  const imagesDir = path.join(workspace, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });
  const insideImage = path.join(imagesDir, 'inside.png');
  fs.writeFileSync(insideImage, 'inside');

  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tars-outside-'));
  const outsideImage = path.join(outsideDir, 'outside.png');
  fs.writeFileSync(outsideImage, 'outside');

  const cleanup = () => {
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  };

  return { workspace, insideImage, outsideImage, cleanup };
};

const buildService = () => new ShareService({} as any, null as any, undefined);

describe('ShareService.resolveWorkspaceImagePath', () => {
  it('allows workspace relative paths', () => {
    const { workspace, insideImage, cleanup } = createWorkspace();
    try {
      const service = buildService();
      const resolvePath = (service as any).resolveWorkspaceImagePath.bind(service);
      const resolved = resolvePath(workspace, 'images/inside.png');
      expect(resolved).toBe(insideImage);
    } finally {
      cleanup();
    }
  });

  it('rejects traversal paths', () => {
    const { workspace, cleanup } = createWorkspace();
    try {
      const service = buildService();
      const resolvePath = (service as any).resolveWorkspaceImagePath.bind(service);
      const resolved = resolvePath(workspace, '../outside.png');
      expect(resolved).toBeNull();
    } finally {
      cleanup();
    }
  });

  it('rejects absolute paths', () => {
    const { workspace, insideImage, cleanup } = createWorkspace();
    try {
      const service = buildService();
      const resolvePath = (service as any).resolveWorkspaceImagePath.bind(service);
      const resolved = resolvePath(workspace, insideImage);
      expect(resolved).toBeNull();
    } finally {
      cleanup();
    }
  });

  it('rejects symlink escape when supported', () => {
    const { workspace, outsideImage, cleanup } = createWorkspace();
    const linkPath = path.join(workspace, 'images', 'link.png');
    try {
      try {
        fs.symlinkSync(outsideImage, linkPath);
      } catch {
        return;
      }
      const service = buildService();
      const resolvePath = (service as any).resolveWorkspaceImagePath.bind(service);
      const resolved = resolvePath(workspace, 'images/link.png');
      expect(resolved).toBeNull();
    } finally {
      cleanup();
    }
  });
});
