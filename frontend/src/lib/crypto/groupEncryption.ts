import { useCryptoStore } from '@/stores/cryptoStore'
import { encryptMessage, decryptMessage } from './messageEncryption'
import type { GroupMember } from '@/stores/groupStore'

export interface EncryptedGroupMessage {
  recipientId: string
  encryptedContent: string // base64
}

/**
 * Encrypt a message for all group members using pairwise encryption.
 * Each member gets the message encrypted with their specific session key.
 *
 * This implements the pairwise encryption pattern:
 * - Each message is encrypted individually for each recipient
 * - Reuses existing X25519 session key derivation from Phase 2
 * - No shared group key (simpler, more secure for groups up to 200)
 * - Members without public keys are gracefully skipped
 *
 * @param plaintext - The message to encrypt
 * @param members - Array of group members
 * @param currentUserId - ID of the user sending the message
 * @returns Array of encrypted messages, one per recipient (excluding self)
 */
export async function encryptGroupMessage(
  plaintext: string,
  members: GroupMember[],
  currentUserId: string
): Promise<EncryptedGroupMessage[]> {
  const cryptoStore = useCryptoStore.getState()
  const encrypted: EncryptedGroupMessage[] = []

  for (const member of members) {
    // Skip self
    if (member.user_id === currentUserId) continue

    // Skip members without public keys
    if (!member.public_key) {
      console.warn(`Skipping member ${member.user_id} - no public key`)
      continue
    }

    try {
      // Get or derive session keys for this member
      const sessionKeys = await cryptoStore.getOrDeriveSessionKeys(
        currentUserId,
        member.user_id,
        member.public_key
      )

      // Encrypt message with session key
      const encryptedContent = await encryptMessage(plaintext, sessionKeys.tx)

      encrypted.push({
        recipientId: member.user_id,
        encryptedContent
      })
    } catch (err) {
      console.error(`Failed to encrypt for member ${member.user_id}:`, err)
    }
  }

  return encrypted
}

/**
 * Decrypt a group message from a specific sender.
 * Uses existing pairwise session keys.
 *
 * @param encryptedContent - Base64-encoded encrypted message
 * @param senderId - ID of the user who sent the message
 * @param senderPublicKey - Public key of the sender
 * @param currentUserId - ID of the current user
 * @returns Decrypted plaintext, or null if decryption fails
 */
export async function decryptGroupMessage(
  encryptedContent: string,
  senderId: string,
  senderPublicKey: string,
  currentUserId: string
): Promise<string | null> {
  const cryptoStore = useCryptoStore.getState()

  try {
    const sessionKeys = await cryptoStore.getOrDeriveSessionKeys(
      currentUserId,
      senderId,
      senderPublicKey
    )

    return await decryptMessage(encryptedContent, sessionKeys.rx)
  } catch (err) {
    console.error(`Failed to decrypt group message from ${senderId}:`, err)
    return null
  }
}

/**
 * Prepare public keys map from group members for key exchange.
 * Useful for batch operations or pre-warming session key cache.
 *
 * @param members - Array of group members
 * @returns Map of userId -> publicKey for members with keys
 */
export function getMemberPublicKeys(members: GroupMember[]): Map<string, string> {
  const keys = new Map<string, string>()

  for (const member of members) {
    if (member.public_key) {
      keys.set(member.user_id, member.public_key)
    }
  }

  return keys
}
