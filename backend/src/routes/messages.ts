import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { messageService } from '../services/messageService.js';

interface HistoryParams {
  contactId: string;
}

interface HistoryQuery {
  limit?: string;
  beforeId?: string;
}

export default async function messageRoutes(fastify: FastifyInstance) {
  // Get message history with a contact
  fastify.get<{ Params: HistoryParams; Querystring: HistoryQuery }>(
    '/messages/:contactId',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: HistoryParams; Querystring: HistoryQuery }>, reply: FastifyReply) => {
      const userId = (request.user as { userId: string }).userId;
      const { contactId } = request.params;
      const limit = Math.min(parseInt(request.query.limit || '50', 10), 100);
      const beforeId = request.query.beforeId ? parseInt(request.query.beforeId, 10) : undefined;

      const { messages, hasMore } = await messageService.getHistory(
        userId,
        contactId,
        limit,
        beforeId
      );

      return { messages, hasMore };
    }
  );

  // Mark messages as read
  fastify.post<{ Params: HistoryParams }>(
    '/messages/:contactId/read',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: HistoryParams }>, reply: FastifyReply) => {
      const userId = (request.user as { userId: string }).userId;
      const { contactId } = request.params;

      await messageService.markRead(userId, contactId);
      return { success: true };
    }
  );
}
