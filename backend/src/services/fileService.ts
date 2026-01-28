import { pool } from '../db/index.js'
import { FileRecord } from '../db/schema.js'
import path from 'path'
import fs from 'fs/promises'
import { createReadStream, ReadStream } from 'fs'
import crypto from 'crypto'

// Storage directory - configurable via env
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads'
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  } catch (err) {
    console.error('Failed to create upload directory:', err)
  }
}

// Generate unique storage path
function generateStoragePath(originalFilename: string): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const uuid = crypto.randomUUID()
  const ext = path.extname(originalFilename)

  return path.join(year.toString(), month, day, `${uuid}${ext}`)
}

export interface UploadFileParams {
  uploaderId: string
  conversationId?: string // group_id or null for DM context
  messageId?: number
  filename: string
  mimeType: string
  encryptionHeader: Buffer
  data: Buffer
}

export async function uploadFile(params: UploadFileParams): Promise<FileRecord> {
  const { uploaderId, conversationId, messageId, filename, mimeType, encryptionHeader, data } = params

  if (data.length > MAX_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE} bytes`)
  }

  const storagePath = generateStoragePath(filename)
  const fullPath = path.join(UPLOAD_DIR, storagePath)

  // Ensure directory exists
  await fs.mkdir(path.dirname(fullPath), { recursive: true })

  // Write encrypted data to disk
  await fs.writeFile(fullPath, data)

  // Store metadata in database
  const result = await pool.query(
    `INSERT INTO files (conversation_id, message_id, uploader_id, filename, mime_type, size_bytes, storage_path, encryption_header)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [conversationId || null, messageId || null, uploaderId, filename, mimeType, data.length, storagePath, encryptionHeader]
  )

  return result.rows[0]
}

export async function getFile(fileId: string, userId: string): Promise<FileRecord | null> {
  // Get file with authorization check
  // User can access if:
  // 1. They uploaded it
  // 2. They are recipient of the message
  // 3. They are member of the group
  const result = await pool.query(
    `SELECT f.* FROM files f
     LEFT JOIN messages m ON f.message_id = m.id
     LEFT JOIN group_members gm ON f.conversation_id = gm.group_id AND gm.user_id = $2
     WHERE f.id = $1
       AND (
         f.uploader_id = $2
         OR m.recipient_id = $2
         OR m.sender_id = $2
         OR gm.user_id IS NOT NULL
       )`,
    [fileId, userId]
  )

  return result.rows[0] || null
}

export async function getFileStream(fileId: string, userId: string): Promise<{ stream: ReadStream; file: FileRecord } | null> {
  const file = await getFile(fileId, userId)
  if (!file) return null

  const fullPath = path.join(UPLOAD_DIR, file.storage_path)

  try {
    await fs.access(fullPath)
    const stream = createReadStream(fullPath)
    return { stream, file }
  } catch {
    return null
  }
}

export async function deleteFile(fileId: string, userId: string): Promise<boolean> {
  const file = await getFile(fileId, userId)
  if (!file) return false

  // Only uploader can delete
  if (file.uploader_id !== userId) return false

  const fullPath = path.join(UPLOAD_DIR, file.storage_path)

  try {
    await fs.unlink(fullPath)
  } catch {
    // File might already be deleted from disk
  }

  await pool.query(`DELETE FROM files WHERE id = $1`, [fileId])
  return true
}

export async function getFilesByMessage(messageId: number): Promise<FileRecord[]> {
  const result = await pool.query(
    `SELECT * FROM files WHERE message_id = $1 ORDER BY created_at`,
    [messageId]
  )
  return result.rows
}

export async function associateFileWithMessage(fileId: string, messageId: number, userId: string): Promise<boolean> {
  // Verify user owns the file and it's not already associated
  const result = await pool.query(
    `UPDATE files SET message_id = $1
     WHERE id = $2 AND uploader_id = $3 AND message_id IS NULL
     RETURNING id`,
    [messageId, fileId, userId]
  )
  return result.rows.length > 0
}

// Initialize upload directory on module load
ensureUploadDir()
