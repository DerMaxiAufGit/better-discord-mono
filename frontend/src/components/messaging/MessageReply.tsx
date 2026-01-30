import { cn } from '@/lib/utils'

interface ReplyMessage {
  id: number
  content: string
  senderEmail: string
}

interface MessageReplyProps {
  replyTo: ReplyMessage
  onClick?: () => void
  className?: string
}

// Displayed on a message that is a reply
export function MessageReply({ replyTo, onClick, className }: MessageReplyProps) {
  const senderEmail = typeof replyTo.senderEmail === 'string' ? replyTo.senderEmail : ''
  const senderName = senderEmail.split('@')[0] || 'Unknown'
  const content = typeof replyTo.content === 'string' ? replyTo.content : ''
  const preview = content.length > 100
    ? content.slice(0, 100) + '...'
    : content

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-2 pl-3 border-l-2 border-gray-600 mb-1 cursor-pointer hover:bg-gray-800/50 rounded-r py-1',
        className
      )}
    >
      <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-blue-400">{senderName}</span>
        <p className="text-xs text-gray-500 truncate">{preview}</p>
      </div>
    </div>
  )
}

// Preview shown in message input when replying
interface ReplyPreviewProps {
  replyTo: ReplyMessage
  onCancel: () => void
  className?: string
}

export function ReplyPreview({ replyTo, onCancel, className }: ReplyPreviewProps) {
  const senderEmail = typeof replyTo.senderEmail === 'string' ? replyTo.senderEmail : ''
  const senderName = senderEmail.split('@')[0] || 'Unknown'
  const content = typeof replyTo.content === 'string' ? replyTo.content : ''
  const preview = content.length > 60
    ? content.slice(0, 60) + '...'
    : content

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 bg-gray-800 border-l-4 border-blue-500 rounded-t-lg',
      className
    )}>
      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>

      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-blue-400">
          Replying to {senderName}
        </span>
        <p className="text-sm text-gray-400 truncate">{preview}</p>
      </div>

      <button
        onClick={onCancel}
        className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        title="Cancel reply"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// Reply button for message hover actions
export function ReplyButton({
  onClick,
  className
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors',
        className
      )}
      title="Reply"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    </button>
  )
}
