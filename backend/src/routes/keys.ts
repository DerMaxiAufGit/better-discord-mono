import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { keyService } from '../services/keyService.js';

interface SetKeyBody {
  publicKey: string;
}

interface GetKeyParams {
  userId: string;
}

export default async function keyRoutes(fastify: FastifyInstance) {
  // Set current user's public key
  fastify.post<{ Body: SetKeyBody }>(
    '/keys',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Body: SetKeyBody }>, reply: FastifyReply) => {
      const userId = (request.user as { userId: string }).userId;
      const { publicKey } = request.body;

      if (!publicKey || typeof publicKey !== 'string') {
        return reply.code(400).send({ error: 'publicKey is required' });
      }

      await keyService.setPublicKey(userId, publicKey);
      return { success: true };
    }
  );

  // Get another user's public key
  fastify.get<{ Params: GetKeyParams }>(
    '/keys/:userId',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: GetKeyParams }>, reply: FastifyReply) => {
      const { userId } = request.params;

      const publicKey = await keyService.getPublicKey(userId);
      if (!publicKey) {
        return reply.code(404).send({ error: 'User not found or no public key' });
      }

      return { userId, publicKey };
    }
  );
}
