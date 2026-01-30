import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePresenceStore } from '@/stores/presenceStore';
import { friendsApi } from '@/lib/api';
import { AvatarDisplay } from '@/components/avatar/AvatarDisplay';
import { Loader2, Eye, EyeOff, Save } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';

interface Friend {
  id: string;
  username: string;
}

export function VisibilityList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { visibilityList, setVisibilityList } = usePresenceStore();

  // Load friends and initialize selection
  useEffect(() => {
    async function loadFriends() {
      try {
        const response = await friendsApi.getFriends();
        const friendsList = response.friends.map((f: any) => ({
          id: f.oderId,
          username: f.username,
        }));
        setFriends(friendsList);
        setSelectedIds(new Set(visibilityList));
      } catch {
        showError('Failed to load friends');
      } finally {
        setIsLoading(false);
      }
    }

    loadFriends();
  }, [visibilityList]);

  const toggleFriend = (friendId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setVisibilityList(Array.from(selectedIds));
      showSuccess('Visibility list updated');
    } catch {
      showError('Failed to update visibility list');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = (() => {
    if (selectedIds.size !== visibilityList.length) return true;
    return !visibilityList.every((id) => selectedIds.has(id));
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Invisible Mode Visibility</h4>
        <p className="text-sm text-muted-foreground">
          When you're invisible, selected friends will still see you as online.
          Everyone else will see you as offline.
        </p>
      </div>

      {friends.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Add friends to manage your visibility list.
        </p>
      ) : (
        <>
          <ScrollArea className="h-[200px] border rounded-md">
            <div className="p-2 space-y-1">
              {friends.map((friend) => (
                <label
                  key={friend.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIds.has(friend.id)}
                    onCheckedChange={() => toggleFriend(friend.id)}
                  />
                  <AvatarDisplay userId={friend.id} size="tiny" />
                  <span className="text-sm flex-1">{friend.username}</span>
                  {selectedIds.has(friend.id) ? (
                    <Eye className="h-4 w-4 text-green-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </label>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} of {friends.length} selected
            </span>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
