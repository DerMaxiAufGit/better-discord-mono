import * as React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { InlineReactions } from '@/components/reactions/ReactionList';
import { QuickReactions } from '@/components/reactions/QuickReactions';
import { MessageReply, ReplyButton } from '@/components/messaging/MessageReply';
import { FilePreview } from '@/components/files/FilePreview';
import { useReactionStore } from '@/stores/reactionStore';

interface FileAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl?: string;
}

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
  files?: FileAttachment[];
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  contactUsername?: string;
  onReply?: (message: { id: number; content: string; senderEmail: string }) => void;
  onOpenLightbox?: (file: FileAttachment) => void;
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

export function MessageList({ messages, currentUserId, contactUsername, onReply, onOpenLightbox }: MessageListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = React.useState<number | null>(null);

  // Get reactions from store
  const reactions = useReactionStore((s) => s.reactions);
  const toggleReaction = useReactionStore((s) => s.toggleReaction);

  // Scroll to a specific message (for reply click)
  const scrollToMessage = React.useCallback((messageId: number) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-yellow-500/20');
      setTimeout(() => element.classList.remove('bg-yellow-500/20'), 2000);
    }
  }, []);

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
                const messageReactions = reactions.get(message.id) || [];
                return (
                  <div
                    key={message.id}
                    id={`message-${message.id}`}
                    className={cn(
                      'flex gap-2 relative group transition-colors',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                    onMouseEnter={() => setHoveredMessageId(message.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    {!isOwn && (
                      <Avatar
                        className="h-8 w-8"
                        fallback={contactUsername || '?'}
                      />
                    )}
                    <div className="flex flex-col max-w-[70%]">
                      {/* Reply quote if this message is a reply */}
                      {message.replyTo && (
                        <MessageReply
                          replyTo={message.replyTo}
                          onClick={() => scrollToMessage(message.replyTo!.id)}
                        />
                      )}

                      <div
                        className={cn(
                          'rounded-lg px-3 py-2',
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p className="text-sm break-words">{message.content}</p>

                        {/* File attachments */}
                        {message.files && message.files.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.files.map((file) => (
                              <FilePreview
                                key={file.id}
                                fileId={file.id}
                                filename={file.filename}
                                mimeType={file.mimeType}
                                sizeBytes={file.sizeBytes}
                                previewUrl={file.previewUrl}
                                onImageClick={() => onOpenLightbox?.(file)}
                              />
                            ))}
                          </div>
                        )}

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

                      {/* Reactions display */}
                      {messageReactions.length > 0 && (
                        <InlineReactions
                          reactions={messageReactions}
                          onToggle={(emoji) => toggleReaction(message.id, emoji)}
                        />
                      )}
                    </div>

                    {/* Hover actions overlay */}
                    {hoveredMessageId === message.id && (
                      <div className={cn(
                        'absolute top-0 flex items-center gap-1 bg-gray-800 rounded-md p-1 shadow-lg',
                        isOwn ? 'right-full mr-2' : 'left-full ml-2'
                      )}>
                        <ReplyButton
                          onClick={() => onReply?.({
                            id: message.id,
                            content: message.content,
                            senderEmail: isOwn ? 'You' : (contactUsername || 'Unknown')
                          })}
                        />
                        <QuickReactions
                          messageId={message.id}
                          onReact={(emoji) => toggleReaction(message.id, emoji)}
                          className="!bg-transparent !p-0"
                        />
                      </div>
                    )}
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
