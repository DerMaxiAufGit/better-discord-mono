import { initSodium } from './libsodium';

/**
 * Key pair with base64-encoded keys
 */
export interface KeyPair {
  publicKey: string;  // base64 encoded X25519 public key
  privateKey: string; // base64 encoded X25519 private key
}

const DB_NAME = 'crypto-keys';
const DB_VERSION = 1;
const STORE_NAME = 'keypairs';

/**
 * Open the IndexedDB key store
 */
async function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Generate a new X25519 key pair for asymmetric encryption
 * @returns Base64-encoded public and private keys
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const s = await initSodium();
  const keyPair = s.crypto_box_keypair();

  return {
    publicKey: s.to_base64(keyPair.publicKey),
    privateKey: s.to_base64(keyPair.privateKey),
  };
}

/**
 * Store a key pair in IndexedDB
 * @param userId - User ID to associate with the key pair
 * @param keyPair - The key pair to store
 */
export async function storeKeyPair(userId: string, keyPair: KeyPair): Promise<void> {
  const db = await openKeyStore();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(keyPair, userId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Retrieve a key pair from IndexedDB
 * @param userId - User ID to look up
 * @returns The key pair if found, null otherwise
 */
export async function getKeyPair(userId: string): Promise<KeyPair | null> {
  const db = await openKeyStore();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(userId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Check if keys exist for a user
 * @param userId - User ID to check
 * @returns true if keys exist, false otherwise
 */
export async function hasStoredKeys(userId: string): Promise<boolean> {
  const keyPair = await getKeyPair(userId);
  return keyPair !== null;
}

/**
 * Delete a key pair from IndexedDB (for logout/reset)
 * @param userId - User ID whose keys to delete
 */
export async function deleteKeyPair(userId: string): Promise<void> {
  const db = await openKeyStore();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(userId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}
