import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AvatarCropper } from './AvatarCropper';
import { AvatarDisplay } from './AvatarDisplay';
import { useAvatarStore } from '@/stores/avatarStore';
import { useAuthStore } from '@/stores/auth';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';

interface AvatarUploadProps {
  onComplete?: () => void;
}

export function AvatarUpload({ onComplete }: AvatarUploadProps = {}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();
  const { isUploading, uploadAvatar, deleteAvatar } = useAvatarStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be less than 5MB');
      return;
    }

    // Read file and open cropper
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleCropComplete = async (blob: Blob) => {
    setImageSrc(null);

    try {
      await uploadAvatar(blob);
      showSuccess('Avatar updated');
      onComplete?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAvatar();
      showSuccess('Avatar removed');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Current avatar */}
      <AvatarDisplay userId={user.id.toString()} size="large" className="h-24 w-24" />

      {/* Actions */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-2" />
          )}
          Change Avatar
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={isUploading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remove
        </Button>
      </div>

      {/* Cropper modal */}
      {imageSrc && (
        <AvatarCropper
          imageSrc={imageSrc}
          onComplete={handleCropComplete}
          onCancel={() => setImageSrc(null)}
        />
      )}
    </div>
  );
}
