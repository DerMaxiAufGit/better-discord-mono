import { useState } from 'react'
import { useFileStore } from '@/stores/fileStore'
import { downloadFile, triggerDownload } from '@/lib/file/chunkedUpload'
import { cn } from '@/lib/utils'

interface FilePreviewProps {
  fileId: string
  filename: string
  mimeType: string
  sizeBytes: number
  previewUrl?: string // For images, a decrypted blob URL
  onImageClick?: () => void
  className?: string
}

export function FilePreview({
  fileId,
  filename,
  mimeType,
  sizeBytes,
  previewUrl,
  onImageClick,
  className
}: FilePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const downloads = useFileStore((s) => s.downloads)
  const download = downloads.get(fileId)

  const isImage = mimeType.startsWith('image/')
  const isVideo = mimeType.startsWith('video/')
  const isAudio = mimeType.startsWith('audio/')

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const blob = await downloadFile(fileId, filename)
      triggerDownload(blob, filename)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  // Image preview
  if (isImage && previewUrl) {
    return (
      <div className={cn('max-w-sm', className)}>
        <img
          src={previewUrl}
          alt={filename}
          onClick={onImageClick}
          className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity max-h-64 object-cover"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500 truncate">{filename}</span>
          <button
            onClick={handleDownload}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Download
          </button>
        </div>
      </div>
    )
  }

  // Video preview
  if (isVideo && previewUrl) {
    return (
      <div className={cn('max-w-md', className)}>
        <video
          src={previewUrl}
          controls
          className="rounded-lg max-h-64"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500 truncate">{filename}</span>
          <button
            onClick={handleDownload}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Download
          </button>
        </div>
      </div>
    )
  }

  // Audio preview
  if (isAudio && previewUrl) {
    return (
      <div className={cn('max-w-sm', className)}>
        <audio src={previewUrl} controls className="w-full" />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500 truncate">{filename}</span>
          <button
            onClick={handleDownload}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Download
          </button>
        </div>
      </div>
    )
  }

  // Generic file
  return (
    <div className={cn(
      'flex items-center gap-3 bg-gray-800 rounded-lg p-3 max-w-sm',
      className
    )}>
      <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{filename}</p>
        <p className="text-xs text-gray-500">{formatSize(sizeBytes)}</p>
      </div>

      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
        title="Download"
      >
        {isDownloading || download?.status === 'downloading' ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
      </button>
    </div>
  )
}
