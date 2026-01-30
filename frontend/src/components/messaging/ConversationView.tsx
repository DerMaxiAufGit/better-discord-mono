import { useState, useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { AvatarDisplay } from '@/components/avatar/AvatarDisplay';
import { LastSeenText } from '@/components/presence/LastSeenText';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Phone, ArrowLeft, MoreVertical, Ban, Check } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import { usePresenceStore } from '@/stores/presenceStore';
import { useBlockStore } from '@/stores/blockStore';
import { BlockConfirmDialog } from '@/components/blocking/BlockConfirmDialog';
import { showSuccess, showError } from '@/lib/toast';

interface ReplyTo {
  id: number;
  content: string;
  senderEmail: string;
}

interface Message {
  id: number;
  senderId: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: ReplyTo;
}

interface TypingUser {
  userId: string;
  username?: string;
}

interface FileMetadata {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

interface ConversationViewProps {
  contactId: string;
  contactUsername: string;
  currentUserId: string;
  messages: Message[];
  onSendMessage: (content: string, options?: { replyToId?: number; files?: FileMetadata[] }) => void;
  isLoading?: boolean;
  onBack?: () => void;
  typingUsers?: TypingUser[];
  onInputChange?: () => void;
  highlightMessageId?: number | null;
}

export function ConversationView({
  contactId,
  contactUsername,
  currentUserId,
  messages,
  onSendMessage,
  isLoading,
  onBack,
  typingUsers = [],
  onInputChange,
  highlightMessageId,
}: ConversationViewProps) {
  const { startCall, status: callStatus } = useCall();
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const presence = usePresenceStore((state) => state.presenceMap[contactId]);
  const { isBlocked, blockUser, unblockUser } = useBlockStore();
  const blocked = isBlocked(contactId);

  const handleStartCall = () => {
    startCall(contactId, contactUsername);
  };

  const handleSend = (content: string, options?: { replyToId?: number; files?: FileMetadata[] }) => {
    onSendMessage(content, { replyToId: replyTo?.id ?? options?.replyToId, files: options?.files });
    setReplyTo(null);
  };

  const handleReply = (message: Message) => {
    // Determine sender name - if it's from the contact, use contactUsername
    const senderEmail = message.senderId === currentUserId
      ? 'You'
      : contactUsername;
    setReplyTo({
      id: message.id,
      content: message.content,
      senderEmail,
    });
  };

  const handleBlock = async (deleteHistory: boolean) => {
    setShowBlockConfirm(false);
    setIsBlockLoading(true);

    try {
      await blockUser(contactId, deleteHistory);
      showSuccess(`Blocked ${contactUsername}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to block user');
    } finally {
      setIsBlockLoading(false);
    }
  };

  const handleUnblock = async () => {
    setIsBlockLoading(true);

    try {
      await unblockUser(contactId);
      showSuccess(`Unblocked ${contactUsername}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to unblock user');
    } finally {
      setIsBlockLoading(false);
    }
  };

  // Handle Escape key - cancel reply if active, otherwise close chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (replyTo) {
          setReplyTo(null);
        } else if (onBack) {
          onBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replyTo, onBack]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - fixed at top */}
      <div className="h-[73px] flex items-center gap-3 px-4 border-b flex-shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <AvatarDisplay
          userId={contactId}
          size="small"
          showStatus
          status={(presence?.status as any) || 'offline'}
        />
        <div className="flex-1">
          <h2 className="font-semibold">{contactUsername}</h2>
          <LastSeenText
            lastSeen={presence?.lastSeen || null}
            status={presence?.status || 'offline'}
            className="text-xs"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleStartCall}
          disabled={callStatus !== 'idle'}
          title="Start voice call"
        >
          <Phone className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isBlockLoading}>
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {blocked ? (
              <DropdownMenuItem onClick={handleUnblock}>
                <Check className="h-4 w-4 mr-2" />
                Unblock
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setShowBlockConfirm(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Block
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Block confirm dialog */}
      <BlockConfirmDialog
        open={showBlockConfirm}
        username={contactUsername}
        onConfirm={handleBlock}
        onCancel={() => setShowBlockConfirm(false)}
      />

      {/* Messages - scrollable area */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading messages...
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            contactUsername={contactUsername}
            onReply={handleReply}
            highlightMessageId={highlightMessageId}
          />
        </div>
      )}

      {/* Input - fixed at bottom, always enabled (messages queue if offline) */}
      <div className="flex-shrink-0">
        <MessageInput
          onSend={handleSend}
          placeholder="Type a message..."
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          typingUsers={typingUsers}
          onInputChange={onInputChange}
          conversationId={contactId}
        />
      </div>
    </div>
  );
}
