import { Request, Response } from 'express';
import { AgentTARSServer } from '../../server';

/**
 * SystemController - Handles system-level API endpoints
 *
 * Responsible for:
 * - Health checks
 * - Model information retrieval
 * - System-wide configuration and status
 */
export class SystemController {
  /**
   * Health check endpoint
   */
  healthCheck(req: Request, res: Response) {
    res.status(200).json({ status: 'ok' });
  }

  /**
   * Get model information
   */
  getModelInfo(req: Request, res: Response) {
    try {
      const server = req.app.locals.server as AgentTARSServer;

      // 获取模型信息
      const modelInfo = {
        provider:
          process.env.MODEL_PROVIDER || server.config?.model?.use?.provider || 'Default Provider',
        model: process.env.MODEL_NAME || server.config?.model?.use?.model || 'Default Model',
      };

      res.status(200).json(modelInfo);
    } catch (error) {
      console.error('Error getting model info:', error);
      res.status(500).json({ error: 'Failed to get model information' });
    }
  }
}

export const systemController = new SystemController();
