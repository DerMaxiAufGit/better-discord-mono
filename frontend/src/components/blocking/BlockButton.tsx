import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBlockStore } from '@/stores/blockStore';
import { BlockConfirmDialog } from './BlockConfirmDialog';
import { Ban, Check } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';

interface BlockButtonProps {
  userId: string;
  username: string | null;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function BlockButton({
  userId,
  username,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
}: BlockButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { isBlocked, blockUser, unblockUser } = useBlockStore();
  const blocked = isBlocked(userId);

  const handleBlock = async (deleteHistory: boolean) => {
    setShowConfirm(false);
    setIsLoading(true);

    try {
      await blockUser(userId, deleteHistory);
      showSuccess(`Blocked ${username || 'user'}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to block user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async () => {
    setIsLoading(true);

    try {
      await unblockUser(userId);
      showSuccess(`Unblocked ${username || 'user'}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to unblock user');
    } finally {
      setIsLoading(false);
    }
  };

  if (blocked) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleUnblock}
        disabled={isLoading}
      >
        <Check className="h-4 w-4" />
        {showLabel && <span className="ml-2">Unblock</span>}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowConfirm(true)}
        disabled={isLoading}
      >
        <Ban className="h-4 w-4" />
        {showLabel && <span className="ml-2">Block</span>}
      </Button>

      <BlockConfirmDialog
        open={showConfirm}
        username={username}
        onConfirm={handleBlock}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
