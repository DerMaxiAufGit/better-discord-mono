import { encryptFile, decryptFile } from '@/lib/crypto/fileEncryption'
import { useFileStore } from '@/stores/fileStore'
import { useAuthStore } from '@/stores/auth'

const API_BASE = '/api'

interface UploadResult {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
}

/**
 * Encrypt and upload a file to the server.
 */
export async function uploadFile(
  file: File,
  conversationId?: string
): Promise<UploadResult> {
  const fileStore = useFileStore.getState()
  const token = useAuthStore.getState().accessToken

  const tempId = fileStore.startUpload(file)

  try {
    // Encrypt file
    fileStore.updateUploadStatus(tempId, 'encrypting', 10)
    const { header, key, encryptedData } = await encryptFile(file)
    fileStore.updateUploadStatus(tempId, 'encrypting', 50)

    // Combine key + header for storage (temporary solution until proper key management)
    const combinedHeader = new Uint8Array(key.length + header.length)
    combinedHeader.set(key)
    combinedHeader.set(header, key.length)

    // Prepare form data
    const formData = new FormData()
    // Convert to regular Uint8Array to avoid ArrayBufferLike type issues
    const regularArray = new Uint8Array(encryptedData)
    const blob = new Blob([regularArray])
    formData.append('file', blob, file.name)
    formData.append('encryptionHeader', btoa(String.fromCharCode(...combinedHeader)))

    // Upload
    fileStore.updateUploadStatus(tempId, 'uploading', 60)

    const url = conversationId
      ? `${API_BASE}/files?conversationId=${conversationId}`
      : `${API_BASE}/files`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    const result: UploadResult = await response.json()

    fileStore.completeUpload(tempId, result.id)

    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    fileStore.failUpload(tempId, message)
    throw err
  }
}

/**
 * Download and decrypt a file from the server.
 */
export async function downloadFile(fileId: string, filename: string): Promise<Blob> {
  const fileStore = useFileStore.getState()
  const token = useAuthStore.getState().accessToken

  fileStore.startDownload(fileId, filename)

  try {
    // Fetch file
    fileStore.updateDownloadStatus(fileId, 'downloading', 20)

    const response = await fetch(`${API_BASE}/files/${fileId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Download failed')
    }

    // Get encryption header from response
    const headerBase64 = response.headers.get('X-Encryption-Header')
    if (!headerBase64) {
      throw new Error('Missing encryption header')
    }

    // Extract combined header (key + header)
    const combinedHeader = Uint8Array.from(atob(headerBase64), c => c.charCodeAt(0))

    // Key is 32 bytes (crypto_secretstream_xchacha20poly1305_KEYBYTES)
    const KEY_BYTES = 32
    const key = combinedHeader.slice(0, KEY_BYTES)
    const header = combinedHeader.slice(KEY_BYTES)

    const encryptedData = new Uint8Array(await response.arrayBuffer())

    fileStore.updateDownloadStatus(fileId, 'downloading', 60)

    // Decrypt file
    fileStore.updateDownloadStatus(fileId, 'decrypting', 70)

    const decryptedData = await decryptFile(header, key, encryptedData)

    // Convert to regular Uint8Array for Blob compatibility
    const regularArray = new Uint8Array(decryptedData)
    const blob = new Blob([regularArray])

    fileStore.completeDownload(fileId, blob)

    return blob
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Download failed'
    fileStore.failDownload(fileId, message)
    throw err
  }
}

/**
 * Trigger browser download for a blob.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Get file metadata from server.
 */
export async function getFileMeta(fileId: string): Promise<{
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  encryptionHeader: string
}> {
  const token = useAuthStore.getState().accessToken

  const response = await fetch(`${API_BASE}/files/${fileId}/meta`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to get file metadata')
  }

  return response.json()
}
