import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EyeOff, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlockedMessagePlaceholderProps {
  children: React.ReactNode;
  senderName?: string;
  className?: string;
}

export function BlockedMessagePlaceholder({
  children,
  senderName,
  className,
}: BlockedMessagePlaceholderProps) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <div className={cn('relative', className)}>
        {children}
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-2 -right-2 h-6 px-2 text-xs opacity-60 hover:opacity-100"
          onClick={() => setRevealed(false)}
        >
          <EyeOff className="h-3 w-3 mr-1" />
          Hide
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-3 py-2 rounded-lg',
        'bg-muted/50 border border-dashed border-muted-foreground/20',
        className
      )}
    >
      <span className="text-sm text-muted-foreground">
        Message from {senderName ? `blocked user (${senderName})` : 'blocked user'}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => setRevealed(true)}
      >
        <Eye className="h-3 w-3 mr-1" />
        Show
      </Button>
    </div>
  );
}
