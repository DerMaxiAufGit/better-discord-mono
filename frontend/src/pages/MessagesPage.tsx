import * as React from 'react';
import { useParams, useNavigate } from 'react-router';
import { ConversationList, ConversationView } from '@/components/messaging';
import { useAuthStore } from '@/stores/auth';
import { useMessageStore } from '@/stores/messageStore';
import { useContactStore } from '@/stores/contactStore';
import { useCryptoStore } from '@/stores/cryptoStore';
import { useMessaging } from '@/lib/websocket/useMessaging';
import { decryptMessage } from '@/lib/crypto/messageEncryption';
import { usersApi } from '@/lib/api';

export function MessagesPage() {
  const { contactId } = useParams<{ contactId?: string }>();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const { conversations, loadHistory, isLoadingHistory } = useMessageStore();
  const { contacts, addContact, setActiveContact, fetchContactPublicKey } = useContactStore();
  const { getOrDeriveSessionKeys, isInitialized: cryptoReady } = useCryptoStore();
  const { isConnected, sendMessage } = useMessaging();

  // Set active contact when route changes
  React.useEffect(() => {
    setActiveContact(contactId || null);
  }, [contactId, setActiveContact]);

  // Load contact info if navigating directly to a conversation
  React.useEffect(() => {
    if (contactId && !contacts.get(contactId)) {
      usersApi.getUser(contactId).then((contactUser) => {
        addContact({
          id: contactUser.id,
          email: contactUser.email,
          publicKey: null,
        });
      }).catch(console.error);
    }
  }, [contactId, contacts, addContact]);

  // Load message history when contact changes
  React.useEffect(() => {
    if (!contactId || !user || !cryptoReady) return;

    const loadMessages = async () => {
      try {
        // Fetch public key first
        const publicKey = await fetchContactPublicKey(contactId);
        if (!publicKey) {
          console.error('Contact has no public key');
          return;
        }

        // Get session keys for decryption
        // NOTE: Session key derivation uses crypto_kx which guarantees:
        // - User with lower ID (client): encrypts with tx, decrypts with rx
        // - User with higher ID (server): encrypts with tx, decrypts with rx
        // - crypto_kx ensures: client.tx == server.rx AND client.rx == server.tx
        // This ensures bidirectional message encryption/decryption works correctly.
        const sessionKeys = await getOrDeriveSessionKeys(String(user.id), contactId, publicKey);

        // Load and decrypt history
        // The decrypt function receives each message and needs to determine
        // which key to use based on who sent it.
        // For messages FROM the contact (contact is sender), use rx key
        // For messages FROM self (self is sender), use tx key
        await loadHistory(contactId, async (encrypted, senderId) => {
          // Use rx key for messages we received (from contact)
          // Use tx key for messages we sent (from self)
          const key = senderId === String(user.id) ? sessionKeys.tx : sessionKeys.rx;
          return decryptMessage(encrypted, key);
        });
      } catch (e) {
        console.error('Failed to load messages:', e);
      }
    };

    loadMessages();
  }, [contactId, user, cryptoReady, fetchContactPublicKey, getOrDeriveSessionKeys, loadHistory]);

  const handleSendMessage = async (content: string) => {
    if (!contactId) return;
    try {
      await sendMessage(contactId, content);
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const handleSelectConversation = (id: string) => {
    navigate(`/messages/${id}`);
  };

  // Build conversation list from contacts
  const conversationList = React.useMemo(() => {
    return Array.from(contacts.values()).map((contact) => {
      const msgs = conversations.get(contact.id) || [];
      const lastMsg = msgs[msgs.length - 1];
      return {
        contactId: contact.id,
        contactEmail: contact.email,
        lastMessage: lastMsg?.content,
        lastMessageAt: lastMsg?.timestamp,
      };
    }).sort((a, b) => {
      const aTime = a.lastMessageAt?.getTime() || 0;
      const bTime = b.lastMessageAt?.getTime() || 0;
      return bTime - aTime;
    });
  }, [contacts, conversations]);

  const activeContact = contactId ? contacts.get(contactId) : null;
  const activeMessages = contactId ? conversations.get(contactId) || [] : [];

  return (
    <div className="flex h-full">
      {/* Conversation list sidebar */}
      <div className="w-64 border-r flex-shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Messages</h2>
        </div>
        <ConversationList
          conversations={conversationList}
          activeId={contactId || null}
          onSelect={handleSelectConversation}
        />
      </div>

      {/* Conversation view */}
      <div className="flex-1">
        {contactId && activeContact && user ? (
          <ConversationView
            contactId={contactId}
            contactEmail={activeContact.email}
            currentUserId={String(user.id)}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            isConnected={isConnected}
            isLoading={isLoadingHistory}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a conversation or find a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
