import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db/index.js';

interface UserSearchQuery {
  search?: string;
}

export default async function userRoutes(fastify: FastifyInstance) {
  // Search users by username or email (for contact discovery)
  // Requires a search term - won't list all users
  fastify.get<{ Querystring: UserSearchQuery }>(
    '/users',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Querystring: UserSearchQuery }>, reply: FastifyReply) => {
      const currentUserId = (request.user as { userId: string }).userId;
      const { search } = request.query;

      // Require search term - don't list all users
      if (!search || search.trim().length < 2) {
        return { users: [] };
      }

      const searchTerm = search.trim();

      // Search by username OR email, but only return username
      // Users without a username set won't appear in search
      const result = await query(
        `SELECT id, username
         FROM users
         WHERE id != $1
           AND username IS NOT NULL
           AND (username ILIKE $2 OR email ILIKE $2)
         ORDER BY username ASC
         LIMIT 20`,
        [currentUserId, `%${searchTerm}%`]
      );

      return {
        users: result.rows.map((row) => ({
          id: row.id,
          username: row.username,
        })),
      };
    }
  );

  // Get single user by ID (returns username only)
  fastify.get<{ Params: { userId: string } }>(
    '/users/:userId',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      const { userId } = request.params;

      const result = await query(
        'SELECT id, username FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const user = result.rows[0];
      return {
        id: user.id,
        username: user.username,
      };
    }
  );
}
