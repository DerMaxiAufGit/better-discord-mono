import { FastifyInstance } from 'fastify'
import * as reactionService from '../services/reactionService.js'

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

      // Check access
      const hasAccess = await reactionService.hasAccessToMessage(messageId, request.user.id)
      if (!hasAccess) {
        return reply.code(404).send({ error: 'Message not found' })
      }

      try {
        const result = await reactionService.toggleReaction(messageId, request.user.id, emoji)
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

      // Check access
      const hasAccess = await reactionService.hasAccessToMessage(messageId, request.user.id)
      if (!hasAccess) {
        return reply.code(404).send({ error: 'Message not found' })
      }

      return reactionService.getReactions(messageId, request.user.id)
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

      // Check access
      const hasAccess = await reactionService.hasAccessToMessage(messageId, request.user.id)
      if (!hasAccess) {
        return reply.code(404).send({ error: 'Message not found' })
      }

      await reactionService.removeReaction(messageId, request.user.id, emoji)
      return reply.code(204).send()
    }
  )
}
