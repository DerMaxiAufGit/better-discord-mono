import * as React from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReplyPreview } from '@/components/messaging/MessageReply';
import { TypingIndicator } from '@/components/typing/TypingIndicator';
import { uploadFile } from '@/lib/file/chunkedUpload';

interface ReplyTo {
  id: number;
  content: string;
  senderEmail: string;
}

interface PendingFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploading: boolean;
}

interface TypingUser {
  userId: string;
  username?: string;
}

interface FileMetadata {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

interface MessageInputProps {
  onSend: (message: string, options?: { replyToId?: number; files?: FileMetadata[] }) => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: ReplyTo | null;
  onCancelReply?: () => void;
  onInputChange?: () => void;
  typingUsers?: TypingUser[];
  conversationId?: string;
}

export function MessageInput({
  onSend,
  disabled,
  placeholder = 'Type a message...',
  replyTo,
  onCancelReply,
  onInputChange,
  typingUsers = [],
  conversationId
}: MessageInputProps) {
  const [message, setMessage] = React.useState('');
  const [files, setFiles] = React.useState<PendingFile[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    const completedFiles = files.filter(f => !f.uploading);
    if ((trimmed || completedFiles.length > 0) && !disabled) {
      onSend(trimmed, {
        replyToId: replyTo?.id,
        files: completedFiles.map(f => ({
          id: f.id,
          filename: f.filename,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes
        }))
      });
      setMessage('');
      setFiles([]);
      onCancelReply?.();
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    for (const file of Array.from(selectedFiles)) {
      const tempId = `temp-${Date.now()}-${file.name}`;
      setFiles(prev => [...prev, {
        id: tempId,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        uploading: true
      }]);

      try {
        const result = await uploadFile(file, conversationId);
        setFiles(prev => prev.map(f =>
          f.id === tempId
            ? {
                id: result.id,
                filename: result.filename,
                mimeType: result.mimeType || file.type || 'application/octet-stream',
                sizeBytes: result.sizeBytes || file.size,
                uploading: false
              }
            : f
        ));
      } catch (err) {
        // Remove failed upload
        setFiles(prev => prev.filter(f => f.id !== tempId));
      }
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Check for files directly
    if (clipboardData.files && clipboardData.files.length > 0) {
      e.preventDefault();
      handleFileSelect(clipboardData.files);
      return;
    }

    // Check clipboard items (for screenshots/copied images)
    const items = clipboardData.items;
    if (!items) return;

    const fileItems: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          fileItems.push(file);
        }
      }
    }

    if (fileItems.length > 0) {
      e.preventDefault();
      // Create a fake FileList-like structure
      const dt = new DataTransfer();
      fileItems.forEach(f => dt.items.add(f));
      handleFileSelect(dt.files);
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onInputChange?.(); // Trigger typing indicator
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
  };

  return (
    <div className="border-t">
      {/* Reply preview */}
      {replyTo && (
        <ReplyPreview
          replyTo={replyTo}
          onCancel={() => onCancelReply?.()}
        />
      )}

      {/* Typing indicator - above input */}
      {typingUsers.length > 0 && (
        <div className="px-4 pt-2">
          <TypingIndicator users={typingUsers} />
        </div>
      )}

      {/* Attached files preview */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1 text-sm"
            >
              <span className="truncate max-w-[150px]">{file.filename}</span>
              <button
                type="button"
                onClick={() => handleRemoveFile(file.id)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4">
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => handleFileSelect(e.target.files)}
          multiple
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Attach files"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-md border border-input bg-background px-3 py-2',
            'text-sm ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'min-h-[40px] max-h-[120px]'
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || (!message.trim() && files.length === 0)}
          className="h-10 w-10 flex-shrink-0"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </form>
    </div>
  );
}
