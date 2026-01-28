import { useState, useRef, useCallback } from 'react'
import { useFileStore } from '@/stores/fileStore'
import { uploadFile } from '@/lib/file/chunkedUpload'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
  conversationId?: string
  onUploadComplete?: (fileId: string, filename: string) => void
  onUploadError?: (error: string) => void
  maxFiles?: number
  accept?: string
  className?: string
}

export function FileUploader({
  conversationId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  accept,
  className
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const uploads = useFileStore((s) => s.uploads)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files).slice(0, maxFiles)

    for (const file of fileArray) {
      try {
        const result = await uploadFile(file, conversationId)
        onUploadComplete?.(result.id, result.filename)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        onUploadError?.(message)
      }
    }
  }, [conversationId, maxFiles, onUploadComplete, onUploadError])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  // Active uploads
  const activeUploads = Array.from(uploads.values()).filter(
    u => u.status !== 'complete' && u.status !== 'error'
  )

  return (
    <div className={className}>
      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          accept={accept}
          multiple
          className="hidden"
        />

        <svg
          className="w-10 h-10 mx-auto mb-2 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        <p className="text-sm text-gray-400">
          {isDragging ? (
            'Drop files here'
          ) : (
            <>
              Drag & drop files or <span className="text-blue-400">browse</span>
            </>
          )}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Up to {maxFiles} files, 100MB each
        </p>
      </div>

      {/* Upload progress */}
      {activeUploads.length > 0 && (
        <div className="mt-3 space-y-2">
          {activeUploads.map((upload) => (
            <div key={upload.id} className="flex items-center gap-3 bg-gray-800 p-2 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{upload.file.name}</p>
                <div className="h-1 bg-gray-700 rounded-full mt-1">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-500 capitalize">{upload.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Compact button version for message input
export function FileUploadButton({
  onSelect,
  accept,
  className
}: {
  onSelect: (files: File[]) => void
  accept?: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onSelect(Array.from(e.target.files))
    }
    e.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        onChange={handleChange}
        accept={accept}
        multiple
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors',
          className
        )}
        title="Attach files"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>
    </>
  )
}
