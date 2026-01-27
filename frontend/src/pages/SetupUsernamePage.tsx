import * as React from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth';

export function SetupUsernamePage() {
  const [username, setUsername] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();
  const { setUsername: saveUsername } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = username.trim();

    // Validate
    if (trimmed.length < 3 || trimmed.length > 32) {
      setError('Username must be 3-32 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError('Only letters, numbers, underscore, and hyphen allowed');
      return;
    }

    setIsLoading(true);
    try {
      await saveUsername(trimmed);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set username');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Choose your username</h1>
          <p className="text-muted-foreground mt-2">
            This is how other users will find and identify you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="text-center text-lg"
              autoFocus
              maxLength={32}
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              3-32 characters. Letters, numbers, underscore, hyphen only.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || username.trim().length < 3}
          >
            {isLoading ? 'Setting up...' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
