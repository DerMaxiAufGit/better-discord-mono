import { query } from '../db/index.js';
import { Message } from '../types/index.js';

class MessageService {
  // Save encrypted message to database
  async saveMessage(
    senderId: string,
    recipientId: string,
    encryptedContent: string
  ): Promise<Message> {
    const result = await query(
      `INSERT INTO messages (sender_id, recipient_id, encrypted_content)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, recipient_id, encrypted_content, created_at, delivered_at, read_at`,
      [senderId, recipientId, encryptedContent]
    );
    return this.mapRow(result.rows[0]);
  }

  // Get message history between two users (paginated)
  async getHistory(
    userId: string,
    contactId: string,
    limit: number = 50,
    beforeId?: number
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    let queryText = `
      SELECT id, sender_id, recipient_id, encrypted_content, created_at, delivered_at, read_at
      FROM messages
      WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
    `;
    const params: (string | number)[] = [userId, contactId];

    if (beforeId) {
      queryText += ' AND id < $3';
      params.push(beforeId);
    }

    queryText += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit + 1); // Fetch one extra to check hasMore

    const result = await query(queryText, params);
    const hasMore = result.rows.length > limit;
    const messages = result.rows.slice(0, limit).map(this.mapRow);

    return { messages: messages.reverse(), hasMore }; // Return in chronological order
  }

  // Mark message as delivered
  async markDelivered(messageId: number): Promise<void> {
    await query(
      'UPDATE messages SET delivered_at = NOW() WHERE id = $1 AND delivered_at IS NULL',
      [messageId]
    );
  }

  // Mark messages as read
  async markRead(userId: string, contactId: string): Promise<void> {
    await query(
      `UPDATE messages SET read_at = NOW()
       WHERE recipient_id = $1 AND sender_id = $2 AND read_at IS NULL`,
      [userId, contactId]
    );
  }

  // Get list of conversations (contacts the user has exchanged messages with)
  async getConversations(userId: string): Promise<{ contactId: string; lastMessageAt: Date }[]> {
    const result = await query(
      `SELECT DISTINCT
        CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END as contact_id,
        MAX(created_at) as last_message_at
      FROM messages
      WHERE sender_id = $1 OR recipient_id = $1
      GROUP BY contact_id
      ORDER BY last_message_at DESC`,
      [userId]
    );
    return result.rows.map((row: any) => ({
      contactId: row.contact_id,
      lastMessageAt: row.last_message_at,
    }));
  }

  private mapRow(row: any): Message {
    return {
      id: row.id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      encryptedContent: row.encrypted_content,
      createdAt: row.created_at,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
    };
  }
}

export const messageService = new MessageService();
