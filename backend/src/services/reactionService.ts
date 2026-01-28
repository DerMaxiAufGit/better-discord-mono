import { pool } from '../db/index.js'
import { Reaction } from '../db/schema.js'

const MAX_UNIQUE_EMOJI_PER_MESSAGE = 50

export interface ReactionWithUser extends Reaction {
  email: string
}

export interface ReactionSummary {
  emoji: string
  count: number
  users: { userId: string; email: string }[]
  userReacted: boolean // whether current user has reacted
}

export async function addReaction(messageId: number, userId: string, emoji: string): Promise<boolean> {
  // Check unique emoji count
  const countResult = await pool.query(
    `SELECT COUNT(DISTINCT emoji) as count FROM reactions WHERE message_id = $1`,
    [messageId]
  )
  const currentCount = parseInt(countResult.rows[0].count)

  // Check if this emoji already exists
  const existingEmoji = await pool.query(
    `SELECT 1 FROM reactions WHERE message_id = $1 AND emoji = $2 LIMIT 1`,
    [messageId, emoji]
  )

  if (existingEmoji.rows.length === 0 && currentCount >= MAX_UNIQUE_EMOJI_PER_MESSAGE) {
    throw new Error(`Maximum ${MAX_UNIQUE_EMOJI_PER_MESSAGE} unique emoji per message`)
  }

  try {
    await pool.query(
      `INSERT INTO reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
      [messageId, userId, emoji]
    )
    return true
  } catch {
    return false
  }
}

export async function removeReaction(messageId: number, userId: string, emoji: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3
     RETURNING id`,
    [messageId, userId, emoji]
  )
  return result.rows.length > 0
}

export async function toggleReaction(messageId: number, userId: string, emoji: string): Promise<{ added: boolean }> {
  // Check if reaction exists
  const existing = await pool.query(
    `SELECT id FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
    [messageId, userId, emoji]
  )

  if (existing.rows.length > 0) {
    await removeReaction(messageId, userId, emoji)
    return { added: false }
  } else {
    await addReaction(messageId, userId, emoji)
    return { added: true }
  }
}

export async function getReactions(messageId: number, currentUserId?: string): Promise<ReactionSummary[]> {
  const result = await pool.query(
    `SELECT r.emoji, r.user_id, u.email
     FROM reactions r
     JOIN users u ON r.user_id = u.id
     WHERE r.message_id = $1
     ORDER BY r.emoji, r.created_at`,
    [messageId]
  )

  // Group by emoji
  const emojiMap = new Map<string, { users: { userId: string; email: string }[] }>()

  for (const row of result.rows) {
    if (!emojiMap.has(row.emoji)) {
      emojiMap.set(row.emoji, { users: [] })
    }
    emojiMap.get(row.emoji)!.users.push({
      userId: row.user_id,
      email: row.email
    })
  }

  // Convert to summary array
  const summaries: ReactionSummary[] = []
  for (const [emoji, data] of emojiMap.entries()) {
    summaries.push({
      emoji,
      count: data.users.length,
      users: data.users,
      userReacted: currentUserId ? data.users.some(u => u.userId === currentUserId) : false
    })
  }

  return summaries
}

export async function getReactionsForMessages(messageIds: number[], currentUserId?: string): Promise<Map<number, ReactionSummary[]>> {
  if (messageIds.length === 0) return new Map()

  const result = await pool.query(
    `SELECT r.message_id, r.emoji, r.user_id, u.email
     FROM reactions r
     JOIN users u ON r.user_id = u.id
     WHERE r.message_id = ANY($1)
     ORDER BY r.message_id, r.emoji, r.created_at`,
    [messageIds]
  )

  // Group by message, then by emoji
  const messageMap = new Map<number, Map<string, { users: { userId: string; email: string }[] }>>()

  for (const row of result.rows) {
    if (!messageMap.has(row.message_id)) {
      messageMap.set(row.message_id, new Map())
    }
    const emojiMap = messageMap.get(row.message_id)!

    if (!emojiMap.has(row.emoji)) {
      emojiMap.set(row.emoji, { users: [] })
    }
    emojiMap.get(row.emoji)!.users.push({
      userId: row.user_id,
      email: row.email
    })
  }

  // Convert to ReactionSummary format
  const resultMap = new Map<number, ReactionSummary[]>()

  for (const [messageId, emojiMap] of messageMap.entries()) {
    const summaries: ReactionSummary[] = []
    for (const [emoji, data] of emojiMap.entries()) {
      summaries.push({
        emoji,
        count: data.users.length,
        users: data.users,
        userReacted: currentUserId ? data.users.some(u => u.userId === currentUserId) : false
      })
    }
    resultMap.set(messageId, summaries)
  }

  return resultMap
}

export async function hasAccessToMessage(messageId: number, userId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM messages m
     LEFT JOIN group_members gm ON m.group_id = gm.group_id AND gm.user_id = $2
     WHERE m.id = $1
       AND (m.sender_id = $2 OR m.recipient_id = $2 OR gm.user_id IS NOT NULL)`,
    [messageId, userId]
  )
  return result.rows.length > 0
}
