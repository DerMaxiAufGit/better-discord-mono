import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateTurnCredentials } from '../services/turnService.js';

export default async function turnRoutes(fastify: FastifyInstance) {
  // Get TURN credentials for authenticated user
  fastify.get(
    '/credentials',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as { userId: string }).userId;

      try {
        const credentials = generateTurnCredentials(userId);
        return credentials;
      } catch (error) {
        fastify.log.error(error, 'Failed to generate TURN credentials');
        return reply.code(500).send({ error: 'Failed to generate TURN credentials' });
      }
    }
  );
}
