import { useEffect } from 'react';
import { useAvatarStore } from '@/stores/avatarStore';
import { avatarApi } from '@/lib/api';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarDisplayProps {
  userId: string;
  size?: 'tiny' | 'small' | 'large';
  className?: string;
  showStatus?: boolean;
  status?: 'online' | 'away' | 'dnd' | 'offline';
}

const sizeClasses = {
  tiny: 'h-6 w-6',
  small: 'h-8 w-8',
  large: 'h-16 w-16',
};

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-400',
};

export function AvatarDisplay({
  userId,
  size = 'small',
  className,
  showStatus = false,
  status = 'offline',
}: AvatarDisplayProps) {
  const { avatarCache, fetchAvatar } = useAvatarStore();

  // Fetch avatar on mount if not cached
  useEffect(() => {
    if (!avatarCache.has(userId)) {
      fetchAvatar(userId);
    }
  }, [userId, avatarCache, fetchAvatar]);

  const avatarUrls = avatarCache.get(userId);
  const avatarUrl = avatarUrls ? avatarApi.getUrl(userId, size) : null;

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden bg-muted flex items-center justify-center',
          sizeClasses[size]
        )}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="h-full w-full object-cover"
            onError={(e) => {
              // Hide broken image, show fallback
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <User className={cn(
            'text-muted-foreground',
            size === 'tiny' ? 'h-3 w-3' : size === 'small' ? 'h-4 w-4' : 'h-8 w-8'
          )} />
        )}
      </div>

      {/* Status indicator */}
      {showStatus && (
        <div
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-background',
            statusColors[status],
            size === 'tiny' ? 'h-2 w-2' : size === 'small' ? 'h-2.5 w-2.5' : 'h-4 w-4'
          )}
        />
      )}
    </div>
  );
}
