import * as React from 'react';
import { useNavigate } from 'react-router';
import { Search, MessageCircle, ArrowLeft, UserPlus, Check, X, Clock, Users, Phone } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usersApi, friendsApi } from '@/lib/api';
import { useContactStore } from '@/stores/contactStore';
import { useCall } from '@/lib/webrtc/useCall';

interface User {
  id: string;
  username: string;
}

interface FriendRequest {
  id: number;
  oderId: string;
  username: string;
  status: string;
  createdAt: string;
}

type Tab = 'search' | 'friends' | 'requests';

export function ContactsPage() {
  const [tab, setTab] = React.useState<Tab>('friends');
  const [users, setUsers] = React.useState<User[]>([]);
  const [friends, setFriends] = React.useState<FriendRequest[]>([]);
  const [pendingRequests, setPendingRequests] = React.useState<FriendRequest[]>([]);
  const [friendshipStatuses, setFriendshipStatuses] = React.useState<Map<string, { status: string; requestId?: number; isRequester?: boolean } | null>>(new Map());
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [sendingRequest, setSendingRequest] = React.useState<string | null>(null);
  const navigate = useNavigate();
  const { addContact } = useContactStore();
  const { startCall, status: callStatus } = useCall();

  // Load friends and pending requests on mount
  React.useEffect(() => {
    loadFriends();
    loadPendingRequests();
  }, []);

  const loadFriends = async () => {
    try {
      const { friends } = await friendsApi.getFriends();
      setFriends(friends);
    } catch (e) {
      console.error('Failed to load friends:', e);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const { requests } = await friendsApi.getPendingRequests();
      setPendingRequests(requests);
    } catch (e) {
      console.error('Failed to load pending requests:', e);
    }
  };

  // Search users
  React.useEffect(() => {
    if (tab !== 'search' || search.trim().length < 2) {
      setUsers([]);
      setHasSearched(false);
      return;
    }

    const searchUsers = async () => {
      setIsLoading(true);
      try {
        const { users } = await usersApi.searchUsers(search);
        setUsers(users);
        setHasSearched(true);

        // Fetch friendship status for each user
        const statuses = new Map<string, { status: string; requestId?: number; isRequester?: boolean } | null>();
        for (const user of users) {
          try {
            const { status } = await friendsApi.getStatus(user.id);
            statuses.set(user.id, status);
          } catch {
            statuses.set(user.id, null);
          }
        }
        setFriendshipStatuses(statuses);
      } catch (e) {
        console.error('Failed to search users:', e);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [search, tab]);

  const sendFriendRequest = async (userId: string) => {
    setSendingRequest(userId);
    try {
      await friendsApi.sendRequest(userId);
      // Update status locally
      setFriendshipStatuses(prev => new Map(prev).set(userId, { status: 'pending', isRequester: true }));
    } catch (e) {
      console.error('Failed to send friend request:', e);
    } finally {
      setSendingRequest(null);
    }
  };

  const acceptRequest = async (requestId: number) => {
    try {
      await friendsApi.acceptRequest(requestId);
      loadFriends();
      loadPendingRequests();
    } catch (e) {
      console.error('Failed to accept request:', e);
    }
  };

  const rejectRequest = async (requestId: number) => {
    try {
      await friendsApi.rejectRequest(requestId);
      loadPendingRequests();
    } catch (e) {
      console.error('Failed to reject request:', e);
    }
  };

  const startConversation = (userId: string, username: string) => {
    addContact({
      id: userId,
      username: username,
      publicKey: null,
    });
    navigate(`/messages/${userId}`);
  };

  const renderFriendButton = (user: User) => {
    const status = friendshipStatuses.get(user.id);
    const isSending = sendingRequest === user.id;

    if (status?.status === 'accepted') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => startConversation(user.id, user.username)}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Message
        </Button>
      );
    }

    if (status?.status === 'pending') {
      if (status.isRequester) {
        return (
          <Button variant="outline" size="sm" disabled>
            <Clock className="h-4 w-4 mr-2" />
            Pending
          </Button>
        );
      } else {
        return (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => acceptRequest(status.requestId!)}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => rejectRequest(status.requestId!)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => sendFriendRequest(user.id)}
        disabled={isSending}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        {isSending ? 'Sending...' : 'Add Friend'}
      </Button>
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Contacts</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={tab === 'friends' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('friends')}
        >
          <Users className="h-4 w-4 mr-2" />
          Friends ({friends.length})
        </Button>
        <Button
          variant={tab === 'requests' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('requests')}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
        </Button>
        <Button
          variant={tab === 'search' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('search')}
        >
          <Search className="h-4 w-4 mr-2" />
          Find Users
        </Button>
      </div>

      {/* Friends Tab */}
      {tab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No friends yet. Find users to add!
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <Avatar fallback={friend.username} className="h-10 w-10" />
                  <div className="flex-1">
                    <p className="font-medium">{friend.username}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startCall(friend.oderId, friend.username)}
                      disabled={callStatus !== 'idle'}
                      title="Start voice call"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startConversation(friend.oderId, friend.username)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        <div>
          {pendingRequests.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No pending friend requests
            </div>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <Avatar fallback={request.username} className="h-10 w-10" />
                  <div className="flex-1">
                    <p className="font-medium">{request.username}</p>
                    <p className="text-xs text-muted-foreground">Wants to be your friend</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => acceptRequest(request.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rejectRequest(request.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Tab */}
      {tab === 'search' && (
        <div>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by username or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Enter at least 2 characters to search
            </p>
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Searching...</div>
          ) : !hasSearched ? (
            <div className="text-center text-muted-foreground py-8">
              Search for users by their username or email address
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No users found matching "{search}"
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <Avatar fallback={user.username} className="h-10 w-10" />
                  <div className="flex-1">
                    <p className="font-medium">{user.username}</p>
                  </div>
                  {renderFriendButton(user)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
