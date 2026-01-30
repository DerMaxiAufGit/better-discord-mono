import { query } from '../db/index.js';

export interface FriendRequest {
  id: number;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendWithUser {
  id: number;
  oderId: string;
  username: string;
  status: 'pending' | 'accepted';
  createdAt: Date;
}

class FriendService {
  // Send a friend request
  async sendRequest(requesterId: string, addresseeId: string): Promise<FriendRequest> {
    // Check if request already exists (in either direction)
    const existing = await query(
      `SELECT * FROM friend_requests
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)`,
      [requesterId, addresseeId]
    );

    if (existing.rows.length > 0) {
      const req = existing.rows[0];
      if (req.status === 'accepted') {
        throw new Error('Already friends');
      }
      if (req.status === 'pending') {
        // If the other person already sent us a request, auto-accept
        if (req.requester_id === addresseeId) {
          return this.acceptRequest(requesterId, req.id);
        }
        throw new Error('Friend request already sent');
      }
      if (req.status === 'rejected') {
        // Allow re-sending after rejection by updating the existing request
        const updated = await query(
          `UPDATE friend_requests
           SET status = 'pending', requester_id = $1, addressee_id = $2, updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [requesterId, addresseeId, req.id]
        );
        return this.mapRow(updated.rows[0]);
      }
    }

    const result = await query(
      `INSERT INTO friend_requests (requester_id, addressee_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [requesterId, addresseeId]
    );
    return this.mapRow(result.rows[0]);
  }

  // Accept a friend request
  async acceptRequest(userId: string, requestId: number): Promise<FriendRequest> {
    const result = await query(
      `UPDATE friend_requests
       SET status = 'accepted', updated_at = NOW()
       WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
       RETURNING *`,
      [requestId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Friend request not found or already processed');
    }

    return this.mapRow(result.rows[0]);
  }

  // Reject a friend request
  async rejectRequest(userId: string, requestId: number): Promise<void> {
    const result = await query(
      `UPDATE friend_requests
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1 AND addressee_id = $2 AND status = 'pending'`,
      [requestId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Friend request not found or already processed');
    }
  }

  // Remove a friend (delete the accepted request)
  async removeFriend(userId: string, friendId: string): Promise<void> {
    await query(
      `DELETE FROM friend_requests
       WHERE status = 'accepted'
         AND ((requester_id = $1 AND addressee_id = $2)
              OR (requester_id = $2 AND addressee_id = $1))`,
      [userId, friendId]
    );
  }

  /**
   * Restore a friendship directly (used when unblocking)
   * Creates an accepted friend_request record without requiring acceptance
   */
  async restoreFriendship(userId1: string, userId2: string): Promise<void> {
    // Check if friendship already exists
    const existing = await query(
      `SELECT * FROM friend_requests
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)`,
      [userId1, userId2]
    );

    if (existing.rows.length > 0) {
      const req = existing.rows[0];
      if (req.status === 'accepted') {
        return; // Already friends
      }
      // Update existing record to accepted
      await query(
        `UPDATE friend_requests
         SET status = 'accepted', updated_at = NOW()
         WHERE id = $1`,
        [req.id]
      );
      return;
    }

    // Create new accepted friendship
    await query(
      `INSERT INTO friend_requests (requester_id, addressee_id, status)
       VALUES ($1, $2, 'accepted')`,
      [userId1, userId2]
    );
  }

  // Get pending requests received by user
  async getPendingRequests(userId: string): Promise<FriendWithUser[]> {
    const result = await query(
      `SELECT fr.id, fr.requester_id, u.username, fr.status, fr.created_at
       FROM friend_requests fr
       JOIN users u ON u.id = fr.requester_id
       WHERE fr.addressee_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      oderId: row.requester_id,
      username: row.username,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  // Get all friends (accepted requests)
  async getFriends(userId: string): Promise<FriendWithUser[]> {
    const result = await query(
      `SELECT fr.id,
              CASE WHEN fr.requester_id = $1 THEN fr.addressee_id ELSE fr.requester_id END as friend_id,
              u.username,
              fr.status,
              fr.created_at
       FROM friend_requests fr
       JOIN users u ON u.id = CASE WHEN fr.requester_id = $1 THEN fr.addressee_id ELSE fr.requester_id END
       WHERE (fr.requester_id = $1 OR fr.addressee_id = $1) AND fr.status = 'accepted'
       ORDER BY u.username ASC`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      oderId: row.friend_id,
      username: row.username,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  // Check if two users are friends
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM friend_requests
       WHERE status = 'accepted'
         AND ((requester_id = $1 AND addressee_id = $2)
              OR (requester_id = $2 AND addressee_id = $1))`,
      [userId1, userId2]
    );
    return result.rows.length > 0;
  }

  // Get friendship status between two users
  async getFriendshipStatus(userId: string, oderId: string): Promise<{ status: string; requestId?: number; isRequester?: boolean } | null> {
    const result = await query(
      `SELECT id, requester_id, status FROM friend_requests
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)`,
      [userId, oderId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      status: row.status,
      requestId: row.id,
      isRequester: row.requester_id === userId,
    };
  }

  private mapRow(row: any): FriendRequest {
    return {
      id: row.id,
      requesterId: row.requester_id,
      addresseeId: row.addressee_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const friendService = new FriendService();
