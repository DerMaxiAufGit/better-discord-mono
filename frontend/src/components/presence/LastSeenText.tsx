import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LastSeenTextProps {
  lastSeen: Date | null;
  status: string;
  className?: string;
}

export function LastSeenText({ lastSeen, status, className }: LastSeenTextProps) {
  const [, forceUpdate] = useState({});

  // Update relative time every minute
  useEffect(() => {
    const interval = setInterval(() => forceUpdate({}), 60000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'online') {
    return (
      <span className={cn('text-green-500', className)}>
        Online
      </span>
    );
  }

  if (status === 'away') {
    return (
      <span className={cn('text-yellow-500', className)}>
        Away
      </span>
    );
  }

  if (status === 'dnd') {
    return (
      <span className={cn('text-red-500', className)}>
        Do Not Disturb
      </span>
    );
  }

  // Offline - show last seen
  if (!lastSeen) {
    return (
      <span className={cn('text-muted-foreground', className)}>
        Offline
      </span>
    );
  }

  const relativeTime = getRelativeTime(lastSeen);
  return (
    <span className={cn('text-muted-foreground', className)}>
      Last seen {relativeTime}
    </span>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
