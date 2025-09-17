/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ChatCompletionContentPart } from '../../types';

/**
 * Configure multer for file uploads
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

/**
 * Get multer middleware for file uploads
 */
export const uploadMiddleware = upload.array('files', 10); // Allow up to 10 files

/**
 * Check if a file is an image based on its MIME type
 */
function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Generate a unique filename with timestamp
 */
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  return `${baseName}-${timestamp}${ext}`;
}

/**
 * Upload files endpoint
 * Images are returned as base64, other files are saved to workspace
 */
export async function uploadFiles(req: Request, res: Response) {
  try {
    const server = req.app.locals.server;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const workspacePath = server.getCurrentWorkspace();
    const results: ChatCompletionContentPart[] = [];

    for (const file of files) {
      if (isImageFile(file.mimetype)) {
        // For images, return as base64
        const base64Data = file.buffer.toString('base64');
        const dataUrl = `data:${file.mimetype};base64,${base64Data}`;
        
        results.push({
          type: 'image_url',
          image_url: {
            url: dataUrl
          }
        });
      } else {
        // For other files, save to workspace and return file path
        const uniqueFilename = generateUniqueFilename(file.originalname);
        const filePath = path.join(workspacePath, uniqueFilename);
        
        // Ensure the workspace directory exists
        if (!fs.existsSync(workspacePath)) {
          fs.mkdirSync(workspacePath, { recursive: true });
        }
        
        // Write file to workspace
        fs.writeFileSync(filePath, file.buffer);
        
        results.push({
          type: 'text',
          text: `Current file path: ${filePath}`
        });
      }
    }

    res.status(200).json(results);
  } catch (error) {
    console.error('Failed to upload files:', error);
    res.status(500).json({ 
      error: 'Failed to upload files',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
