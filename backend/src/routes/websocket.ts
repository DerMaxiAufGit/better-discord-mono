import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { wsAuthHook } from '../middleware/wsAuth.js';

// Store active WebSocket connections by userId
// Exported so message service can access it for message delivery
export const activeConnections = new Map<string, WebSocket>();

const websocketRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication to all routes in this plugin
  fastify.addHook('preValidation', wsAuthHook);

  // WebSocket endpoint
  fastify.get('/ws', { websocket: true }, (socket, request) => {
    const userId = request.user?.userId;

    if (!userId) {
      fastify.log.error('WebSocket connection without userId - should not happen after auth');
      socket.close(1008, 'Unauthorized');
      return;
    }

    // Store connection
    activeConnections.set(userId, socket);
    fastify.log.info(`User ${userId} connected via WebSocket`);

    // Handle incoming messages (logging for now, actual handling in Plan 03)
    socket.on('message', (message: Buffer | ArrayBuffer | Buffer[]) => {
      const messageStr = message.toString();
      fastify.log.info(`Message from ${userId}: ${messageStr}`);
      // TODO: Handle message types in Plan 03
    });

    // Handle connection close
    socket.on('close', () => {
      activeConnections.delete(userId);
      fastify.log.info(`User ${userId} disconnected`);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      fastify.log.error(`WebSocket error for user ${userId}: ${error.message}`);
      activeConnections.delete(userId);
    });
  });
};

export default websocketRoutes;
