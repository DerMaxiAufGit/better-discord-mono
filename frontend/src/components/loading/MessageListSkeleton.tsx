import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'next-themes'

export function MessageListSkeleton() {
  const { theme, systemTheme } = useTheme()
  const effectiveTheme = theme === 'system' ? systemTheme : theme
  const isDark = effectiveTheme === 'dark'

  const baseColor = isDark ? '#202020' : '#e0e0e0'
  const highlightColor = isDark ? '#444' : '#f5f5f5'

  // Alternating message widths and alignments for natural look
  const messages = [
    { align: 'left', width: '50%', height: 60 },
    { align: 'right', width: '60%', height: 50 },
    { align: 'left', width: '45%', height: 70 },
    { align: 'right', width: '55%', height: 65 },
    { align: 'left', width: '60%', height: 55 },
    { align: 'right', width: '50%', height: 60 },
    { align: 'left', width: '40%', height: 50 },
    { align: 'right', width: '65%', height: 70 },
  ]

  return (
    <SkeletonTheme baseColor={baseColor} highlightColor={highlightColor}>
      <div className="space-y-3 p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.align === 'right' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.align === 'left' && (
              <Skeleton circle width={32} height={32} />
            )}
            <Skeleton
              width={msg.width}
              height={msg.height}
              borderRadius={12}
            />
          </div>
        ))}
      </div>
    </SkeletonTheme>
  )
}
