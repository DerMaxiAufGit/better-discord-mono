import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();

const fastify = Fastify({
  logger: true
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production'
});

await fastify.register(cookie);

// Register routes
await fastify.register(authRoutes, { prefix: '/auth' });

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server listening on http://0.0.0.0:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
