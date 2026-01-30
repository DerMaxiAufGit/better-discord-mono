import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface BlockConfirmDialogProps {
  open: boolean;
  username: string | null;
  onConfirm: (deleteHistory: boolean) => void;
  onCancel: () => void;
}

export function BlockConfirmDialog({
  open,
  username,
  onConfirm,
  onCancel,
}: BlockConfirmDialogProps) {
  const [deleteHistory, setDeleteHistory] = useState(false);

  const handleConfirm = () => {
    onConfirm(deleteHistory);
    setDeleteHistory(false); // Reset for next time
  };

  const handleCancel = () => {
    setDeleteHistory(false);
    onCancel();
  };

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block {username || 'this user'}?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Blocking will prevent {username || 'them'} from messaging you.
              This will also remove them from your friends list.
            </p>
            <p>
              {username || 'They'} won't be notified that you blocked them.
              You'll need to send a new friend request to message them again after unblocking.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="delete-history"
            checked={deleteHistory}
            onCheckedChange={(checked) => setDeleteHistory(checked === true)}
          />
          <Label htmlFor="delete-history" className="text-sm">
            Delete conversation history
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Block
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
