import * as React from 'react';
import { useParams, useNavigate } from 'react-router';
import { ConversationList, ConversationView, MessageList, MessageInput } from '@/components/messaging';
import { GroupCreator } from '@/components/groups/GroupCreator';
import { MemberList } from '@/components/groups/MemberList';
import { MessageSearchBar, SearchResults } from '@/components/search';
import { useAuthStore } from '@/stores/auth';
import { useMessageStore } from '@/stores/messageStore';
import { useContactStore } from '@/stores/contactStore';
import { useCryptoStore } from '@/stores/cryptoStore';
import { useGroupStore, Group } from '@/stores/groupStore';
import { useSearchStore } from '@/stores/searchStore';
import { useMessaging } from '@/lib/websocket/useMessaging';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { decryptMessage } from '@/lib/crypto/messageEncryption';
import { usersApi, messageApi } from '@/lib/api';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { UserPlus, Users, X, Copy, Check, Search } from 'lucide-react';

interface GroupMessage {
  id: number;
  senderId: string;
  senderEmail?: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyToId?: number;
}

interface GroupReplyTo {
  id: number;
  content: string;
  senderEmail: string;
}

export function MessagesPage() {
  const { contactId } = useParams<{ contactId?: string }>();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const viewportHeight = useVisualViewport();

  const { user } = useAuthStore();
  const { conversations, loadHistory, isLoadingHistory } = useMessageStore();
  const { contacts, addContact, setActiveContact, fetchContactPublicKey } = useContactStore();
  const { getOrDeriveSessionKeys, isInitialized: cryptoReady } = useCryptoStore();
  const { isConnected, sendMessage, sendGroupMessage, markAsRead, sendTyping } = useMessaging();

  // Groups
  const groups = useGroupStore((s) => s.groups);
  const loadGroups = useGroupStore((s) => s.loadGroups);
  const [showGroupCreator, setShowGroupCreator] = React.useState(false);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [groupMessages, setGroupMessages] = React.useState<Map<string, GroupMessage[]>>(new Map());
  const [loadingGroupMessages, setLoadingGroupMessages] = React.useState(false);
  const [showInvitePanel, setShowInvitePanel] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviteLink, setInviteLink] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [showMemberList, setShowMemberList] = React.useState(false);
  const [groupReplyTo, setGroupReplyTo] = React.useState<GroupReplyTo | null>(null);
  const addMember = useGroupStore((s) => s.addMember);
  const createInvite = useGroupStore((s) => s.createInvite);

  // Search
  const [showSearch, setShowSearch] = React.useState(false);
  const { clearSearch } = useSearchStore();

  // Load groups on mount
  React.useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Load group messages when a group is selected
  React.useEffect(() => {
    if (!selectedGroupId) return;

    const loadGroupMessages = async () => {
      setLoadingGroupMessages(true);
      try {
        const { messages } = await messageApi.getGroupHistory(selectedGroupId);
        const formatted: GroupMessage[] = messages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          senderEmail: m.senderEmail,
          content: m.encryptedContent, // Not actually encrypted for groups yet
          timestamp: new Date(m.createdAt),
          status: 'delivered' as const,
          replyToId: m.replyToId,
        }));
        setGroupMessages(prev => new Map(prev).set(selectedGroupId, formatted));

        // Index group messages for search
        const searchStore = useSearchStore.getState();
        const messagesToIndex = messages.map(m => ({
          id: m.id,
          conversationId: selectedGroupId,
          conversationType: 'group' as const,
          senderId: m.senderId,
          senderName: m.senderEmail?.includes('@') ? m.senderEmail.split('@')[0] : m.senderEmail || m.senderId,
          plaintext: m.encryptedContent,
          timestamp: new Date(m.createdAt),
        }));
        if (messagesToIndex.length > 0) {
          await searchStore.indexMessages(messagesToIndex);
        }
      } catch (e) {
        console.error('Failed to load group messages:', e);
      } finally {
        setLoadingGroupMessages(false);
      }
    };

    loadGroupMessages();
  }, [selectedGroupId]);

  // Listen for incoming group messages
  React.useEffect(() => {
    const handleGroupMessage = async (event: CustomEvent) => {
      const { id, groupId, senderId, senderEmail, encryptedContent, timestamp, replyToId } = event.detail;
      const newMessage: GroupMessage = {
        id,
        senderId,
        senderEmail,
        content: encryptedContent,
        timestamp: new Date(timestamp),
        status: 'delivered',
        replyToId,
      };
      setGroupMessages(prev => {
        const existing = prev.get(groupId) || [];
        return new Map(prev).set(groupId, [...existing, newMessage]);
      });

      // Index the incoming group message for search
      const searchStore = useSearchStore.getState();
      const senderName = senderEmail?.includes('@') ? senderEmail.split('@')[0] : senderEmail || senderId;
      await searchStore.indexMessage({
        id,
        conversationId: groupId,
        conversationType: 'group',
        senderId,
        senderName,
        plaintext: encryptedContent,
        timestamp: new Date(timestamp),
      });
    };

    const handleGroupMessageAck = (event: CustomEvent) => {
      const { id, groupId, timestamp } = event.detail;
      setGroupMessages(prev => {
        const existing = prev.get(groupId) || [];
        const updated = existing.map(m =>
          m.id < 0 ? { ...m, id, timestamp: new Date(timestamp), status: 'sent' as const } : m
        );
        return new Map(prev).set(groupId, updated);
      });
    };

    window.addEventListener('group-message', handleGroupMessage as unknown as EventListener);
    window.addEventListener('group-message-ack', handleGroupMessageAck as unknown as EventListener);

    return () => {
      window.removeEventListener('group-message', handleGroupMessage as unknown as EventListener);
      window.removeEventListener('group-message-ack', handleGroupMessageAck as unknown as EventListener);
    };
  }, []);

  // Typing indicator
  const { typingUsers, onInputChange, onMessageSend } = useTypingIndicator({
    conversationId: contactId || '',
    sendTypingEvent: (isTyping) => {
      if (contactId) {
        sendTyping(contactId, contactId, isTyping);
      }
    },
  });

  // Handle Escape key for groups - cancel reply if active, otherwise close group view
  React.useEffect(() => {
    if (!selectedGroupId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (groupReplyTo) {
          setGroupReplyTo(null);
        } else {
          setSelectedGroupId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGroupId, groupReplyTo]);

  // Load conversations on mount
  React.useEffect(() => {
    const loadConversations = async () => {
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
    };
    loadConversations();
  }, [addContact]);

  // Set active contact when route changes
  React.useEffect(() => {
    setActiveContact(contactId || null);
    // Clear selected group when viewing a contact
    if (contactId) {
      setSelectedGroupId(null);
    }
  }, [contactId, setActiveContact]);

  // Get messages for the active contact to watch for new incoming messages
  const activeMessages = contactId ? conversations.get(contactId) || [] : [];

  // Mark messages as read when actively viewing a conversation
  React.useEffect(() => {
    if (!contactId || !isConnected || !user) return;

    const hasUnreadFromContact = activeMessages.some(
      msg => msg.senderId === contactId && msg.status === 'delivered'
    );

    if (!hasUnreadFromContact && activeMessages.length > 0) return;

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
        const publicKey = await fetchContactPublicKey(contactId);
        if (!publicKey) {
          console.error('Contact has no public key');
          return;
        }

        const sessionKeys = await getOrDeriveSessionKeys(String(user.id), contactId, publicKey);

        await loadHistory(contactId, async (encrypted, senderId) => {
          const key = senderId === String(user.id) ? sessionKeys.tx : sessionKeys.rx;
          return decryptMessage(encrypted, key);
        });
      } catch (e) {
        console.error('Failed to load messages:', e);
      }
    };

    loadMessages();
  }, [contactId, user, cryptoReady, fetchContactPublicKey, getOrDeriveSessionKeys, loadHistory]);

  const handleSendMessage = async (content: string, options?: { replyToId?: number; files?: { id: string; filename: string; mimeType: string; sizeBytes: number }[] }) => {
    if (!contactId) return;
    try {
      onMessageSend();
      await sendMessage(contactId, content, { files: options?.files, replyToId: options?.replyToId });
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const handleSelectConversation = (id: string) => {
    setSelectedGroupId(null);
    navigate(`/messages/${id}`);
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setGroupReplyTo(null); // Clear any pending reply
    navigate('/messages'); // Clear contact selection
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
  const selectedGroup = selectedGroupId ? groups.find(g => g.id === selectedGroupId) : null;
  const activeGroupMessages = selectedGroupId ? groupMessages.get(selectedGroupId) || [] : [];

  const handleSendGroupMessage = (content: string, options?: { replyToId?: number }) => {
    if (!selectedGroupId || !user) return;

    const replyToId = groupReplyTo?.id ?? options?.replyToId;

    // Add optimistic message
    const tempId = -Date.now();
    const newMessage: GroupMessage = {
      id: tempId,
      senderId: String(user.id),
      senderEmail: user.email,
      content,
      timestamp: new Date(),
      status: 'sending',
      replyToId,
    };
    setGroupMessages(prev => {
      const existing = prev.get(selectedGroupId) || [];
      return new Map(prev).set(selectedGroupId, [...existing, newMessage]);
    });

    // Send via WebSocket
    sendGroupMessage(selectedGroupId, content, { replyToId });

    // Clear reply
    setGroupReplyTo(null);
  };

  const handleAddMember = async () => {
    if (!selectedGroupId || !inviteEmail.trim()) return;
    setInviteError(null);

    try {
      // Search for user by email or username
      const { users } = await usersApi.searchUsers(inviteEmail.trim());
      if (users.length === 0) {
        setInviteError('User not found');
        return;
      }
      // Use first match
      await addMember(selectedGroupId, users[0].id);
      setInviteEmail('');
      setInviteError(null);
      // Refresh group data
      loadGroups();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Failed to add member');
    }
  };

  const handleCreateInviteLink = async () => {
    if (!selectedGroupId) return;
    setInviteError(null);

    try {
      const invite = await createInvite(selectedGroupId);
      const link = `${window.location.origin}/join/${invite.code}`;
      setInviteLink(link);
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Failed to create invite');
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Sidebar content (shared between mobile and desktop)
  const renderSidebar = (showBackButton: boolean) => (
    <div className="h-full flex flex-col">
      <div className="h-[73px] px-4 border-b flex items-center gap-2 flex-shrink-0">
        {showBackButton && (
          <button
            onClick={() => navigate('/')}
            className="p-1 hover:bg-muted rounded"
            title="Back to menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
        )}
        <h2 className="font-semibold flex-1">Messages</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSearch(!showSearch)}
          className={cn("p-2 text-muted-foreground hover:text-foreground", showSearch && "bg-muted text-foreground")}
          title="Search messages"
        >
          <Search className="h-4 w-4" />
        </Button>
        <button
          onClick={() => setShowGroupCreator(true)}
          className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          title="Create group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14"/>
            <path d="M5 12h14"/>
          </svg>
        </button>
      </div>

      {/* Search panel */}
      {showSearch && (
        <div className="border-b p-3 space-y-2">
          <MessageSearchBar
            autoFocus
            placeholder="Search all messages..."
          />
          <SearchResults
            onResultClick={(conversationId, _messageId) => {
              // Navigate to conversation
              // Check if it's a group
              const group = groups.find(g => g.id === conversationId);
              if (group) {
                setSelectedGroupId(conversationId);
                navigate('/messages');
              } else {
                setSelectedGroupId(null);
                navigate(`/messages/${conversationId}`);
              }
              // TODO: scroll to message by _messageId
              setShowSearch(false);
              clearSearch();
            }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Groups section */}
        {groups.length > 0 && (
          <div className="border-b">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
              Groups
            </div>
            <div className="space-y-1 px-2 pb-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleSelectGroup(group.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-2 rounded-lg text-left',
                    'hover:bg-accent transition-colors',
                    selectedGroupId === group.id && 'bg-accent'
                  )}
                >
                  <Avatar fallback={group.name.charAt(0)} className="h-10 w-10" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm truncate block">
                      {group.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {group.member_count} members
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Direct messages section */}
        <div>
          {(groups.length > 0 || conversationList.length > 0) && (
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
              Direct Messages
            </div>
          )}
          <ConversationList
            conversations={conversationList}
            activeId={contactId || null}
            onSelect={handleSelectConversation}
          />
        </div>
      </div>
    </div>
  );

  // Group view with messages
  const renderGroupView = (group: Group) => {
    // Build a map of sender emails for display
    const senderNames = new Map<string, string>();
    activeGroupMessages.forEach(m => {
      if (m.senderEmail && !senderNames.has(m.senderId)) {
        senderNames.set(m.senderId, m.senderEmail.split('@')[0]);
      }
    });

    // Transform group messages for MessageList component
    const formattedMessages = activeGroupMessages.map(m => ({
      id: m.id,
      senderId: m.senderId,
      senderEmail: m.senderEmail,
      content: m.content,
      timestamp: m.timestamp,
      status: m.status,
      replyToId: m.replyToId,
    }));

    // Handle reply in group
    const handleGroupReply = (message: { id: number; senderId: string; content: string }) => {
      const senderName = message.senderId === String(user?.id)
        ? 'You'
        : senderNames.get(message.senderId) || 'Unknown';
      setGroupReplyTo({
        id: message.id,
        content: message.content,
        senderEmail: senderName,
      });
    };

    return (
      <div className="flex h-full overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="h-[73px] flex items-center gap-3 px-4 border-b flex-shrink-0">
            {isMobile && (
              <button
                onClick={() => setSelectedGroupId(null)}
                className="p-1 hover:bg-muted rounded"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>
            )}
            <Avatar fallback={group.name.charAt(0)} className="h-10 w-10" />
          <div className="flex-1">
            <h2 className="font-semibold">{group.name}</h2>
            <span className="text-xs text-muted-foreground">
              {group.member_count} members
            </span>
          </div>
          <button
            onClick={() => {
              setShowInvitePanel(!showInvitePanel);
              setInviteError(null);
              setInviteLink(null);
            }}
            className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Add members"
          >
            <UserPlus className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowMemberList(!showMemberList)}
            className={cn(
              "p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground",
              showMemberList && "bg-muted text-foreground"
            )}
            title="Show members"
          >
            <Users className="h-5 w-5" />
          </button>
        </div>

        {/* Invite panel */}
        {showInvitePanel && (
          <div className="border-b p-4 bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Add Members</h3>
              <button
                onClick={() => setShowInvitePanel(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Add by email/username */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Search by email or username</label>
              <div className="flex gap-2">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email or username"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                />
                <Button onClick={handleAddMember} disabled={!inviteEmail.trim()}>
                  Add
                </Button>
              </div>
            </div>

            {/* Or create invite link */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Or share an invite link</label>
              {inviteLink ? (
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="font-mono text-xs" />
                  <Button variant="outline" onClick={copyInviteLink}>
                    {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={handleCreateInviteLink}>
                  Create Invite Link
                </Button>
              )}
            </div>

            {inviteError && (
              <p className="text-sm text-red-500">{inviteError}</p>
            )}
          </div>
        )}

        {/* Messages */}
        {loadingGroupMessages ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Loading messages...
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <MessageList
              messages={formattedMessages}
              currentUserId={user ? String(user.id) : ''}
              contactUsername={group.name}
              onReply={handleGroupReply}
              isGroupConversation={true}
            />
          </div>
        )}

          {/* Input */}
          <div className="flex-shrink-0">
            <MessageInput
              onSend={(content) => handleSendGroupMessage(content)}
              placeholder={`Message ${group.name}`}
              replyTo={groupReplyTo}
              onCancelReply={() => setGroupReplyTo(null)}
            />
          </div>
        </div>

        {/* Member list panel */}
        {showMemberList && !isMobile && (
          <MemberList groupId={group.id} />
        )}
      </div>
    );
  };

  // Mobile: show full-screen conversation or list
  if (isMobile) {
    if (selectedGroup) {
      return (
        <div className="overflow-hidden" style={{ height: viewportHeight }}>
          {renderGroupView(selectedGroup)}
          {showGroupCreator && (
            <GroupCreator
              onClose={() => setShowGroupCreator(false)}
              onCreated={(groupId) => {
                setSelectedGroupId(groupId);
                setShowGroupCreator(false);
              }}
            />
          )}
        </div>
      );
    }
    if (contactId && activeContact && user) {
      return (
        <div className="overflow-hidden" style={{ height: viewportHeight }}>
          <ConversationView
            contactId={contactId}
            contactUsername={activeContact.username}
                        currentUserId={String(user.id)}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingHistory}
            onBack={() => navigate('/messages')}
            typingUsers={typingUsers}
            onInputChange={onInputChange}
          />
        </div>
      );
    }
    return (
      <div className="h-full">
        {renderSidebar(true)}
        {showGroupCreator && (
          <GroupCreator
            onClose={() => setShowGroupCreator(false)}
            onCreated={(groupId) => {
              setSelectedGroupId(groupId);
              setShowGroupCreator(false);
            }}
          />
        )}
      </div>
    );
  }

  // Desktop: side-by-side layout
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Conversation list sidebar */}
      <div className="w-64 border-r flex-shrink-0">
        {renderSidebar(true)}
      </div>

      {/* Main content */}
      <div className="flex-1 h-full overflow-hidden">
        {selectedGroup ? (
          renderGroupView(selectedGroup)
        ) : contactId && activeContact && user ? (
          <ConversationView
            contactId={contactId}
            contactUsername={activeContact.username}
            currentUserId={String(user.id)}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingHistory}
            onBack={() => navigate('/messages')}
            typingUsers={typingUsers}
            onInputChange={onInputChange}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a conversation or find a user to start chatting
          </div>
        )}
      </div>

      {/* Group creator modal */}
      {showGroupCreator && (
        <GroupCreator
          onClose={() => setShowGroupCreator(false)}
          onCreated={(groupId) => {
            setSelectedGroupId(groupId);
            setShowGroupCreator(false);
          }}
        />
      )}
    </div>
  );
}
