import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db/index.js';

interface UserListQuery {
  search?: string;
}

export default async function userRoutes(fastify: FastifyInstance) {
  // Get list of users (for contact discovery)
  fastify.get<{ Querystring: UserListQuery }>(
    '/users',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Querystring: UserListQuery }>, reply: FastifyReply) => {
      const currentUserId = (request.user as { userId: string }).userId;
      const { search } = request.query;

      let queryText = `
        SELECT id, email, created_at
        FROM users
        WHERE id != $1
      `;
      const params: (string)[] = [currentUserId];

      if (search) {
        queryText += ` AND email ILIKE $2`;
        params.push(`%${search}%`);
      }

      queryText += ` ORDER BY email ASC LIMIT 50`;

      const result = await query(queryText, params);

      return {
        users: result.rows.map((row) => ({
          id: row.id,
          email: row.email,
          createdAt: row.created_at,
        })),
      };
    }
  );

  // Get single user by ID
  fastify.get<{ Params: { userId: string } }>(
    '/users/:userId',
    { preValidation: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      const { userId } = request.params;

      const result = await query(
        'SELECT id, email, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      };
    }
  );
}
