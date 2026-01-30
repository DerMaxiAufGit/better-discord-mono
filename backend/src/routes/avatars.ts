import type { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { avatarService } from '../services/avatarService.js';
import fs from 'fs/promises';

const avatarRoutes: FastifyPluginAsync = async (fastify) => {
  // Register multipart support
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max for avatars
      files: 1
    }
  });

  // Upload avatar (requires auth)
  fastify.post('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;

    // Get multipart file
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    // Validate mime type
    if (!data.mimetype.startsWith('image/')) {
      return reply.code(400).send({ error: 'File must be an image' });
    }

    // Convert to buffer
    const buffer = await data.toBuffer();

    // Validate file size (5MB max)
    if (buffer.length > 5 * 1024 * 1024) {
      return reply.code(400).send({ error: 'File too large (max 5MB)' });
    }

    try {
      const avatar = await avatarService.uploadAvatar(userId, buffer);
      const version = new Date(avatar.updated_at).getTime();
      return {
        avatar: {
          id: avatar.id,
          tinyUrl: avatarService.getAvatarUrl(userId, 'tiny', version),
          smallUrl: avatarService.getAvatarUrl(userId, 'small', version),
          largeUrl: avatarService.getAvatarUrl(userId, 'large', version),
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      return reply.code(400).send({ error: message });
    }
  });

  // Delete avatar (requires auth)
  fastify.delete('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    await avatarService.deleteAvatar(userId);
    return reply.code(204).send();
  });

  // Get avatar URLs for user (public endpoint)
  fastify.get('/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const avatar = await avatarService.getAvatar(userId);

    if (!avatar) {
      return { avatar: null };
    }

    const version = new Date(avatar.updated_at).getTime();
    return {
      avatar: {
        tinyUrl: avatarService.getAvatarUrl(userId, 'tiny', version),
        smallUrl: avatarService.getAvatarUrl(userId, 'small', version),
        largeUrl: avatarService.getAvatarUrl(userId, 'large', version),
      }
    };
  });

  // Serve avatar image (public endpoint with caching)
  fastify.get('/:userId/:size', async (request, reply) => {
    const { userId, size } = request.params as { userId: string; size: string };

    if (!['tiny', 'small', 'large'].includes(size)) {
      return reply.code(400).send({ error: 'Invalid size' });
    }

    const filepath = await avatarService.getAvatarPath(userId, size as 'tiny' | 'small' | 'large');
    if (!filepath) {
      return reply.code(404).send({ error: 'Avatar not found' });
    }

    try {
      const file = await fs.readFile(filepath);
      return reply
        .header('Content-Type', 'image/webp')
        .header('Cache-Control', 'public, max-age=86400')  // 24h cache
        .send(file);
    } catch {
      return reply.code(404).send({ error: 'Avatar not found' });
    }
  });
};

export default avatarRoutes;
