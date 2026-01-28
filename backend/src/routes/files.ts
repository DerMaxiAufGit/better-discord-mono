import { FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import * as fileService from '../services/fileService.js'

export default async function fileRoutes(fastify: FastifyInstance) {
  // Register multipart support
  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB
    }
  })

  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate)

  // Upload file
  fastify.post<{ Querystring: { conversationId?: string } }>('/files', async (request, reply) => {
    const data = await request.file()
    if (!data) {
      return reply.code(400).send({ error: 'No file provided' })
    }

    // Read file into buffer
    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Get encryption header from form field
    const encryptionHeaderBase64 = data.fields.encryptionHeader
    if (!encryptionHeaderBase64 || typeof encryptionHeaderBase64 !== 'object' || !('value' in encryptionHeaderBase64)) {
      return reply.code(400).send({ error: 'Missing encryption header' })
    }

    const encryptionHeader = Buffer.from((encryptionHeaderBase64 as any).value, 'base64')

    try {
      const file = await fileService.uploadFile({
        uploaderId: request.user.id,
        conversationId: request.query.conversationId,
        filename: data.filename,
        mimeType: data.mimetype,
        encryptionHeader,
        data: buffer
      })

      return reply.code(201).send({
        id: file.id,
        filename: file.filename,
        mimeType: file.mime_type,
        sizeBytes: file.size_bytes
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      return reply.code(400).send({ error: message })
    }
  })

  // Download file
  fastify.get<{ Params: { fileId: string } }>('/files/:fileId', async (request, reply) => {
    const result = await fileService.getFileStream(request.params.fileId, request.user.id)

    if (!result) {
      return reply.code(404).send({ error: 'File not found' })
    }

    const { stream, file } = result

    // Return encryption header in response header
    reply.header('X-Encryption-Header', file.encryption_header.toString('base64'))
    reply.header('Content-Type', 'application/octet-stream')
    reply.header('Content-Length', file.size_bytes)
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`)

    return reply.send(stream)
  })

  // Get file metadata
  fastify.get<{ Params: { fileId: string } }>('/files/:fileId/meta', async (request, reply) => {
    const file = await fileService.getFile(request.params.fileId, request.user.id)

    if (!file) {
      return reply.code(404).send({ error: 'File not found' })
    }

    return {
      id: file.id,
      filename: file.filename,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      encryptionHeader: file.encryption_header.toString('base64'),
      createdAt: file.created_at
    }
  })

  // Delete file
  fastify.delete<{ Params: { fileId: string } }>('/files/:fileId', async (request, reply) => {
    const success = await fileService.deleteFile(request.params.fileId, request.user.id)

    if (!success) {
      return reply.code(403).send({ error: 'Permission denied or file not found' })
    }

    return reply.code(204).send()
  })

  // Associate file with message (after message is created)
  fastify.patch<{ Params: { fileId: string }; Body: { messageId: number } }>(
    '/files/:fileId',
    async (request, reply) => {
      const success = await fileService.associateFileWithMessage(
        request.params.fileId,
        request.body.messageId,
        request.user.id
      )

      if (!success) {
        return reply.code(400).send({ error: 'Cannot associate file' })
      }

      return { success: true }
    }
  )
}
