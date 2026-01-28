import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Lock, Phone, ArrowLeft } from 'lucide-react';
import { useCall } from '@/lib/webrtc/useCall';

interface Message {
  id: number;
  senderId: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface ConversationViewProps {
  contactId: string;
  contactUsername: string;
  currentUserId: string;
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  onBack?: () => void;  // Called when back button clicked (mobile)
}

export function ConversationView({
  contactId,
  contactUsername,
  currentUserId,
  messages,
  onSendMessage,
  isLoading,
  onBack,
}: ConversationViewProps) {
  const { startCall, status: callStatus } = useCall();

  const handleStartCall = () => {
    startCall(contactId, contactUsername);
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
          />
        </div>
      )}

      {/* Input - fixed at bottom, always enabled (messages queue if offline) */}
      <div className="flex-shrink-0">
        <MessageInput
          onSend={onSendMessage}
          placeholder="Type a message..."
        />
      </div>
    </div>
  );
}
