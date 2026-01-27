import type { FastifyPluginAsync } from 'fastify';
import { authService } from '../services/auth.service.js';
import type { AuthResponse } from '../types/index.js';

// Basic email validation regex (not complex, per research)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/signup
  fastify.post<{
    Body: { email: string; password: string };
  }>('/signup', async (request, reply) => {
    const { email, password } = request.body;

    // Validate email format
    if (!email || !EMAIL_REGEX.test(email)) {
      return reply.code(400).send({ error: 'Invalid email format' });
    }

    // Validate password length
    if (!password || password.length < 8) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters' });
    }

    try {
      // Create user
      const user = await authService.signup(email, password);

      // Generate tokens
      const { accessToken, refreshToken } = authService.generateTokens(
        user,
        fastify.jwt.sign.bind(fastify.jwt)
      );

      // Set refresh token in httpOnly cookie
      reply.setCookie('refreshToken', refreshToken, COOKIE_OPTIONS);

      // Return access token and user data (without password_hash)
      const response: AuthResponse = {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
        },
      };

      return reply.send(response);
    } catch (error: any) {
      if (error.message === 'Email already registered') {
        return reply.code(400).send({ error: 'Email already registered' });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /auth/login
  fastify.post<{
    Body: { email: string; password: string };
  }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    try {
      // Authenticate user
      const user = await authService.login(email, password);

      // Invalid credentials (generic message per CONTEXT.md)
      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Generate tokens
      const { accessToken, refreshToken } = authService.generateTokens(
        user,
        fastify.jwt.sign.bind(fastify.jwt)
      );

      // Set refresh token in httpOnly cookie
      reply.setCookie('refreshToken', refreshToken, COOKIE_OPTIONS);

      // Return access token and user data
      const response: AuthResponse = {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
        },
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken) {
      return reply.code(401).send({ error: 'No refresh token' });
    }

    try {
      // Verify refresh token
      const decoded = fastify.jwt.verify<{ userId: string }>(refreshToken);

      // Find user
      const user = await authService.findById(decoded.userId);

      if (!user) {
        return reply.code(401).send({ error: 'Invalid refresh token' });
      }

      // Generate NEW tokens (sliding window - both access AND refresh)
      const { accessToken, refreshToken: newRefreshToken } = authService.generateTokens(
        user,
        fastify.jwt.sign.bind(fastify.jwt)
      );

      // Set new refresh token cookie (resets 7-day expiry)
      reply.setCookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

      // Return new access token
      return reply.send({ accessToken });
    } catch (error) {
      // Invalid or expired token
      return reply.code(401).send({ error: 'Invalid refresh token' });
    }
  });

  // POST /auth/logout
  fastify.post('/logout', async (request, reply) => {
    // Clear refresh token cookie (must match all options from setCookie)
    reply.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/api/auth',
    });

    return reply.send({ success: true });
  });

  // POST /auth/me (bonus endpoint for frontend)
  fastify.post('/me', async (request, reply) => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'No authorization token' });
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Verify token
      const decoded = fastify.jwt.verify<{ userId: string; email: string }>(token);

      // Find user
      const user = await authService.findById(decoded.userId);

      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }

      // Return user data (without password_hash)
      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified,
        },
      });
    } catch (error) {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });
};

export default authRoutes;
