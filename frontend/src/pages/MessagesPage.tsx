import * as React from 'react';
import { useParams, useNavigate } from 'react-router';
import { ConversationList, ConversationView } from '@/components/messaging';
import { useAuthStore } from '@/stores/auth';
import { useMessageStore } from '@/stores/messageStore';
import { useContactStore } from '@/stores/contactStore';
import { useCryptoStore } from '@/stores/cryptoStore';
import { useMessaging } from '@/lib/websocket/useMessaging';
import { decryptMessage } from '@/lib/crypto/messageEncryption';
import { usersApi, messageApi } from '@/lib/api';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export function MessagesPage() {
  const { contactId } = useParams<{ contactId?: string }>();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  const { user } = useAuthStore();
  const { conversations, loadHistory, isLoadingHistory } = useMessageStore();
  const { contacts, addContact, setActiveContact, fetchContactPublicKey } = useContactStore();
  const { getOrDeriveSessionKeys, isInitialized: cryptoReady } = useCryptoStore();
  const { isConnected, sendMessage, markAsRead } = useMessaging();

  // Load conversations function (extracted for reuse in refresh)
  const loadConversations = React.useCallback(async () => {
      try {
        const { conversations: convos } = await messageApi.getConversations();
        // Fetch username for each contact
        for (const c of convos) {
          try {
            const user = await usersApi.getUser(c.contactId);
            addContact({
              id: c.contactId,
              username: user.username || 'Unknown',
              publicKey: null,
            });
          } catch {
            // Skip contacts we can't fetch
          }
        }
      } catch (e) {
        console.error('Failed to load conversations:', e);
      }
  }, [addContact]);

  // Load conversations on mount
  React.useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle pull-to-refresh
  const handleRefresh = React.useCallback(async () => {
    await loadConversations();
  }, [loadConversations]);

  // Set active contact when route changes
  React.useEffect(() => {
    setActiveContact(contactId || null);
  }, [contactId, setActiveContact]);

  // Get messages for the active contact to watch for new incoming messages
  const activeMessages = contactId ? conversations.get(contactId) || [] : [];

  // Mark messages as read when actively viewing a conversation
  // Also marks new incoming messages as read while in the chat
  React.useEffect(() => {
    if (!contactId || !isConnected || !user) return;

    // Check if there are unread messages from the contact (messages we received)
    const hasUnreadFromContact = activeMessages.some(
      msg => msg.senderId === contactId && msg.status === 'delivered'
    );

    // Only send read receipt if there are unread messages or on initial view
    if (!hasUnreadFromContact && activeMessages.length > 0) return;

    // Delay marking as read to ensure user is actually viewing the chat
    const timer = setTimeout(() => {
      markAsRead(contactId);
    }, 300);

    return () => clearTimeout(timer);
  }, [contactId, isConnected, markAsRead, user, activeMessages]);

  // Load contact info if navigating directly to a conversation
  React.useEffect(() => {
    if (contactId && !contacts.get(contactId)) {
      usersApi.getUser(contactId).then((contactUser) => {
        addContact({
          id: contactUser.id,
          username: contactUser.username || 'Unknown',
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
        contactUsername: contact.username,
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

  // Mobile: show full-screen conversation or list
  if (isMobile) {
    if (contactId && activeContact && user) {
      return (
        <div className="h-full">
          <ConversationView
            contactId={contactId}
            contactUsername={activeContact.username}
            currentUserId={String(user.id)}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            isConnected={isConnected}
            isLoading={isLoadingHistory}
            onBack={() => navigate('/messages')}
          />
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col">
        <div className="h-[73px] px-4 border-b flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/')}
            className="p-1 hover:bg-muted rounded"
            title="Back to menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <h2 className="font-semibold">Messages</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            conversations={conversationList}
            activeId={contactId || null}
            onSelect={handleSelectConversation}
            onRefresh={handleRefresh}
          />
        </div>
      </div>
    );
  }

  // Desktop: side-by-side layout
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Conversation list sidebar */}
      <div className="w-64 border-r flex-shrink-0 flex flex-col h-full">
        <div className="h-[73px] px-4 border-b flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/')}
            className="p-1 hover:bg-muted rounded"
            title="Back to menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <h2 className="font-semibold">Messages</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            conversations={conversationList}
            activeId={contactId || null}
            onSelect={handleSelectConversation}
            onRefresh={handleRefresh}
          />
        </div>
      </div>

      {/* Conversation view */}
      <div className="flex-1 h-full overflow-hidden">
        {contactId && activeContact && user ? (
          <ConversationView
            contactId={contactId}
            contactUsername={activeContact.username}
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
