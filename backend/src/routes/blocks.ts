import type { FastifyPluginAsync } from 'fastify';
import { blockService } from '../services/blockService.js';

const blockRoutes: FastifyPluginAsync = async (fastify) => {
  // Block a user (requires auth)
  fastify.post('/:userId', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const blockerId = (request.user as { userId: string }).userId;
    const { userId: blockedId } = request.params as { userId: string };
    const { deleteHistory } = request.body as { deleteHistory?: boolean } || {};

    try {
      await blockService.blockUser(blockerId, blockedId, deleteHistory || false);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Block failed';
      return reply.code(400).send({ error: message });
    }
  });

  // Unblock a user (requires auth)
  fastify.delete('/:userId', {
    preValidation: [fastify.authenticate],
  }, async (request) => {
    const blockerId = (request.user as { userId: string }).userId;
    const { userId: blockedId } = request.params as { userId: string };

    await blockService.unblockUser(blockerId, blockedId);
    return { success: true };
  });

  // Get list of blocked users (requires auth)
  fastify.get('/', {
    preValidation: [fastify.authenticate],
  }, async (request) => {
    const blockerId = (request.user as { userId: string }).userId;
    const blockedUsers = await blockService.getBlockedUsers(blockerId);
    return { blockedUsers };
  });

  // Check if a specific user is blocked (requires auth)
  fastify.get('/:userId', {
    preValidation: [fastify.authenticate],
  }, async (request) => {
    const blockerId = (request.user as { userId: string }).userId;
    const { userId: blockedId } = request.params as { userId: string };

    const isBlocked = await blockService.isBlocked(blockerId, blockedId);
    const isBlockedByThem = await blockService.isBlocked(blockedId, blockerId);

    return {
      isBlocked,        // You blocked them
      isBlockedByThem,  // They blocked you
    };
  });
};

export default blockRoutes;
