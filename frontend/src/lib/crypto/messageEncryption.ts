import { initSodium } from './libsodium';

/**
 * Encrypt a message using XChaCha20-Poly1305 authenticated encryption.
 *
 * Format of output:
 * - Base64 encoded: [24-byte nonce][ciphertext + 16-byte auth tag]
 *
 * Security notes:
 * - Uses random nonce (safe with XChaCha20's 192-bit nonce space)
 * - Authenticated encryption prevents tampering
 * - Each message has unique nonce (no nonce reuse risk)
 *
 * @param plaintext - The message to encrypt
 * @param sessionKey - The symmetric session key (from deriveSessionKeys)
 * @returns Base64-encoded encrypted message (nonce + ciphertext)
 */
export async function encryptMessage(
  plaintext: string,
  sessionKey: Uint8Array
): Promise<string> {
  const s = await initSodium();

  console.log('ENCRYPT using key:', Array.from(sessionKey.slice(0, 8)));

  // Generate random nonce (XChaCha20 has 192-bit nonce, safe for random generation)
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const message = s.from_string(plaintext);

  // Encrypt with authenticated encryption (XChaCha20-Poly1305)
  const ciphertext = s.crypto_secretbox_easy(message, nonce, sessionKey);

  // Prepend nonce to ciphertext for decryption
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);

  return s.to_base64(combined);
}

/**
 * Decrypt a message using XChaCha20-Poly1305 authenticated encryption.
 *
 * @param encrypted - Base64-encoded encrypted message (nonce + ciphertext)
 * @param sessionKey - The symmetric session key (from deriveSessionKeys)
 * @returns Decrypted plaintext, or null if decryption/authentication fails
 */
export async function decryptMessage(
  encrypted: string,
  sessionKey: Uint8Array
): Promise<string | null> {
  const s = await initSodium();

  console.log('DECRYPT using key:', Array.from(sessionKey.slice(0, 8)));

  try {
    const data = s.from_base64(encrypted);

    // Extract nonce (first 24 bytes) and ciphertext (rest)
    const nonce = data.slice(0, s.crypto_secretbox_NONCEBYTES);
    const ciphertext = data.slice(s.crypto_secretbox_NONCEBYTES);

    // Decrypt and verify authentication tag
    // Throws if authentication fails (tampered or wrong key)
    const plaintext = s.crypto_secretbox_open_easy(ciphertext, nonce, sessionKey);

    return s.to_string(plaintext);
  } catch (error) {
    // Decryption failed - either wrong key or tampered data
    console.error('Decryption failed:', error);
    return null;
  }
}
