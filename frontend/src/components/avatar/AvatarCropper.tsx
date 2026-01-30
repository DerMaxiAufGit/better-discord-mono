import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, ZoomIn } from 'lucide-react';

interface AvatarCropperProps {
  imageSrc: string;
  onComplete: (blob: Blob) => void;
  onCancel: () => void;
}

export function AvatarCropper({ imageSrc, onComplete, onCancel }: AvatarCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    // Create canvas to crop image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;

    await new Promise<void>((resolve) => {
      image.onload = () => resolve();
    });

    // Set canvas to cropped area size (max 512px for reasonable file size)
    const maxSize = 512;
    const scale = Math.min(1, maxSize / Math.max(croppedAreaPixels.width, croppedAreaPixels.height));
    canvas.width = croppedAreaPixels.width * scale;
    canvas.height = croppedAreaPixels.height * scale;

    // Draw cropped portion
    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onComplete(blob);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Crop Avatar</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Cropper area */}
        <div className="relative h-[300px] bg-muted">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div className="p-4 flex items-center gap-3">
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={([value]) => setZoom(value)}
            className="flex-1"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            Save Avatar
          </Button>
        </div>
      </div>
    </div>
  );
}
