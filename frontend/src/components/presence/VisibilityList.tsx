import { useState, useEffect, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePresenceStore } from '@/stores/presenceStore';
import { friendsApi } from '@/lib/api';
import { AvatarDisplay } from '@/components/avatar/AvatarDisplay';
import { Loader2, Eye, EyeOff, Search } from 'lucide-react';
import { showError } from '@/lib/toast';

interface Friend {
  id: string;
  username: string;
}

export function VisibilityList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { visibilityList, setVisibilityList } = usePresenceStore();

  // Filter friends based on search
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const query = searchQuery.toLowerCase();
    return friends.filter(f => f.username.toLowerCase().includes(query));
  }, [friends, searchQuery]);

  // Load friends on mount
  useEffect(() => {
    async function loadFriends() {
      try {
        const response = await friendsApi.getFriends();
        const friendsList = response.friends.map((f: any) => ({
          id: f.oderId,
          username: f.username,
        }));
        setFriends(friendsList);
      } catch {
        showError('Failed to load friends');
      } finally {
        setIsLoading(false);
      }
    }

    loadFriends();
  }, []);

  // Auto-save on toggle
  const toggleFriend = async (friendId: string) => {
    const isCurrentlySelected = visibilityList.includes(friendId);
    const newList = isCurrentlySelected
      ? visibilityList.filter(id => id !== friendId)
      : [...visibilityList, friendId];

    try {
      await setVisibilityList(newList);
    } catch {
      showError('Failed to update visibility');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Invisible Mode Visibility</h4>
        <p className="text-xs text-muted-foreground">
          Selected friends see you online when invisible.
        </p>
      </div>

      {friends.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Add friends to manage visibility.
        </p>
      ) : (
        <>
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>

          <ScrollArea className="h-[120px]">
            <div className="space-y-1">
              {filteredFriends.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  No friends found
                </p>
              ) : (
                filteredFriends.map((friend) => {
                  const isSelected = visibilityList.includes(friend.id);
                  return (
                    <div
                      key={friend.id}
                      onClick={() => toggleFriend(friend.id)}
                      className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}}
                      />
                      <AvatarDisplay userId={friend.id} size="tiny" />
                      <span className="text-sm flex-1 truncate">{friend.username}</span>
                      {isSelected ? (
                        <Eye className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
