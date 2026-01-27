import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { friendService } from '../services/friendService.js';

export default async function friendRoutes(fastify: FastifyInstance) {
  // Get all friends
  fastify.get(
    '/friends',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as { userId: string }).userId;
      const friends = await friendService.getFriends(userId);
      return { friends };
    }
  );

  // Get pending friend requests
  fastify.get(
    '/friends/requests',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as { userId: string }).userId;
      const requests = await friendService.getPendingRequests(userId);
      return { requests };
    }
  );

  // Send friend request
  fastify.post<{ Body: { userId: string } }>(
    '/friends/request',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Body: { userId: string } }>, reply: FastifyReply) => {
      const currentUserId = (request.user as { userId: string }).userId;
      const { userId: addresseeId } = request.body;

      if (!addresseeId) {
        return reply.code(400).send({ error: 'userId is required' });
      }

      if (currentUserId === addresseeId) {
        return reply.code(400).send({ error: 'Cannot send friend request to yourself' });
      }

      try {
        const friendRequest = await friendService.sendRequest(currentUserId, addresseeId);
        return { request: friendRequest };
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Accept friend request
  fastify.post<{ Params: { requestId: string } }>(
    '/friends/requests/:requestId/accept',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { requestId: string } }>, reply: FastifyReply) => {
      const userId = (request.user as { userId: string }).userId;
      const requestId = parseInt(request.params.requestId, 10);

      try {
        const friendRequest = await friendService.acceptRequest(userId, requestId);
        return { request: friendRequest };
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Reject friend request
  fastify.post<{ Params: { requestId: string } }>(
    '/friends/requests/:requestId/reject',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { requestId: string } }>, reply: FastifyReply) => {
      const userId = (request.user as { userId: string }).userId;
      const requestId = parseInt(request.params.requestId, 10);

      try {
        await friendService.rejectRequest(userId, requestId);
        return { success: true };
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Remove friend
  fastify.delete<{ Params: { friendId: string } }>(
    '/friends/:friendId',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { friendId: string } }>, reply: FastifyReply) => {
      const userId = (request.user as { userId: string }).userId;
      const { friendId } = request.params;

      await friendService.removeFriend(userId, friendId);
      return { success: true };
    }
  );

  // Check friendship status with a user
  fastify.get<{ Params: { userId: string } }>(
    '/friends/status/:userId',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      const currentUserId = (request.user as { userId: string }).userId;
      const { userId: otherUserId } = request.params;

      const status = await friendService.getFriendshipStatus(currentUserId, otherUserId);
      return { status };
    }
  );
}
