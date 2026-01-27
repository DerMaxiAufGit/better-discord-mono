import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Avatar } from '@/components/ui/avatar';
import { Lock } from 'lucide-react';

interface Message {
  id: number;
  senderId: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface ConversationViewProps {
  contactId: string;
  contactEmail: string;
  currentUserId: string;
  messages: Message[];
  onSendMessage: (content: string) => void;
  isConnected: boolean;
  isLoading?: boolean;
}

export function ConversationView({
  contactId: _contactId, // Reserved for future use (e.g., fetching more messages)
  contactEmail,
  currentUserId,
  messages,
  onSendMessage,
  isConnected,
  isLoading,
}: ConversationViewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Avatar fallback={contactEmail} className="h-10 w-10" />
        <div className="flex-1">
          <h2 className="font-semibold">{contactEmail}</h2>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
        {!isConnected && (
          <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
            Reconnecting...
          </span>
        )}
      </div>

      {/* Messages */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading messages...
        </div>
      ) : (
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          contactEmail={contactEmail}
        />
      )}

      {/* Input */}
      <MessageInput
        onSend={onSendMessage}
        disabled={!isConnected}
        placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
      />
    </div>
  );
}
