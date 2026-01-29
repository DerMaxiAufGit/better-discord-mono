import * as React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { QuickReactions } from '@/components/reactions/QuickReactions';
import { InlineReactions } from '@/components/reactions/ReactionList';
import { ReplyButton, MessageReply } from '@/components/messaging/MessageReply';
import { useReactionStore } from '@/stores/reactionStore';

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

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  contactUsername?: string;
  onReply?: (message: Message) => void;
}

function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

export function MessageList({ messages, currentUserId, contactUsername, onReply }: MessageListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = React.useState<number | null>(null);
  const [lockedMessageId, setLockedMessageId] = React.useState<number | null>(null);
  const hoverTimeoutRef = React.useRef<number | null>(null);

  // Reaction store
  const { reactions, loadReactions, toggleReaction } = useReactionStore();

  // Load reactions for visible messages
  React.useEffect(() => {
    messages.forEach((msg) => {
      if (msg.id > 0 && !reactions.has(msg.id)) {
        loadReactions(msg.id);
      }
    });
  }, [messages, loadReactions, reactions]);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleReact = async (messageId: number, emoji: string) => {
    await toggleReaction(messageId, emoji);
  };

  // Clear timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (messageId: number) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredMessageId(messageId);
  };

  const handleMouseLeave = () => {
    // Don't hide if picker is open (locked)
    if (lockedMessageId !== null) return;

    // Small delay to allow moving mouse to the reaction bar
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredMessageId(null);
    }, 150);
  };

  const handlePickerOpen = (messageId: number) => {
    setLockedMessageId(messageId);
  };

  const handlePickerClose = () => {
    setLockedMessageId(null);
    setHoveredMessageId(null);
  };

  const handleReplyClick = (message: Message) => {
    onReply?.(message);
  };

  const scrollToMessage = (messageId: number) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-blue-500/20');
      setTimeout(() => element.classList.remove('bg-blue-500/20'), 2000);
    }
  };

  // Group messages by date
  const groupedMessages = React.useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    for (const msg of messages) {
      const dateStr = formatDate(msg.timestamp);
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ date: dateStr, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }

    return groups;
  }, [messages]);

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="space-y-4 p-4">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center my-4">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {group.date}
              </span>
            </div>
            <div className="space-y-2">
              {group.messages.map((message) => {
                const isOwn = message.senderId === currentUserId;
                const messageReactions = reactions.get(message.id) || [];
                const isHovered = hoveredMessageId === message.id;
                return (
                  <div
                    key={message.id}
                    id={`message-${message.id}`}
                    className={cn(
                      'flex gap-2 group relative transition-colors duration-300',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isOwn && (
                      <Avatar
                        className="h-8 w-8"
                        fallback={contactUsername || '?'}
                      />
                    )}
                    <div className="flex flex-col max-w-[70%]">
                      {/* Reply preview if this message is a reply */}
                      {message.replyTo && (
                        <MessageReply
                          replyTo={message.replyTo}
                          onClick={() => scrollToMessage(message.replyTo!.id)}
                          className="mb-1"
                        />
                      )}
                      <div
                        className={cn(
                          'rounded-lg px-3 py-2 relative',
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                        onMouseEnter={() => handleMouseEnter(message.id)}
                        onMouseLeave={handleMouseLeave}
                      >
                        {/* Hover actions - reactions and reply */}
                        {(isHovered || lockedMessageId === message.id) && message.id > 0 && (
                          <div
                            className={cn(
                              'absolute -top-8 flex items-center gap-1 bg-gray-800 rounded-full px-1 py-0.5 shadow-lg z-10',
                              isOwn ? 'right-0' : 'left-0'
                            )}
                            onMouseEnter={() => handleMouseEnter(message.id)}
                            onMouseLeave={handleMouseLeave}
                          >
                            <QuickReactions
                              messageId={message.id}
                              onReact={(emoji) => handleReact(message.id, emoji)}
                              className="!bg-transparent !p-0"
                              pickerAlign={isOwn ? 'right' : 'left'}
                              onPickerOpen={() => handlePickerOpen(message.id)}
                              onPickerClose={handlePickerClose}
                            />
                            {onReply && (
                              <ReplyButton
                                onClick={() => handleReplyClick(message)}
                                className="ml-1"
                              />
                            )}
                          </div>
                        )}
                        <p className="text-sm break-words">{message.content}</p>
                        <div
                          className={cn(
                            'flex items-center gap-1 mt-1',
                            isOwn ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <span className="text-xs opacity-70">
                            {formatTime(message.timestamp)}
                          </span>
                          {isOwn && (
                            <span className={cn(
                              'text-sm font-bold',
                              message.status === 'read' ? 'text-blue-500' : 'text-gray-400'
                            )}>
                              {message.status === 'sending' && '•••'}
                              {message.status === 'sent' && '✓'}
                              {message.status === 'delivered' && '✓✓'}
                              {message.status === 'read' && '✓✓'}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Display existing reactions */}
                      {messageReactions.length > 0 && (
                        <InlineReactions
                          reactions={messageReactions}
                          onToggle={(emoji) => handleReact(message.id, emoji)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
