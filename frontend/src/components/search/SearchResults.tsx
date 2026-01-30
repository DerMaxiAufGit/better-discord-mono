import { useSearchStore } from '@/stores/searchStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResultsProps {
  className?: string;
  onResultClick?: (conversationId: string, messageId: number) => void;
}

export function SearchResults({ className, onResultClick }: SearchResultsProps) {
  const { query, groupedResults, isSearching } = useSearchStore();

  if (!query || query.length < 2) {
    return null;
  }

  if (isSearching) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        Searching...
      </div>
    );
  }

  if (groupedResults.length === 0) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        No messages found for "{query}"
      </div>
    );
  }

  return (
    <ScrollArea className={cn('max-h-[400px]', className)}>
      <div className="space-y-4 p-2">
        {groupedResults.map((group) => (
          <div key={group.conversationId}>
            {/* Conversation header */}
            <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
              {group.conversationType === 'group' ? (
                <Users className="h-4 w-4" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              <span>{group.conversationName}</span>
              <span className="text-xs">({group.results.length})</span>
            </div>

            {/* Results */}
            <div className="space-y-1">
              {group.results.slice(0, 5).map((result) => (
                <button
                  key={result.message.id}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  onClick={() => onResultClick?.(group.conversationId, result.message.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {result.message.senderName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(result.message.timestamp)}
                    </span>
                  </div>
                  <p
                    className="text-sm text-muted-foreground truncate mt-0.5"
                    dangerouslySetInnerHTML={{
                      __html: result.highlight
                        .replace(/\*\*(.*?)\*\*/g, '<mark class="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded">$1</mark>')
                        .slice(0, 150),
                    }}
                  />
                </button>
              ))}
              {group.results.length > 5 && (
                <div className="text-xs text-muted-foreground px-3 py-1">
                  +{group.results.length - 5} more results
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 86400000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
