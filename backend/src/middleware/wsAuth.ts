import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JwtPayload } from '../types/index.js';

// Augment @fastify/jwt to specify our JWT payload type
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

/**
 * WebSocket authentication hook for Fastify preValidation
 * Extracts JWT from query parameter and verifies it
 * WebSocket connections cannot easily use headers, so token is passed via query param
 */
export const wsAuthHook = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    // WebSocket connections pass token as query parameter
    const token = (request.query as { token?: string }).token;

    if (!token) {
      return reply.code(401).send({ error: 'Missing authentication token' });
    }

    // Verify and decode JWT
    const decoded = await request.server.jwt.verify<JwtPayload>(token);
    request.user = decoded;
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid authentication token' });
  }
};
