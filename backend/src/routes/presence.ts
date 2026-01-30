import type { FastifyPluginAsync } from 'fastify';
import { presenceService } from '../services/presenceService.js';
import type { PresenceStatus } from '../db/schema.js';

const presenceRoutes: FastifyPluginAsync = async (fastify) => {
  // Update own status (requires auth)
  fastify.put('/status', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    const { status, visibilityList } = request.body as {
      status: PresenceStatus;
      visibilityList?: string[];
    };

    // Validate status
    if (!['online', 'away', 'dnd', 'invisible'].includes(status)) {
      return reply.code(400).send({ error: 'Invalid status' });
    }

    await presenceService.updateStatus(userId, status, visibilityList);
    return { success: true };
  });

  // Get own status (requires auth)
  fastify.get('/status', {
    preValidation: [fastify.authenticate],
  }, async (request) => {
    const userId = (request.user as { userId: string }).userId;
    const visibilityList = await presenceService.getVisibilityList(userId);
    const status = await presenceService.getPersistedStatus(userId);

    return {
      status,
      visibilityList,
    };
  });

  // Get another user's status (requires auth)
  fastify.get('/:userId', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const viewerId = (request.user as { userId: string }).userId;
    const { userId } = request.params as { userId: string };

    const status = await presenceService.getVisibleStatus(userId, viewerId);
    if (!status) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return status;
  });

  // Get batch statuses for multiple users (requires auth)
  fastify.post('/batch', {
    preValidation: [fastify.authenticate],
  }, async (request) => {
    const viewerId = (request.user as { userId: string }).userId;
    const { userIds } = request.body as { userIds: string[] };

    const statuses = await presenceService.getBatchVisibleStatus(userIds, viewerId);

    // Convert Map to object for JSON response
    const result: Record<string, { status: string; lastSeen: string | null }> = {};
    statuses.forEach((value, key) => {
      result[key] = {
        status: value.status,
        lastSeen: value.lastSeen?.toISOString() || null,
      };
    });

    return { statuses: result };
  });

  // Update visibility list (requires auth)
  fastify.put('/visibility', {
    preValidation: [fastify.authenticate],
  }, async (request) => {
    const userId = (request.user as { userId: string }).userId;
    const { visibilityList } = request.body as { visibilityList: string[] };

    await presenceService.setVisibilityList(userId, visibilityList);
    return { success: true };
  });

  // Get visibility list (requires auth)
  fastify.get('/visibility', {
    preValidation: [fastify.authenticate],
  }, async (request) => {
    const userId = (request.user as { userId: string }).userId;
    const visibilityList = await presenceService.getVisibilityList(userId);
    return { visibilityList };
  });
};

export default presenceRoutes;
