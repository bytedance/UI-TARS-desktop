/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { exclusiveModeMiddleware } from '../src/api/middleware/exclusive-mode';
import { AgentServer } from '../src/server';

describe('Exclusive Mode Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockServer: Partial<AgentServer>;

  beforeEach(() => {
    mockNext = vi.fn();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockServer = {
      canAcceptNewRequest: vi.fn(),
      getRunningSessionId: vi.fn(),
    };
    mockReq = {
      app: {
        locals: {
          server: mockServer,
        },
      } as any,
    };
  });

  describe('when server can accept new requests', () => {
    beforeEach(() => {
      vi.mocked(mockServer.canAcceptNewRequest!).mockReturnValue(true);
    });

    it('should call next() to continue processing', () => {
      exclusiveModeMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledOnce();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('when server cannot accept new requests (exclusive mode)', () => {
    beforeEach(() => {
      vi.mocked(mockServer.canAcceptNewRequest!).mockReturnValue(false);
      vi.mocked(mockServer.getRunningSessionId!).mockReturnValue('running-session-123');
    });

    it('should return 409 status with error message', () => {
      const result = exclusiveModeMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Server is in exclusive mode and another session is currently running',
        runningSessionId: 'running-session-123',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(result).toBe(mockRes);
    });

    it('should include the running session ID in the response', () => {
      vi.mocked(mockServer.getRunningSessionId!).mockReturnValue('specific-session-id');

      exclusiveModeMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          runningSessionId: 'specific-session-id',
        }),
      );
    });

    it('should handle null running session ID', () => {
      vi.mocked(mockServer.getRunningSessionId!).mockReturnValue(null);

      exclusiveModeMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          runningSessionId: null,
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing server instance gracefully', () => {
      mockReq = {
        app: {
          locals: {},
        } as any,
      };

      expect(() => {
        exclusiveModeMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow();
    });

    it('should handle server method errors gracefully', () => {
      vi.mocked(mockServer.canAcceptNewRequest!).mockImplementation(() => {
        throw new Error('Server error');
      });

      expect(() => {
        exclusiveModeMiddleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow('Server error');
    });
  });

  describe('integration scenarios', () => {
    it('should work correctly in a typical middleware chain', () => {
      const middlewareChain = [
        exclusiveModeMiddleware,
        (req: Request, res: Response, next: NextFunction) => {
          res.json({ success: true });
        },
      ];

      // Server can accept requests
      vi.mocked(mockServer.canAcceptNewRequest!).mockReturnValue(true);

      // Execute first middleware
      middlewareChain[0](mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledOnce();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should short-circuit middleware chain when blocking requests', () => {
      const secondMiddleware = vi.fn();

      // Server cannot accept requests
      vi.mocked(mockServer.canAcceptNewRequest!).mockReturnValue(false);
      vi.mocked(mockServer.getRunningSessionId!).mockReturnValue('blocking-session');

      exclusiveModeMiddleware(mockReq as Request, mockRes as Response, mockNext);

      // Simulate that next() would call second middleware
      expect(mockNext).not.toHaveBeenCalled();
      expect(secondMiddleware).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });
  });
});
