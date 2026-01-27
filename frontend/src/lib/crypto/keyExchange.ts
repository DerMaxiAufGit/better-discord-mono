import { initSodium } from './libsodium';

/**
 * Session keys for bidirectional encrypted communication
 */
export interface SessionKeys {
  rx: Uint8Array; // Receive key (decrypt incoming messages)
  tx: Uint8Array; // Transmit key (encrypt outgoing messages)
}

/**
 * Derive symmetric session keys from asymmetric key pairs using X25519.
 * Uses libsodium's key exchange (crypto_kx) which provides:
 * - Forward secrecy through ephemeral session keys
 * - Bidirectional keys (different keys for send/receive)
 *
 * @param myPublicKey - Our base64-encoded public key
 * @param myPrivateKey - Our base64-encoded private key
 * @param peerPublicKey - Peer's base64-encoded public key
 * @param isInitiator - true if we initiated the conversation (client role)
 * @returns Session keys for sending (tx) and receiving (rx)
 *
 * NOTE: To determine isInitiator, compare user IDs lexicographically.
 * The user with the lower ID should be the initiator (client).
 */
export async function deriveSessionKeys(
  myPublicKey: string,
  myPrivateKey: string,
  peerPublicKey: string,
  isInitiator: boolean
): Promise<SessionKeys> {
  const s = await initSodium();

  const myPub = s.from_base64(myPublicKey);
  const myPriv = s.from_base64(myPrivateKey);
  const peerPub = s.from_base64(peerPublicKey);

  // Client (initiator) and server (responder) derive different key directions
  // This ensures both parties derive the same shared keys but with
  // opposite tx/rx assignments
  const keys = isInitiator
    ? s.crypto_kx_client_session_keys(myPub, myPriv, peerPub)
    : s.crypto_kx_server_session_keys(myPub, myPriv, peerPub);

  return {
    rx: keys.sharedRx,
    tx: keys.sharedTx,
  };
}

/**
 * Helper to determine initiator role based on user IDs.
 * Lower user ID (lexicographically) is the initiator.
 *
 * @param myUserId - Our user ID
 * @param peerUserId - Peer's user ID
 * @returns true if we should be the initiator
 */
export function isConversationInitiator(myUserId: string, peerUserId: string): boolean {
  return myUserId < peerUserId;
}
