import { initSodium } from './libsodium'

const CHUNK_SIZE = 64 * 1024 // 64KB chunks

export interface EncryptedFileResult {
  header: Uint8Array
  key: Uint8Array
  encryptedData: Uint8Array
}

/**
 * Encrypt a file using SecretStream (XChaCha20-Poly1305 streaming).
 * Returns header, key, and encrypted data.
 */
export async function encryptFile(file: File): Promise<EncryptedFileResult> {
  const sodium = await initSodium()

  // Generate encryption key
  const key = sodium.randombytes_buf(sodium.crypto_secretstream_xchacha20poly1305_KEYBYTES)

  // Initialize push state
  const { state, header } = sodium.crypto_secretstream_xchacha20poly1305_init_push(key)

  const fileBuffer = await file.arrayBuffer()
  const fileData = new Uint8Array(fileBuffer)

  const encryptedChunks: Uint8Array[] = []

  // Process in chunks
  for (let offset = 0; offset < fileData.length; offset += CHUNK_SIZE) {
    const chunk = fileData.slice(offset, Math.min(offset + CHUNK_SIZE, fileData.length))
    const isLastChunk = offset + CHUNK_SIZE >= fileData.length

    const tag = isLastChunk
      ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
      : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE

    const encryptedChunk = sodium.crypto_secretstream_xchacha20poly1305_push(
      state,
      chunk,
      null,
      tag
    )

    encryptedChunks.push(encryptedChunk)
  }

  // Combine encrypted chunks
  const totalLength = encryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const encryptedData = new Uint8Array(totalLength)
  let position = 0
  for (const chunk of encryptedChunks) {
    encryptedData.set(chunk, position)
    position += chunk.length
  }

  return { header, key, encryptedData }
}

/**
 * Decrypt a file using SecretStream.
 */
export async function decryptFile(
  header: Uint8Array,
  key: Uint8Array,
  encryptedData: Uint8Array
): Promise<Uint8Array> {
  const sodium = await initSodium()

  // Initialize pull state
  const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, key)

  const decryptedChunks: Uint8Array[] = []

  // Encrypted chunk size = plaintext + ABYTES
  const encryptedChunkSize = CHUNK_SIZE + sodium.crypto_secretstream_xchacha20poly1305_ABYTES

  for (let offset = 0; offset < encryptedData.length; offset += encryptedChunkSize) {
    const chunk = encryptedData.slice(offset, Math.min(offset + encryptedChunkSize, encryptedData.length))

    const result = sodium.crypto_secretstream_xchacha20poly1305_pull(state, chunk, null)

    if (!result) {
      throw new Error('Decryption failed - authentication error')
    }

    decryptedChunks.push(result.message)

    if (result.tag === sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL) {
      break
    }
  }

  // Combine decrypted chunks
  const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const decryptedData = new Uint8Array(totalLength)
  let position = 0
  for (const chunk of decryptedChunks) {
    decryptedData.set(chunk, position)
    position += chunk.length
  }

  return decryptedData
}

/**
 * Encrypt the file key for a specific recipient using their session key.
 */
export async function encryptFileKey(fileKey: Uint8Array, sessionKey: Uint8Array): Promise<string> {
  const sodium = await initSodium()

  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const encrypted = sodium.crypto_secretbox_easy(fileKey, nonce, sessionKey)

  // Combine nonce + encrypted
  const combined = new Uint8Array(nonce.length + encrypted.length)
  combined.set(nonce)
  combined.set(encrypted, nonce.length)

  return sodium.to_base64(combined)
}

/**
 * Decrypt the file key using session key.
 */
export async function decryptFileKey(encryptedKey: string, sessionKey: Uint8Array): Promise<Uint8Array> {
  const sodium = await initSodium()

  const combined = sodium.from_base64(encryptedKey)
  const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES)
  const encrypted = combined.slice(sodium.crypto_secretbox_NONCEBYTES)

  const decrypted = sodium.crypto_secretbox_open_easy(encrypted, nonce, sessionKey)

  if (!decrypted) {
    throw new Error('Failed to decrypt file key')
  }

  return decrypted
}
