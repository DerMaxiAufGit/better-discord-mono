import { create } from 'zustand'
import { keyApi } from '@/lib/api'

interface Contact {
  id: string
  email: string
  publicKey: string | null
  lastMessageAt?: Date
}

interface ContactState {
  contacts: Map<string, Contact>
  activeContactId: string | null

  // Actions
  addContact: (contact: Contact) => void
  setActiveContact: (contactId: string | null) => void
  fetchContactPublicKey: (contactId: string) => Promise<string | null>
  getContact: (contactId: string) => Contact | undefined
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: new Map(),
  activeContactId: null,

  addContact: (contact: Contact) => {
    set((state) => ({
      contacts: new Map(state.contacts).set(contact.id, contact),
    }))
  },

  setActiveContact: (contactId: string | null) => {
    set({ activeContactId: contactId })
  },

  fetchContactPublicKey: async (contactId: string) => {
    const contact = get().contacts.get(contactId)
    if (contact?.publicKey) return contact.publicKey

    const publicKey = await keyApi.getPublicKey(contactId)
    if (publicKey && contact) {
      set((state) => ({
        contacts: new Map(state.contacts).set(contactId, {
          ...contact,
          publicKey,
        }),
      }))
    }
    return publicKey
  },

  getContact: (contactId: string) => get().contacts.get(contactId),
}))
