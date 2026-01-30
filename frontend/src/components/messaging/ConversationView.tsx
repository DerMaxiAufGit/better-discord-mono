import { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Lock, Phone, ArrowLeft } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';

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
  contactEmail?: string;
  currentUserId: string;
  messages: Message[];
  onSendMessage: (content: string, options?: { replyToId?: number; files?: FileMetadata[] }) => void;
  isLoading?: boolean;
  onBack?: () => void;
  typingUsers?: TypingUser[];
  onInputChange?: () => void;
}

export function ConversationView({
  contactId,
  contactUsername,
  contactEmail,
  currentUserId,
  messages,
  onSendMessage,
  isLoading,
  onBack,
  typingUsers = [],
  onInputChange,
}: ConversationViewProps) {
  const { startCall, status: callStatus } = useCall();
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);

  const handleStartCall = () => {
    startCall(contactId, contactUsername);
  };

  const handleSend = (content: string, options?: { replyToId?: number; files?: FileMetadata[] }) => {
    onSendMessage(content, { replyToId: replyTo?.id ?? options?.replyToId, files: options?.files });
    setReplyTo(null);
  };

  const handleReply = (message: Message) => {
    // Determine sender email - if it's from the contact, use contactEmail
    const senderEmail = message.senderId === currentUserId
      ? 'You'
      : contactEmail || contactUsername;
    setReplyTo({
      id: message.id,
      content: message.content,
      senderEmail,
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - fixed at top */}
      <div className="h-[73px] flex items-center gap-3 px-4 border-b flex-shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar fallback={contactUsername} className="h-10 w-10" />
        <div className="flex-1">
          <h2 className="font-semibold">{contactUsername}</h2>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>End-to-end encrypted</span>
          </div>
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
      </div>

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
