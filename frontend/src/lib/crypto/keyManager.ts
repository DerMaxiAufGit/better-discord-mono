import { initSodium } from './libsodium';

/**
 * Key pair with base64-encoded keys
 */
export interface KeyPair {
  publicKey: string;  // base64 encoded X25519 public key
  privateKey: string; // base64 encoded X25519 private key
}

/**
 * Derive a deterministic X25519 key pair from email + password
 * Uses Argon2id (via crypto_pwhash) with email as salt
 * This ensures the same credentials always produce the same keys
 * @param email - User's email (used as salt)
 * @param password - User's password
 * @returns Base64-encoded public and private keys
 */
export async function deriveKeyPairFromCredentials(email: string, password: string): Promise<KeyPair> {
  const s = await initSodium();

  // Use email as salt - hash to required length (16 bytes for crypto_pwhash)
  // crypto_pwhash_SALTBYTES = 16 for Argon2id
  const SALT_BYTES = 16;
  const emailBytes = s.from_string(email.toLowerCase());
  const salt = s.crypto_generichash(SALT_BYTES, emailBytes, null);

  // Derive a 32-byte seed from password using Argon2id
  // Using MODERATE settings for balance of security and performance
  // Constants: SEEDBYTES=32, OPSLIMIT_MODERATE=3, MEMLIMIT_MODERATE=268435456, ALG_ARGON2ID13=2
  const seed = s.crypto_pwhash(
    32, // crypto_kx_SEEDBYTES
    password,
    salt,
    3,  // crypto_pwhash_OPSLIMIT_MODERATE
    268435456, // crypto_pwhash_MEMLIMIT_MODERATE (256 MB)
    2   // crypto_pwhash_ALG_ARGON2ID13
  );

  // Generate deterministic keypair from seed
  const keyPair = s.crypto_kx_seed_keypair(seed);

  // Clear sensitive data from memory
  s.memzero(seed);

  return {
    publicKey: s.to_base64(keyPair.publicKey),
    privateKey: s.to_base64(keyPair.privateKey),
  };
}

