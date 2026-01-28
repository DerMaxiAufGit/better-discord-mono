import crypto from 'crypto';

export interface TurnCredentials {
  username: string;    // Format: "{expiry_timestamp}:{userId}"
  password: string;    // HMAC-SHA1(secret, username) base64 encoded
  ttl: number;         // Time-to-live in seconds
  uris: string[];      // TURN server URIs
}

/**
 * Generates time-limited TURN credentials using RFC-style REST API authentication.
 *
 * The credentials use HMAC-SHA1 to generate a password from the username and a shared secret.
 * Coturn validates these credentials by computing the same HMAC and comparing.
 *
 * @param userId - User ID to include in the credential username
 * @param ttl - Time-to-live in seconds (default: 86400 = 24 hours)
 * @returns TURN credentials with username, password, TTL, and server URIs
 */
export function generateTurnCredentials(userId: string, ttl: number = 86400): TurnCredentials {
  const secret = process.env.TURN_SECRET;
  if (!secret) {
    throw new Error('TURN_SECRET environment variable is not set');
  }

  const host = process.env.TURN_HOST || 'localhost';

  // Calculate expiry timestamp (Unix seconds)
  const expiryTimestamp = Math.floor(Date.now() / 1000) + ttl;

  // Username format: "{expiry_timestamp}:{userId}"
  const username = `${expiryTimestamp}:${userId}`;

  // Generate password: HMAC-SHA1(secret, username) base64 encoded
  const password = crypto
    .createHmac('sha1', secret)
    .update(username)
    .digest('base64');

  // TURN server URIs
  const uris = [
    `turn:${host}:3478?transport=udp`,
    `turn:${host}:3478?transport=tcp`,
  ];

  return {
    username,
    password,
    ttl,
    uris,
  };
}

export const turnService = {
  generateTurnCredentials,
};
