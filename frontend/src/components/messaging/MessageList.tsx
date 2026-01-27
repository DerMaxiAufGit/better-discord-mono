import * as React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';

interface Message {
  id: number;
  senderId: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  contactUsername?: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

export function MessageList({ messages, currentUserId, contactUsername }: MessageListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-2',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isOwn && (
                      <Avatar
                        className="h-8 w-8"
                        fallback={contactUsername || '?'}
                      />
                    )}
                    <div
                      className={cn(
                        'max-w-[70%] rounded-lg px-3 py-2',
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
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
