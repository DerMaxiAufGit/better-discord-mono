import { FastifyInstance } from 'fastify'
import * as groupService from '../services/groupService.js'
import { messageService } from '../services/messageService.js'
import { broadcastToUsers } from './websocket.js'
import { pool } from '../db/index.js'

export default async function groupRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate)

  // Create group
  fastify.post<{ Body: { name: string; description?: string } }>('/groups', async (request, reply) => {
    const userId = (request.user as { userId: string }).userId
    const { name, description } = request.body
    if (!name || name.length < 1 || name.length > 100) {
      return reply.code(400).send({ error: 'Name must be 1-100 characters' })
    }

    const group = await groupService.createGroup(userId, name, description)
    return reply.code(201).send(group)
  })

  // Get user's groups
  fastify.get('/groups', async (request) => {
    const userId = (request.user as { userId: string }).userId
    return groupService.getUserGroups(userId)
  })

  // Get single group
  fastify.get<{ Params: { groupId: string } }>('/groups/:groupId', async (request, reply) => {
    const group = await groupService.getGroup(request.params.groupId, (request.user as { userId: string }).userId)
    if (!group) return reply.code(404).send({ error: 'Group not found' })
    return group
  })

  // Update group
  fastify.patch<{ Params: { groupId: string }; Body: { name?: string; description?: string; avatar_url?: string } }>(
    '/groups/:groupId',
    async (request, reply) => {
      const updated = await groupService.updateGroup(request.params.groupId, (request.user as { userId: string }).userId, request.body)
      if (!updated) return reply.code(403).send({ error: 'Permission denied or group not found' })
      return updated
    }
  )

  // Delete group
  fastify.delete<{ Params: { groupId: string } }>('/groups/:groupId', async (request, reply) => {
    const success = await groupService.deleteGroup(request.params.groupId, (request.user as { userId: string }).userId)
    if (!success) return reply.code(403).send({ error: 'Only owner can delete group' })
    return reply.code(204).send()
  })

  // Get group members
  fastify.get<{ Params: { groupId: string } }>('/groups/:groupId/members', async (request, reply) => {
    const group = await groupService.getGroup(request.params.groupId, (request.user as { userId: string }).userId)
    if (!group) return reply.code(404).send({ error: 'Group not found' })
    return groupService.getMembers(request.params.groupId)
  })

  // Add member
  fastify.post<{ Params: { groupId: string }; Body: { userId: string; role?: string } }>(
    '/groups/:groupId/members',
    async (request, reply) => {
      const role = (request.body.role || 'member') as 'admin' | 'moderator' | 'member'
      const success = await groupService.addMember(request.params.groupId, (request.user as { userId: string }).userId, request.body.userId, role)
      if (!success) return reply.code(403).send({ error: 'Permission denied' })
      return reply.code(201).send({ success: true })
    }
  )

  // Remove member
  fastify.delete<{ Params: { groupId: string; userId: string } }>(
    '/groups/:groupId/members/:userId',
    async (request, reply) => {
      const success = await groupService.removeMember(request.params.groupId, (request.user as { userId: string }).userId, request.params.userId)
      if (!success) return reply.code(403).send({ error: 'Permission denied' })
      return reply.code(204).send()
    }
  )

  // Change member role
  fastify.patch<{ Params: { groupId: string; userId: string }; Body: { role: string } }>(
    '/groups/:groupId/members/:userId',
    async (request, reply) => {
      const role = request.body.role as 'admin' | 'moderator' | 'member'
      const success = await groupService.changeRole(request.params.groupId, (request.user as { userId: string }).userId, request.params.userId, role)
      if (!success) return reply.code(403).send({ error: 'Only owner can change roles' })
      return { success: true }
    }
  )

  // Ban user
  fastify.post<{ Params: { groupId: string }; Body: { userId: string; reason?: string } }>(
    '/groups/:groupId/bans',
    async (request, reply) => {
      const success = await groupService.banUser(
        request.params.groupId,
        (request.user as { userId: string }).userId,
        request.body.userId,
        request.body.reason
      )
      if (!success) return reply.code(403).send({ error: 'Permission denied' })
      return reply.code(201).send({ success: true })
    }
  )

  // Unban user
  fastify.delete<{ Params: { groupId: string; userId: string } }>(
    '/groups/:groupId/bans/:userId',
    async (request, reply) => {
      const success = await groupService.unbanUser(request.params.groupId, (request.user as { userId: string }).userId, request.params.userId)
      if (!success) return reply.code(403).send({ error: 'Permission denied' })
      return reply.code(204).send()
    }
  )

  // Create invite
  fastify.post<{ Params: { groupId: string }; Body: { expiresIn?: number; maxUses?: number } }>(
    '/groups/:groupId/invites',
    async (request, reply) => {
      const invite = await groupService.createInvite(
        request.params.groupId,
        (request.user as { userId: string }).userId,
        request.body.expiresIn,
        request.body.maxUses
      )
      if (!invite) return reply.code(403).send({ error: 'Permission denied' })
      return reply.code(201).send(invite)
    }
  )

  // Join via invite
  fastify.post<{ Body: { code: string } }>('/groups/join', async (request, reply) => {
    const userId = (request.user as { userId: string }).userId
    const result = await groupService.joinViaInvite(request.body.code, userId)
    if (!result.success) return reply.code(400).send({ error: result.error })

    // Broadcast to all group members (including the new member) that someone joined
    if (result.groupId && !result.alreadyMember) {
      try {
        // Get user info for the broadcast
        const userResult = await pool.query(
          `SELECT email FROM users WHERE id = $1`,
          [userId]
        )
        const userEmail = userResult.rows[0]?.email || ''

        // Get group info
        const groupResult = await pool.query(
          `SELECT id, name FROM groups WHERE id = $1`,
          [result.groupId]
        )
        const group = groupResult.rows[0]

        // Get all member IDs
        const memberIds = await messageService.getGroupMemberIds(result.groupId)

        // Broadcast to all members
        broadcastToUsers(memberIds, {
          type: 'group-member-joined',
          groupId: result.groupId,
          groupName: group?.name,
          userId,
          userEmail,
        })
      } catch (err) {
        // Don't fail the join if broadcast fails
        fastify.log.error(err, 'Failed to broadcast group join')
      }
    }

    return { groupId: result.groupId }
  })

  // Get group message history
  fastify.get<{ Params: { groupId: string }; Querystring: { limit?: string; beforeId?: string } }>(
    '/groups/:groupId/messages',
    async (request, reply) => {
      const userId = (request.user as { userId: string }).userId
      const limit = request.query.limit ? parseInt(request.query.limit) : 50
      const beforeId = request.query.beforeId ? parseInt(request.query.beforeId) : undefined

      try {
        const result = await messageService.getGroupHistory(request.params.groupId, userId, limit, beforeId)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get messages'
        return reply.code(403).send({ error: message })
      }
    }
  )
}
