import express from 'express';
import { sessionsController } from '../controllers/sessions';

/**
 * Register session management routes
 * @param app Express application
 */
export function registerSessionRoutes(app: express.Application): void {
  // Get all sessions
  app.get('/api/sessions', sessionsController.getAllSessions);

  // Create a new session
  app.post('/api/sessions/create', sessionsController.createSession);

  // Get session details
  app.get('/api/sessions/details', sessionsController.getSessionDetails);

  // Get session events
  app.get('/api/sessions/events', sessionsController.getSessionEvents);

  // Get session status
  app.get('/api/sessions/status', sessionsController.getSessionStatus);

  // Update session metadata
  app.post('/api/sessions/update', sessionsController.updateSession);

  // Delete a session
  app.post('/api/sessions/delete', sessionsController.deleteSession);

  // Restore a session
  app.post('/api/sessions/restore', sessionsController.restoreSession);

  // Generate summary for a session
  app.post('/api/sessions/generate-summary', sessionsController.generateSummary);

  // Get browser control information
  app.get('/api/sessions/browser-control', sessionsController.getBrowserControlInfo);

  // Share a session
  app.post('/api/sessions/share', sessionsController.shareSession);
}