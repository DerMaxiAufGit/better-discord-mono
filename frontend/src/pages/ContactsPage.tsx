import * as React from 'react';
import { useNavigate } from 'react-router';
import { Search, MessageCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usersApi } from '@/lib/api';
import { useContactStore } from '@/stores/contactStore';

interface User {
  id: string;
  email: string;
}

export function ContactsPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const navigate = useNavigate();
  const { addContact } = useContactStore();

  React.useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const { users } = await usersApi.getUsers(search || undefined);
        setUsers(users);
      } catch (e) {
        console.error('Failed to fetch users:', e);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const startConversation = (user: User) => {
    // Add to contacts store
    addContact({
      id: user.id,
      email: user.email,
      publicKey: null, // Will be fetched when opening conversation
    });
    // Navigate to messages with this contact
    navigate(`/messages/${user.id}`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Find Users</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      ) : users.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          {search ? 'No users found' : 'No other users yet'}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
            >
              <Avatar fallback={user.email} className="h-10 w-10" />
              <div className="flex-1">
                <p className="font-medium">{user.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startConversation(user)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
