import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import websocketRoutes from './routes/websocket.js';
import keyRoutes from './routes/keys.js';
import messageRoutes from './routes/messages.js';

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

// Register WebSocket plugin BEFORE routes
await fastify.register(websocket);

// Decorate with authenticate function for protected routes
fastify.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(websocketRoutes, { prefix: '/api' });
await fastify.register(keyRoutes, { prefix: '/api' });
await fastify.register(messageRoutes, { prefix: '/api' });

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
