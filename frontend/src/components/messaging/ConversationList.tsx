import PullToRefresh from 'react-simple-pull-to-refresh';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Conversation {
  contactId: string;
  contactUsername: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount?: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (contactId: string) => void;
  onRefresh?: () => Promise<void>;
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ConversationList({ conversations, activeId, onSelect, onRefresh }: ConversationListProps) {
  const handleRefresh = async () => {
    if (onRefresh) await onRefresh();
  };

  const content = (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.contactId}
              onClick={() => onSelect(conv.contactId)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg text-left',
                'hover:bg-accent transition-colors',
                activeId === conv.contactId && 'bg-accent'
              )}
            >
              <Avatar fallback={conv.contactUsername} className="h-10 w-10" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">
                    {conv.contactUsername}
                  </span>
                  {conv.lastMessageAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(conv.lastMessageAt)}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage}
                  </p>
                )}
              </div>
              {conv.unreadCount && conv.unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </ScrollArea>
  );

  // Only wrap with pull-to-refresh if onRefresh provided
  if (!onRefresh) return content;

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={<div className="text-center py-4 text-muted-foreground">Pull to refresh</div>}
      refreshingContent={<div className="text-center py-4 text-muted-foreground">Refreshing...</div>}
    >
      {content}
    </PullToRefresh>
  );
}
