import { query, pool } from '../db/index.js';
import { Message } from '../types/index.js';
import { getReactionsForMessages, ReactionSummary } from './reactionService.js';
import { associateFileWithMessage, getFilesByMessage } from './fileService.js';
import * as groupService from './groupService.js';

interface FileAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  encryptionHeader: string; // base64
}

class MessageService {
  // Save encrypted message to database
  async saveMessage(
    senderId: string,
    recipientId: string,
    encryptedContent: string,
    fileIds?: string[],
    replyToId?: number
  ): Promise<Message> {
    const result = await query(
      `INSERT INTO messages (sender_id, recipient_id, encrypted_content, reply_to_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sender_id, recipient_id, encrypted_content, created_at, delivered_at, read_at, reply_to_id`,
      [senderId, recipientId, encryptedContent, replyToId || null]
    );
    const message = this.mapRow(result.rows[0]);

    // Associate files with message if provided
    if (fileIds && fileIds.length > 0) {
      for (const fileId of fileIds) {
        try {
          await associateFileWithMessage(fileId, message.id, senderId);
        } catch (err) {
          console.error(`Failed to associate file ${fileId} with message ${message.id}:`, err);
        }
      }
    }

    return message;
  }

  // Get message history between two users (paginated)
  async getHistory(
    userId: string,
    contactId: string,
    limit: number = 50,
    beforeId?: number
  ): Promise<{ messages: (Message & { reactions?: ReactionSummary[]; files?: FileAttachment[] })[]; hasMore: boolean }> {
    let queryText = `
      SELECT id, sender_id, recipient_id, encrypted_content, created_at, delivered_at, read_at, reply_to_id
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

    // Add reactions to messages
    const messageIds = messages.map(m => m.id);
    const reactionsMap = await getReactionsForMessages(messageIds, userId);

    // Add files to messages
    const messagesWithExtras = await Promise.all(messages.map(async (msg) => {
      const files = await getFilesByMessage(msg.id);
      const fileAttachments: FileAttachment[] = files.map(f => ({
        id: f.id,
        filename: f.filename,
        mimeType: f.mime_type,
        sizeBytes: f.size_bytes,
        encryptionHeader: f.encryption_header.toString('base64')
      }));
      return {
        ...msg,
        reactions: reactionsMap.get(msg.id) || [],
        files: fileAttachments.length > 0 ? fileAttachments : undefined
      };
    }));

    return { messages: messagesWithExtras.reverse(), hasMore }; // Return in chronological order
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

  // Save group message
  async saveGroupMessage(
    senderId: string,
    groupId: string,
    encryptedContent: string,
    fileIds?: string[]
  ): Promise<Message & { groupId: string }> {
    // Verify sender is a member
    const member = await groupService.getMember(groupId, senderId);
    if (!member) {
      throw new Error('Not a member of this group');
    }

    const result = await query(
      `INSERT INTO messages (sender_id, group_id, encrypted_content)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, recipient_id, group_id, encrypted_content, created_at, delivered_at, read_at`,
      [senderId, groupId, encryptedContent]
    );
    const message = this.mapRowWithGroup(result.rows[0]);

    // Associate files with message if provided
    if (fileIds && fileIds.length > 0) {
      for (const fileId of fileIds) {
        try {
          await associateFileWithMessage(fileId, message.id, senderId);
        } catch (err) {
          console.error(`Failed to associate file ${fileId} with message ${message.id}:`, err);
        }
      }
    }

    return message;
  }

  // Get group message history
  async getGroupHistory(
    groupId: string,
    userId: string,
    limit: number = 50,
    beforeId?: number
  ): Promise<{ messages: (Message & { groupId: string; senderEmail?: string; reactions?: ReactionSummary[]; files?: FileAttachment[] })[]; hasMore: boolean }> {
    // Verify user is a member
    const member = await groupService.getMember(groupId, userId);
    if (!member) {
      throw new Error('Not a member of this group');
    }

    let queryText = `
      SELECT m.id, m.sender_id, m.recipient_id, m.group_id, m.encrypted_content, m.created_at, m.delivered_at, m.read_at,
             u.email as sender_email
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.group_id = $1
    `;
    const params: (string | number)[] = [groupId];

    if (beforeId) {
      queryText += ' AND m.id < $2';
      params.push(beforeId);
    }

    queryText += ' ORDER BY m.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit + 1);

    const result = await query(queryText, params);
    const hasMore = result.rows.length > limit;
    const messages = result.rows.slice(0, limit).map((row: any) => ({
      ...this.mapRowWithGroup(row),
      senderEmail: row.sender_email
    }));

    // Add reactions and files to messages
    const messageIds = messages.map(m => m.id);
    const reactionsMap = await getReactionsForMessages(messageIds, userId);

    const messagesWithExtras = await Promise.all(messages.map(async (msg) => {
      const files = await getFilesByMessage(msg.id);
      const fileAttachments: FileAttachment[] = files.map(f => ({
        id: f.id,
        filename: f.filename,
        mimeType: f.mime_type,
        sizeBytes: f.size_bytes,
        encryptionHeader: f.encryption_header.toString('base64')
      }));
      return {
        ...msg,
        reactions: reactionsMap.get(msg.id) || [],
        files: fileAttachments.length > 0 ? fileAttachments : undefined
      };
    }));

    return { messages: messagesWithExtras.reverse(), hasMore };
  }

  // Get all members of a group (for broadcasting)
  async getGroupMemberIds(groupId: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT user_id FROM group_members WHERE group_id = $1`,
      [groupId]
    );
    return result.rows.map((row: any) => row.user_id);
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
      replyToId: row.reply_to_id || undefined,
    };
  }

  private mapRowWithGroup(row: any): Message & { groupId: string } {
    return {
      id: row.id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      groupId: row.group_id,
      encryptedContent: row.encrypted_content,
      createdAt: row.created_at,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
    };
  }
}

export const messageService = new MessageService();
