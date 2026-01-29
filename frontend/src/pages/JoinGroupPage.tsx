import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useGroupStore } from '@/stores/groupStore'
import { useAuthStore } from '@/stores/auth'

export function JoinGroupPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { joinGroup } = useGroupStore()
  const { accessToken } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) {
      setStatus('error')
      setError('Invalid invite link')
      return
    }

    if (!accessToken) {
      // Not logged in - redirect to login with return URL
      navigate(`/login?redirect=/join/${code}`)
      return
    }

    // Attempt to join the group
    joinGroup(code)
      .then(() => {
        setStatus('success')
        // Navigate to messages after short delay
        setTimeout(() => navigate('/messages'), 1500)
      })
      .catch((err) => {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to join group')
      })
  }, [code, accessToken, joinGroup, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-500" />
            <p className="text-zinc-400">Joining group...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-zinc-200">Successfully joined the group!</p>
            <p className="mt-2 text-sm text-zinc-500">Redirecting...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-zinc-200">Failed to join group</p>
            <p className="mt-2 text-sm text-red-400">{error}</p>
            <button
              onClick={() => navigate('/messages')}
              className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              Go to Messages
            </button>
          </>
        )}
      </div>
    </div>
  )
}
