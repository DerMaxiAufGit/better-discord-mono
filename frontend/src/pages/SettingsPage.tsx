import * as React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Check, Info } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth';
import { LogOut } from 'lucide-react';
import { AudioSettings } from '@/components/settings/AudioSettings';
import { AvatarUpload } from '@/components/avatar/AvatarUpload';
import { StatusPicker } from '@/components/presence/StatusPicker';
import { VisibilityList } from '@/components/presence/VisibilityList';
import { APP_VERSION } from '@/config/version';

export function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, setUsername, logout } = useAuthStore();

  const [newUsername, setNewUsername] = React.useState(user?.username || '');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = newUsername.trim();

    if (trimmed === user?.username) {
      return;
    }

    if (trimmed.length < 3 || trimmed.length > 32) {
      setError('Username must be 3-32 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError('Only letters, numbers, underscore, and hyphen allowed');
      return;
    }

    setIsUpdating(true);
    try {
      await setUsername(trimmed);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update username');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-8">
        {/* Username Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Profile</h2>
          <form onSubmit={handleUsernameSubmit} className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Username</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="username"
                  maxLength={32}
                />
                <Button
                  type="submit"
                  disabled={isUpdating || newUsername.trim() === user?.username}
                >
                  {success ? <Check className="h-4 w-4" /> : isUpdating ? 'Saving...' : 'Save'}
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive mt-1">{error}</p>
              )}
              {success && (
                <p className="text-sm text-green-600 mt-1">Username updated!</p>
              )}
            </div>
          </form>
          <p className="text-sm text-muted-foreground">
            Your email: {user?.email}
          </p>
        </section>

        {/* Appearance Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              onClick={() => setTheme('light')}
            >
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              onClick={() => setTheme('dark')}
            >
              Dark
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              onClick={() => setTheme('system')}
            >
              System
            </Button>
          </div>
        </section>

        {/* Audio Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Audio</h2>
          <AudioSettings />
        </section>

        <Separator />

        {/* Avatar Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Avatar</h2>
            <p className="text-sm text-muted-foreground">
              Manage your profile picture
            </p>
          </div>
          <div>
            <AvatarUpload />
          </div>
        </section>

        <Separator />

        {/* Presence Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Status & Presence</h2>
            <p className="text-sm text-muted-foreground">
              Control how you appear to others
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Status</label>
              <div className="mt-2">
                <StatusPicker />
              </div>
            </div>
            <div>
              <VisibilityList />
            </div>
          </div>
        </section>

        <Separator />

        {/* Info Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">About</h2>
          <Button
            variant="outline"
            onClick={() => navigate('/info')}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              App Info & Roadmap
            </span>
            <span className="text-muted-foreground text-sm">v{APP_VERSION}</span>
          </Button>
        </section>

        {/* Account Section */}
        <section className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-semibold">Account</h2>
          <Button
            variant="destructive"
            onClick={logout}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </section>
      </div>
    </div>
  );
}
