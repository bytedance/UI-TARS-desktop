import { Request, Response } from 'express';
import { AgentTARSServer } from '../../server';

/**
 * ShareController - Handles sharing-related API endpoints
 *
 * Responsible for:
 * - Share configuration retrieval
 * - Sharing functionality
 */
export class ShareController {
  /**
   * Get share configuration
   */
  getShareConfig(req: Request, res: Response) {
    const server = req.app.locals.server as AgentTARSServer;

    res.status(200).json({
      hasShareProvider: !!server.options.shareProvider,
      shareProvider: server.options.shareProvider || null,
    });
  }
}

export const shareController = new ShareController();
