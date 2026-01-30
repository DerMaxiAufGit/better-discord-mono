import { query } from '../db/index.js';
import { friendService } from './friendService.js';
import type { Block } from '../db/schema.js';

class BlockService {
  /**
   * Block a user
   * - Creates block record
   * - Auto-unfriends (removes friendship)
   * - Optionally deletes conversation history
   */
  async blockUser(
    blockerId: string,
    blockedId: string,
    deleteHistory: boolean = false
  ): Promise<void> {
    // Prevent self-blocking
    if (blockerId === blockedId) {
      throw new Error('Cannot block yourself');
    }

    // Insert block record (ignore if already blocked)
    await query(
      `INSERT INTO blocks (blocker_id, blocked_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [blockerId, blockedId]
    );

    // Auto-unfriend (remove friendship in both directions)
    await friendService.removeFriend(blockerId, blockedId);

    // Optionally delete conversation history
    if (deleteHistory) {
      await this.deleteConversationHistory(blockerId, blockedId);
    }
  }

  /**
   * Unblock a user
   * Note: Does NOT restore friendship - user must send new friend request
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await query(
      `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [blockerId, blockedId]
    );
  }

  /**
   * Check if userA has blocked userB
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [blockerId, blockedId]
    );
    return result.rows.length > 0;
  }

  /**
   * Check if either user has blocked the other (bidirectional)
   * Used to prevent messaging in either direction
   */
  async isBlockedBidirectional(userId1: string, userId2: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM blocks
       WHERE (blocker_id = $1 AND blocked_id = $2)
          OR (blocker_id = $2 AND blocked_id = $1)`,
      [userId1, userId2]
    );
    return result.rows.length > 0;
  }

  /**
   * Get list of users blocked by blocker
   */
  async getBlockedUsers(blockerId: string): Promise<Array<{ blockedId: string; blockedAt: Date; username: string | null }>> {
    const result = await query(
      `SELECT b.blocked_id, b.created_at, u.username
       FROM blocks b
       JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1
       ORDER BY b.created_at DESC`,
      [blockerId]
    );

    return result.rows.map((row: any) => ({
      blockedId: row.blocked_id,
      blockedAt: row.created_at,
      username: row.username,
    }));
  }

  /**
   * Get list of users who have blocked this user
   * (User doesn't see this directly, but needed for message filtering)
   */
  async getUsersWhoBlockedMe(userId: string): Promise<string[]> {
    const result = await query(
      `SELECT blocker_id FROM blocks WHERE blocked_id = $1`,
      [userId]
    );
    return result.rows.map((row: any) => row.blocker_id);
  }

  /**
   * Delete conversation history between two users
   * Called when blocking with deleteHistory=true
   */
  private async deleteConversationHistory(userId1: string, userId2: string): Promise<number> {
    const result = await query(
      `DELETE FROM messages
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)`,
      [userId1, userId2]
    );
    return result.rowCount || 0;
  }

  /**
   * Check if a message should be hidden from viewer due to blocking
   * Used for group messages where blocked users might have sent messages
   */
  async shouldHideMessage(messageOwnerId: string, viewerId: string): Promise<boolean> {
    return this.isBlocked(viewerId, messageOwnerId);
  }

  private mapRow(row: any): Block {
    return {
      blocker_id: row.blocker_id,
      blocked_id: row.blocked_id,
      created_at: row.created_at,
    };
  }
}

export const blockService = new BlockService();
