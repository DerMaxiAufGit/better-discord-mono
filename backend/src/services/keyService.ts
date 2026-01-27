import { query } from '../db/index.js';

class KeyService {
  // Save or update user's public key
  async setPublicKey(userId: string, publicKey: string): Promise<void> {
    await query(
      'UPDATE users SET public_key = $1 WHERE id = $2',
      [publicKey, userId]
    );
  }

  // Get a user's public key
  async getPublicKey(userId: string): Promise<string | null> {
    const result = await query(
      'SELECT public_key FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.public_key ?? null;
  }

  // Get public keys for multiple users (for batch operations)
  async getPublicKeys(userIds: string[]): Promise<Map<string, string>> {
    const result = await query(
      'SELECT id, public_key FROM users WHERE id = ANY($1) AND public_key IS NOT NULL',
      [userIds]
    );
    const keys = new Map<string, string>();
    for (const row of result.rows) {
      keys.set(row.id, row.public_key);
    }
    return keys;
  }
}

export const keyService = new KeyService();
