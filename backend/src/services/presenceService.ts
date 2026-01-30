import { query } from '../db/index.js';
import { broadcastToUsers } from '../routes/websocket.js';
import type { PresenceStatus, UserPresence } from '../db/schema.js';

const PRESENCE_TTL = 300;  // 5 minutes - require heartbeat to maintain

// In-memory presence cache (Redis would be better for multi-instance, but in-memory works for single instance)
// Structure: Map<userId, { status, lastSeen, visibilityList }>
const presenceCache = new Map<string, {
  status: PresenceStatus;
  lastSeen: Date;
  visibilityList: string[];
}>();

class PresenceService {
  /**
   * User connected via WebSocket - mark as online
   * Loads persisted status from database or defaults to 'online'
   */
  async userConnected(userId: string): Promise<void> {
    // Load persisted status from database (or create default)
    const result = await query(
      `INSERT INTO user_presence (user_id, status, last_seen, updated_at)
       VALUES ($1, 'online', NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET last_seen = NOW(), updated_at = NOW()
       RETURNING *`,
      [userId]
    );

    const row = result.rows[0];
    presenceCache.set(userId, {
      status: row.status,
      lastSeen: new Date(),
      visibilityList: row.visibility_list || [],
    });

    // Broadcast to friends
    await this.broadcastStatus(userId);
  }

  /**
   * User disconnected - update last_seen and broadcast offline
   */
  async userDisconnected(userId: string): Promise<void> {
    const now = new Date();

    // Update database
    await query(
      `UPDATE user_presence SET last_seen = $1, updated_at = $1 WHERE user_id = $2`,
      [now, userId]
    );

    // Update cache (keep for last-seen queries)
    const cached = presenceCache.get(userId);
    if (cached) {
      cached.lastSeen = now;
    }

    // Remove from active connections (done by websocket handler)
    presenceCache.delete(userId);

    // Broadcast offline to friends
    await this.broadcastStatus(userId);
  }

  /**
   * Update user's status (online/away/dnd/invisible)
   */
  async updateStatus(
    userId: string,
    status: PresenceStatus,
    visibilityList?: string[]
  ): Promise<void> {
    const now = new Date();

    // Update database
    const updates = visibilityList !== undefined
      ? await query(
          `UPDATE user_presence
           SET status = $1, visibility_list = $2, updated_at = NOW()
           WHERE user_id = $3
           RETURNING *`,
          [status, visibilityList, userId]
        )
      : await query(
          `UPDATE user_presence SET status = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
          [status, userId]
        );

    // Update cache
    const row = updates.rows[0];
    if (row) {
      presenceCache.set(userId, {
        status: row.status,
        lastSeen: row.last_seen,
        visibilityList: row.visibility_list || [],
      });
    }

    // Broadcast to friends
    await this.broadcastStatus(userId);
  }

  /**
   * Get user's visible status (respects selective visibility for invisible mode)
   */
  async getVisibleStatus(
    targetUserId: string,
    viewerUserId: string
  ): Promise<{ status: string; lastSeen: Date | null } | null> {
    // Check cache first
    let presence = presenceCache.get(targetUserId);

    // If not in cache, check database for last-seen
    if (!presence) {
      const result = await query(
        `SELECT * FROM user_presence WHERE user_id = $1`,
        [targetUserId]
      );
      if (result.rows[0]) {
        const row = result.rows[0];
        presence = {
          status: 'offline' as PresenceStatus,  // Not in cache = offline
          lastSeen: row.last_seen,
          visibilityList: row.visibility_list || [],
        };
      } else {
        return null;  // Never been online
      }
    }

    // Handle invisible mode with selective visibility
    if (presence.status === 'invisible') {
      if (presence.visibilityList.includes(viewerUserId)) {
        return { status: 'online', lastSeen: presence.lastSeen };
      } else {
        return { status: 'offline', lastSeen: presence.lastSeen };
      }
    }

    // Check if user is actually online (in cache = connected)
    const isOnline = presenceCache.has(targetUserId);
    return {
      status: isOnline ? presence.status : 'offline',
      lastSeen: presence.lastSeen,
    };
  }

  /**
   * Get visible statuses for multiple users (batch for efficiency)
   */
  async getBatchVisibleStatus(
    targetUserIds: string[],
    viewerUserId: string
  ): Promise<Map<string, { status: string; lastSeen: Date | null }>> {
    const results = new Map<string, { status: string; lastSeen: Date | null }>();

    for (const targetId of targetUserIds) {
      const status = await this.getVisibleStatus(targetId, viewerUserId);
      if (status) {
        results.set(targetId, status);
      }
    }

    return results;
  }

  /**
   * Update visibility list for invisible mode
   */
  async setVisibilityList(userId: string, visibilityList: string[]): Promise<void> {
    await query(
      `UPDATE user_presence SET visibility_list = $1, updated_at = NOW() WHERE user_id = $2`,
      [visibilityList, userId]
    );

    const cached = presenceCache.get(userId);
    if (cached) {
      cached.visibilityList = visibilityList;
    }

    // Re-broadcast to update friends' views
    await this.broadcastStatus(userId);
  }

  /**
   * Get user's visibility list
   */
  async getVisibilityList(userId: string): Promise<string[]> {
    const cached = presenceCache.get(userId);
    if (cached) return cached.visibilityList;

    const result = await query(
      `SELECT visibility_list FROM user_presence WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0]?.visibility_list || [];
  }

  /**
   * Handle heartbeat to prevent ghost users
   */
  async heartbeat(userId: string): Promise<void> {
    const cached = presenceCache.get(userId);
    if (cached) {
      cached.lastSeen = new Date();
    }
  }

  /**
   * Check if user is online (connected)
   */
  isOnline(userId: string): boolean {
    return presenceCache.has(userId);
  }

  /**
   * Get cached presence data
   */
  getCachedPresence(userId: string): { status: PresenceStatus; lastSeen: Date; visibilityList: string[] } | undefined {
    return presenceCache.get(userId);
  }

  /**
   * Get user's persisted status from database or cache
   */
  async getPersistedStatus(userId: string): Promise<PresenceStatus> {
    // Check cache first
    const cached = presenceCache.get(userId);
    if (cached) return cached.status;

    // Otherwise check database
    const result = await query(
      `SELECT status FROM user_presence WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0]?.status || 'offline';
  }

  /**
   * Broadcast status update to all friends
   */
  private async broadcastStatus(userId: string): Promise<void> {
    // Get user's friends
    const friendsResult = await query(
      `SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END as friend_id
       FROM friend_requests
       WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'`,
      [userId]
    );

    const friendIds: string[] = friendsResult.rows.map((r: any) => r.friend_id);
    if (friendIds.length === 0) return;

    // Get user's username for status display
    const userResult = await query(
      `SELECT username, email FROM users WHERE id = $1`,
      [userId]
    );
    const username = userResult.rows[0]?.username || userResult.rows[0]?.email?.split('@')[0] || 'User';

    // Send personalized status to each friend (respects visibility)
    for (const friendId of friendIds) {
      const visibleStatus = await this.getVisibleStatus(userId, friendId);
      if (visibleStatus) {
        broadcastToUsers([friendId], {
          type: 'presence_update',
          userId,
          username,
          status: visibleStatus.status,
          lastSeen: visibleStatus.lastSeen?.toISOString() || null,
        });
      }
    }
  }
}

export const presenceService = new PresenceService();
