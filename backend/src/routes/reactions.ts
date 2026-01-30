import { FastifyInstance } from 'fastify'
import * as reactionService from '../services/reactionService.js'
import { activeConnections } from './websocket.js'
import { pool } from '../db/index.js'

// Get message participants for broadcasting
async function getMessageParticipants(messageId: number): Promise<string[]> {
  const result = await pool.query(
    `SELECT sender_id, recipient_id FROM messages WHERE id = $1`,
    [messageId]
  )
  if (result.rows.length === 0) return []
  const { sender_id, recipient_id } = result.rows[0]
  return [sender_id, recipient_id].filter(Boolean)
}

// Broadcast reaction update to participants
function broadcastReactionUpdate(
  messageId: number,
  emoji: string,
  userId: string,
  userEmail: string,
  added: boolean,
  participants: string[]
) {
  const message = JSON.stringify({
    type: 'reaction',
    messageId,
    emoji,
    userId,
    userEmail,
    added
  })

  for (const participantId of participants) {
    const socket = activeConnections.get(participantId)
    if (socket && socket.readyState === 1) {
      socket.send(message)
    }
  }
}

export default async function reactionRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate)

  // Toggle reaction (add if not exists, remove if exists)
  fastify.post<{ Params: { messageId: string }; Body: { emoji: string } }>(
    '/messages/:messageId/reactions',
    async (request, reply) => {
      const messageId = parseInt(request.params.messageId)
      const { emoji } = request.body

      if (!emoji || emoji.length > 32) {
        return reply.code(400).send({ error: 'Invalid emoji' })
      }

      const userId = (request.user as { userId: string }).userId

      // Check access
      const hasAccess = await reactionService.hasAccessToMessage(messageId, userId)
      if (!hasAccess) {
        return reply.code(404).send({ error: 'Message not found' })
      }

      try {
        const result = await reactionService.toggleReaction(messageId, userId, emoji)

        // Get user email for broadcast
        const userResult = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId])
        const userEmail = userResult.rows[0]?.email || ''

        // Broadcast to participants
        const participants = await getMessageParticipants(messageId)
        broadcastReactionUpdate(messageId, emoji, userId, userEmail, result.added, participants)

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add reaction'
        return reply.code(400).send({ error: message })
      }
    }
  )

  // Get reactions for a message
  fastify.get<{ Params: { messageId: string } }>(
    '/messages/:messageId/reactions',
    async (request, reply) => {
      const messageId = parseInt(request.params.messageId)
      const userId = (request.user as { userId: string }).userId

      // Check access
      const hasAccess = await reactionService.hasAccessToMessage(messageId, userId)
      if (!hasAccess) {
        return reply.code(404).send({ error: 'Message not found' })
      }

      return reactionService.getReactions(messageId, userId)
    }
  )

  // Remove specific reaction
  fastify.delete<{ Params: { messageId: string }; Querystring: { emoji: string } }>(
    '/messages/:messageId/reactions',
    async (request, reply) => {
      const messageId = parseInt(request.params.messageId)
      const { emoji } = request.query

      if (!emoji) {
        return reply.code(400).send({ error: 'Emoji required' })
      }

      const userId = (request.user as { userId: string }).userId

      // Check access
      const hasAccess = await reactionService.hasAccessToMessage(messageId, userId)
      if (!hasAccess) {
        return reply.code(404).send({ error: 'Message not found' })
      }

      await reactionService.removeReaction(messageId, userId, emoji)
      return reply.code(204).send()
    }
  )
}
