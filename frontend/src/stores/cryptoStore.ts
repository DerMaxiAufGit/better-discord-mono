import { create } from 'zustand'
import { generateKeyPair, storeKeyPair, getKeyPair, hasStoredKeys } from '@/lib/crypto/keyManager'
import { deriveSessionKeys } from '@/lib/crypto/keyExchange'
import { keyApi } from '@/lib/api'

interface KeyPair {
  publicKey: string
  privateKey: string
}

interface SessionKeys {
  rx: Uint8Array
  tx: Uint8Array
}

interface CryptoState {
  keyPair: KeyPair | null
  sessionKeys: Map<string, SessionKeys>
  isInitialized: boolean

  // Actions
  initializeKeys: (userId: string) => Promise<void>
  getOrDeriveSessionKeys: (userId: string, contactId: string, contactPublicKey: string) => Promise<SessionKeys>
  clearKeys: () => void
}

export const useCryptoStore = create<CryptoState>((set, get) => ({
  keyPair: null,
  sessionKeys: new Map(),
  isInitialized: false,

  initializeKeys: async (userId: string) => {
    // Check if keys already exist in IndexedDB
    const hasKeys = await hasStoredKeys(userId)

    let keyPair: KeyPair
    if (hasKeys) {
      const storedKeyPair = await getKeyPair(userId)
      if (!storedKeyPair) {
        throw new Error('Failed to retrieve stored keys')
      }
      keyPair = storedKeyPair
    } else {
      // Generate new keypair
      keyPair = await generateKeyPair()
      await storeKeyPair(userId, keyPair)
      // Upload public key to server
      await keyApi.setPublicKey(keyPair.publicKey)
    }

    set({ keyPair, isInitialized: true })
  },

  getOrDeriveSessionKeys: async (userId: string, contactId: string, contactPublicKey: string) => {
    const { keyPair, sessionKeys } = get()
    if (!keyPair) throw new Error('Keys not initialized')

    // Check cache first
    const cached = sessionKeys.get(contactId)
    if (cached) {
      console.log('Using cached session keys for contact:', contactId)
      return cached
    }

    // Determine who is "client" role (lower userId lexicographically)
    // CRITICAL: crypto_kx guarantees bidirectional symmetry:
    //   - User A (client, lower ID): encrypts with tx, decrypts with rx
    //   - User B (server, higher ID): encrypts with tx, decrypts with rx
    //   - crypto_kx ensures: client.tx == server.rx AND client.rx == server.tx
    // This means when A sends to B:
    //   A encrypts with A.tx -> B decrypts with B.rx (B.rx == A.tx)
    // And when B sends to A:
    //   B encrypts with B.tx -> A decrypts with A.rx (A.rx == B.tx)
    const isClient = userId < contactId
    console.log('Deriving session keys:', { userId, contactId, isClient, myPubKey: keyPair.publicKey.slice(0, 20) + '...', contactPubKey: contactPublicKey.slice(0, 20) + '...' })

    const keys = await deriveSessionKeys(
      keyPair.publicKey,
      keyPair.privateKey,
      contactPublicKey,
      isClient
    )

    console.log('Derived keys - tx:', Array.from(keys.tx.slice(0, 8)), 'rx:', Array.from(keys.rx.slice(0, 8)))

    // Cache session keys
    set((state) => ({
      sessionKeys: new Map(state.sessionKeys).set(contactId, keys),
    }))

    return keys
  },

  clearKeys: () => {
    set({ keyPair: null, sessionKeys: new Map(), isInitialized: false })
  },
}))
