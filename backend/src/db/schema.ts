// TypeScript type definitions for database schema
// These types match the PostgreSQL schema defined in postgres/init.sql

export interface User {
  id: string
  email: string
  password_hash: string
  email_verified: boolean
  public_key: string | null
  username: string | null
  created_at: Date
  updated_at: Date
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected'

export interface FriendRequest {
  id: number
  requester_id: string
  addressee_id: string
  status: FriendRequestStatus
  created_at: Date
  updated_at: Date
}

export interface Message {
  id: number
  sender_id: string
  recipient_id: string | null
  encrypted_content: string
  group_id: string | null
  reply_to_id: number | null
  created_at: Date
  delivered_at: Date | null
  read_at: Date | null
}

export interface Group {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  owner_id: string
  created_at: Date
  updated_at: Date
}

export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member'

export interface GroupMember {
  id: number
  group_id: string
  user_id: string
  role: GroupRole
  joined_at: Date
}

export interface GroupInvite {
  id: string
  group_id: string
  code: string
  created_by: string
  expires_at: Date | null
  max_uses: number | null
  uses: number
  created_at: Date
}

export interface GroupBan {
  id: number
  group_id: string
  user_id: string
  banned_by: string
  reason: string | null
  banned_at: Date
}

export interface FileRecord {
  id: string
  conversation_id: string | null
  message_id: number | null
  uploader_id: string
  filename: string
  mime_type: string
  size_bytes: number
  storage_path: string
  encryption_header: Buffer
  created_at: Date
}

export interface Reaction {
  id: number
  message_id: number
  user_id: string
  emoji: string
  created_at: Date
}
