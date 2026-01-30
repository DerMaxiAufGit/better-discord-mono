import { pool } from '../db/index.js'
import { Group, GroupMember, GroupRole, GroupInvite, GroupBan } from '../db/schema.js'
import crypto from 'crypto'

// Permission definitions
const PERMISSIONS: Record<GroupRole, string[]> = {
  owner: ['all'],
  admin: ['sendMessages', 'deleteMessages', 'addMembers', 'removeMembers', 'banMembers', 'changeGroupSettings'],
  moderator: ['sendMessages', 'deleteMessages', 'addMembers', 'banMembers'],
  member: ['sendMessages']
}

export function hasPermission(role: GroupRole, permission: string): boolean {
  const perms = PERMISSIONS[role]
  return perms.includes('all') || perms.includes(permission)
}

export async function createGroup(ownerId: string, name: string, description?: string): Promise<Group & { role: GroupRole; member_count: number }> {
  const result = await pool.query(
    `INSERT INTO groups (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *`,
    [name, description || null, ownerId]
  )
  const group = result.rows[0]

  // Add owner as member with owner role
  await pool.query(
    `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [group.id, ownerId]
  )

  // Return with role and member_count for frontend compatibility
  return {
    ...group,
    role: 'owner' as GroupRole,
    member_count: 1
  }
}

export async function getGroup(groupId: string, userId: string): Promise<Group | null> {
  // Only return if user is a member
  const result = await pool.query(
    `SELECT g.* FROM groups g
     JOIN group_members gm ON g.id = gm.group_id
     WHERE g.id = $1 AND gm.user_id = $2`,
    [groupId, userId]
  )
  return result.rows[0] || null
}

export async function updateGroup(groupId: string, userId: string, updates: Partial<Pick<Group, 'name' | 'description' | 'avatar_url'>>): Promise<Group | null> {
  const member = await getMember(groupId, userId)
  if (!member || !hasPermission(member.role, 'changeGroupSettings')) {
    return null
  }

  const setClauses: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`)
    values.push(updates.name)
  }
  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`)
    values.push(updates.description)
  }
  if (updates.avatar_url !== undefined) {
    setClauses.push(`avatar_url = $${paramIndex++}`)
    values.push(updates.avatar_url)
  }

  if (setClauses.length === 0) return await getGroup(groupId, userId)

  setClauses.push(`updated_at = NOW()`)
  values.push(groupId)

  const result = await pool.query(
    `UPDATE groups SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  )
  return result.rows[0]
}

export async function deleteGroup(groupId: string, userId: string): Promise<boolean> {
  const group = await getGroup(groupId, userId)
  if (!group || group.owner_id !== userId) return false

  await pool.query(`DELETE FROM groups WHERE id = $1`, [groupId])
  return true
}

export async function getMembers(groupId: string): Promise<(GroupMember & { email: string; username: string | null })[]> {
  const result = await pool.query(
    `SELECT gm.*, u.email, u.username FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = $1
     ORDER BY gm.role, gm.joined_at`,
    [groupId]
  )
  return result.rows
}

export async function getMember(groupId: string, userId: string): Promise<GroupMember | null> {
  const result = await pool.query(
    `SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  )
  return result.rows[0] || null
}

export async function addMember(groupId: string, actorId: string, targetUserId: string, role: GroupRole = 'member'): Promise<boolean> {
  const actor = await getMember(groupId, actorId)
  if (!actor || !hasPermission(actor.role, 'addMembers')) return false

  // Check if user is banned
  const isBanned = await pool.query(
    `SELECT 1 FROM group_bans WHERE group_id = $1 AND user_id = $2`,
    [groupId, targetUserId]
  )
  if (isBanned.rows.length > 0) {
    // Auto-unban when adding back
    await pool.query(`DELETE FROM group_bans WHERE group_id = $1 AND user_id = $2`, [groupId, targetUserId])
  }

  await pool.query(
    `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [groupId, targetUserId, role]
  )
  return true
}

