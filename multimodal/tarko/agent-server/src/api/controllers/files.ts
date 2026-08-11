/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, RequestHandler, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { nanoid } from 'nanoid';

export const MAX_UPLOAD_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_UPLOAD_FILE_COUNT = 10;
const UPLOAD_DIRECTORY = 'uploads';

/**
 * Remove path components and characters that would make an uploaded file
 * difficult to reference from a chat message.
 */
export function sanitizeFileName(originalName: string): string {
  const baseName = path.basename(originalName).normalize('NFKC');
  const sanitized = baseName
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\-]+|[.\-]+$/g, '');

  return sanitized || 'file';
}

export function createStoredFileName(originalName: string): string {
  const sanitizedName = sanitizeFileName(originalName);
  const extension = path.extname(sanitizedName);
  const stem =
    path
      .basename(sanitizedName, extension)
      .replace(/[.\-]+$/g, '')
      .slice(0, 120) || 'file';
  const safeExtension = extension.slice(0, 20);

  return `${stem}-${nanoid(10)}${safeExtension}`;
}

function getUploadDirectory(req: Request): string {
  const workspacePath = path.resolve(req.app.locals.server.getCurrentWorkspace());
  const uploadDirectory = path.resolve(workspacePath, UPLOAD_DIRECTORY);
  const relativePath = path.relative(workspacePath, uploadDirectory);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Upload directory is outside the configured workspace');
  }

  return uploadDirectory;
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, _file, callback) {
      let uploadDirectory: string;
      try {
        uploadDirectory = getUploadDirectory(req);
      } catch (error) {
        callback(error as Error, '');
        return;
      }

      fs.mkdir(uploadDirectory, { recursive: true }, (error) => {
        callback(error, uploadDirectory);
      });
    },
    filename(_req, file, callback) {
      callback(null, createStoredFileName(file.originalname));
    },
  }),
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE,
    files: MAX_UPLOAD_FILE_COUNT,
  },
});

/**
 * Parse multipart uploads and keep Multer errors in the JSON API contract.
 */
export const uploadFilesMiddleware: RequestHandler = (req, res, next) => {
  upload.array('files', MAX_UPLOAD_FILE_COUNT)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      res.status(status).json({
        error:
          error.code === 'LIMIT_FILE_SIZE'
            ? `Each file must be ${MAX_UPLOAD_FILE_SIZE / 1024 / 1024}MB or smaller`
            : error.message,
        code: error.code,
      });
      return;
    }

    console.error('Failed to receive uploaded files:', error);
    res.status(500).json({ error: 'Failed to receive uploaded files' });
  });
};

/**
 * Return safe workspace-relative paths for files already persisted by Multer.
 */
export function uploadFiles(req: Request, res: Response) {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files?.length) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  try {
    const workspacePath = path.resolve(req.app.locals.server.getCurrentWorkspace());
    const uploadedFiles = files.map((file) => {
      const relativePath = path.relative(workspacePath, file.path);

      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new Error('Uploaded file was written outside the configured workspace');
      }

      return {
        name: path.basename(file.originalname),
        storedName: file.filename,
        relativePath: relativePath.split(path.sep).join('/'),
        size: file.size,
        mimeType: file.mimetype,
      };
    });

    return res.status(200).json({ files: uploadedFiles });
  } catch (error) {
    console.error('Failed to finalize uploaded files:', error);
    return res.status(500).json({ error: 'Failed to finalize uploaded files' });
  }
}
