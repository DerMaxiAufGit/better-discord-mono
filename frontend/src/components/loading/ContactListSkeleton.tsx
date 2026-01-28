import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useTheme } from 'next-themes'

export function ContactListSkeleton() {
  const { theme, systemTheme } = useTheme()
  const effectiveTheme = theme === 'system' ? systemTheme : theme
  const isDark = effectiveTheme === 'dark'

  const baseColor = isDark ? '#202020' : '#e0e0e0'
  const highlightColor = isDark ? '#444' : '#f5f5f5'

  return (
    <SkeletonTheme baseColor={baseColor} highlightColor={highlightColor}>
      <div className="space-y-2">
        {Array(8)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-lg border">
              <Skeleton circle width={40} height={40} />
              <div className="flex-1">
                <Skeleton width="40%" height={16} />
              </div>
              <Skeleton width={80} height={32} borderRadius={6} />
            </div>
          ))}
      </div>
    </SkeletonTheme>
  )
}
