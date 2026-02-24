import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import websocketRoutes from './routes/websocket.js';
import keyRoutes from './routes/keys.js';
import messageRoutes from './routes/messages.js';
import userRoutes from './routes/users.js';
import friendRoutes from './routes/friends.js';
import turnRoutes from './routes/turn.js';
import fileRoutes from './routes/files.js';
import reactionRoutes from './routes/reactions.js';
import groupRoutes from './routes/groups.js';
import avatarRoutes from './routes/avatars.js';
import presenceRoutes from './routes/presence.js';
import blockRoutes from './routes/blocks.js';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProd && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGIN must be set in production');
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

const fastify = Fastify({
  logger: true
});

// Register plugins
await fastify.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl)
    // or any origin in development, or specific origins from env
    if (!origin) return cb(null, true);
    if (!isProd && allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed'), false);
  },
  credentials: true
});

await fastify.register(jwt, {
  secret: jwtSecret
});

await fastify.register(cookie);
await fastify.register(rateLimit, { global: false });

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
await fastify.register(userRoutes, { prefix: '/api' });
await fastify.register(friendRoutes, { prefix: '/api' });
await fastify.register(turnRoutes, { prefix: '/api/turn' });
await fastify.register(fileRoutes, { prefix: '/api' });
await fastify.register(reactionRoutes, { prefix: '/api' });
await fastify.register(groupRoutes, { prefix: '/api' });
await fastify.register(avatarRoutes, { prefix: '/api/avatars' });
await fastify.register(presenceRoutes, { prefix: '/api/presence' });
await fastify.register(blockRoutes, { prefix: '/api/blocks' });

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