export async function removeMember(groupId: string, actorId: string, targetUserId: string): Promise<boolean> {
  const actor = await getMember(groupId, actorId)
  const target = await getMember(groupId, targetUserId)
  if (!actor || !target) return false

  // Owner cannot be removed
  if (target.role === 'owner') return false

  // Need removeMembers permission or be removing yourself
  if (actorId !== targetUserId && !hasPermission(actor.role, 'removeMembers')) return false

  await pool.query(`DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`, [groupId, targetUserId])
  return true
}

export async function changeRole(groupId: string, actorId: string, targetUserId: string, newRole: GroupRole): Promise<boolean> {
  const actor = await getMember(groupId, actorId)
  if (!actor || actor.role !== 'owner') return false // Only owner can change roles

  // Cannot change owner role
  if (newRole === 'owner') return false

  const target = await getMember(groupId, targetUserId)
  if (!target || target.role === 'owner') return false

  await pool.query(
    `UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3`,
    [newRole, groupId, targetUserId]
  )
  return true
}

export async function banUser(groupId: string, actorId: string, targetUserId: string, reason?: string): Promise<boolean> {
  const actor = await getMember(groupId, actorId)
  if (!actor || !hasPermission(actor.role, 'banMembers')) return false

  const target = await getMember(groupId, targetUserId)
  if (target && (target.role === 'owner' || target.role === 'admin')) return false // Can't ban owner/admin

  // Remove from group if member
  if (target) {
    await pool.query(`DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`, [groupId, targetUserId])
  }

  await pool.query(
    `INSERT INTO group_bans (group_id, user_id, banned_by, reason) VALUES ($1, $2, $3, $4)
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [groupId, targetUserId, actorId, reason || null]
  )
  return true
}

export async function unbanUser(groupId: string, actorId: string, targetUserId: string): Promise<boolean> {
  const actor = await getMember(groupId, actorId)
  if (!actor || !hasPermission(actor.role, 'banMembers')) return false

  await pool.query(`DELETE FROM group_bans WHERE group_id = $1 AND user_id = $2`, [groupId, targetUserId])
  return true
}

export async function createInvite(groupId: string, userId: string, expiresIn?: number, maxUses?: number): Promise<GroupInvite | null> {
  const member = await getMember(groupId, userId)
  if (!member || !hasPermission(member.role, 'addMembers')) return null

  const code = crypto.randomBytes(8).toString('base64url')
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null

  const result = await pool.query(
    `INSERT INTO group_invites (group_id, code, created_by, expires_at, max_uses)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [groupId, code, userId, expiresAt, maxUses || null]
  )
  return result.rows[0]
}

export async function joinViaInvite(code: string, userId: string): Promise<{ success: boolean; groupId?: string; alreadyMember?: boolean; error?: string }> {
  const result = await pool.query(
    `SELECT * FROM group_invites WHERE code = $1`,
    [code]
  )
  const invite = result.rows[0] as GroupInvite | undefined

  if (!invite) return { success: false, error: 'Invalid invite code' }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { success: false, error: 'Invite has expired' }
  }
  if (invite.max_uses && invite.uses >= invite.max_uses) {
    return { success: false, error: 'Invite has reached max uses' }
  }

  // Check if banned
  const isBanned = await pool.query(
    `SELECT 1 FROM group_bans WHERE group_id = $1 AND user_id = $2`,
    [invite.group_id, userId]
  )
  if (isBanned.rows.length > 0) {
    return { success: false, error: 'You are banned from this group' }
  }

  // Check if already member
  const existing = await getMember(invite.group_id, userId)
  if (existing) {
    return { success: true, groupId: invite.group_id, alreadyMember: true } // Already member, just return
  }

  // Add as member
  await pool.query(
    `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')`,
    [invite.group_id, userId]
  )

  // Increment uses
  await pool.query(`UPDATE group_invites SET uses = uses + 1 WHERE id = $1`, [invite.id])

  return { success: true, groupId: invite.group_id, alreadyMember: false }
}

export async function getUserGroups(userId: string): Promise<(Group & { role: GroupRole; member_count: number })[]> {
  const result = await pool.query(
    `SELECT g.*, gm.role,
       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
     FROM groups g
     JOIN group_members gm ON g.id = gm.group_id
     WHERE gm.user_id = $1
     ORDER BY g.updated_at DESC`,
    [userId]
  )
  return result.rows
}
