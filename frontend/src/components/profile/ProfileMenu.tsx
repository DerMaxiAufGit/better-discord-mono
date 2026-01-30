import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AvatarUpload } from '@/components/avatar/AvatarUpload';
import { AvatarDisplay } from '@/components/avatar/AvatarDisplay';
import { StatusPicker } from '@/components/presence/StatusPicker';
import { VisibilityList } from '@/components/presence/VisibilityList';
import { useAuthStore } from '@/stores/auth';
import { usePresenceStore } from '@/stores/presenceStore';
import { cn } from '@/lib/utils';

interface ProfileMenuProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  mode?: 'popover' | 'modal';
}

export function ProfileMenu({ open, onClose, className, mode = 'popover' }: ProfileMenuProps) {
  const user = useAuthStore((state) => state.user);
  const myStatus = usePresenceStore((state) => state.myStatus);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);

  if (!open) return null;

  const isModal = mode === 'modal';

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40",
          isModal && "bg-black/50"
        )}
        onClick={onClose}
      />

      {/* Menu panel */}
      <div
        className={cn(
          "z-50 bg-card border border-border rounded-lg shadow-lg",
          "w-80 max-h-[60vh] overflow-y-auto",
          isModal ? "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" : "absolute",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Profile</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* User info with avatar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAvatarUpload(!showAvatarUpload)}
              className="relative group"
              title="Change avatar"
            >
              <AvatarDisplay
                userId={user?.id ? String(user.id) : ''}
                size="large"
                showStatus
                status={myStatus}
              />
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs">Edit</span>
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.username || 'User'}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Avatar upload section (expandable) */}
          {showAvatarUpload && (
            <div className="pt-2">
              <AvatarUpload onComplete={() => setShowAvatarUpload(false)} />
            </div>
          )}

          <Separator />

          {/* Status picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <StatusPicker className="w-full" />
          </div>

          <Separator />

          {/* Visibility list */}
          <div>
            <VisibilityList />
          </div>
        </div>
      </div>
    </>
  );
}
