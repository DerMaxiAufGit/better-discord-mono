import bcrypt from 'bcrypt';
import { pool } from '../db/index.js';
import type { User } from '../types/index.js';

const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Create a new user with email and password
   * @throws Error if email already exists
   */
  async signup(email: string, password: string): Promise<User> {
    try {
      // Hash password with bcrypt
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert user into database
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, email_verified)
         VALUES ($1, $2, false)
         RETURNING id, email, password_hash, email_verified, username, created_at, updated_at`,
        [email, passwordHash]
      );

      return result.rows[0];
    } catch (error: any) {
      // Check for unique constraint violation on email
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw new Error('Email already registered');
      }
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   * Returns null for both "user not found" and "wrong password" to prevent user enumeration
   */
  async login(email: string, password: string): Promise<User | null> {
    // Query user by email
    const result = await pool.query(
      'SELECT id, email, password_hash, email_verified, username, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    // User not found - return null (same as wrong password for security)
    if (result.rows.length === 0) {
      // Still perform bcrypt comparison to prevent timing attacks
      await bcrypt.compare(password, '$2b$12$0000000000000000000000000000000000000000000000');
      return null;
    }

    const user = result.rows[0];

    // Compare password with bcrypt (constant-time comparison)
    const isValid = await bcrypt.compare(password, user.password_hash);

    // Return user if valid, null if invalid (same response for security)
    return isValid ? user : null;
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, password_hash, email_verified, username, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Set username for a user
   * @throws Error if username already taken
   */
  async setUsername(userId: string, username: string): Promise<User> {
    try {
      const result = await pool.query(
        `UPDATE users SET username = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, email, password_hash, email_verified, username, created_at, updated_at`,
        [username, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'users_username_key') {
        throw new Error('Username already taken');
      }
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens for a user
   * Access token expires in JWT_ACCESS_EXPIRY (default 15m)
   * Refresh token expires in JWT_REFRESH_EXPIRY (default 7d)
   */
  generateTokens(
    user: User,
    jwtSign: (payload: any, options?: any) => string
  ): { accessToken: string; refreshToken: string } {
    const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

    // Access token: full user info
    const accessToken = jwtSign(
      {
        userId: user.id,
        email: user.email,
      },
      {
        expiresIn: accessExpiry,
      }
    );

    // Refresh token: only user ID (minimal info)
    const refreshToken = jwtSign(
      {
        userId: user.id,
      },
      {
        expiresIn: refreshExpiry,
      }
    );

    return { accessToken, refreshToken };
  }
}

// Export singleton instance
export const authService = new AuthService();
