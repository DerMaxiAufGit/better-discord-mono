export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  onRetry?: (attempt: number, delay: number) => void
}

export function calculateBackoff(
  attemptNumber: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attemptNumber),
    maxDelay
  )
  const jitter = Math.random() * 1000
  return exponentialDelay + jitter
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry
  } = options

  let lastError: Error

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxAttempts - 1) {
        const delay = calculateBackoff(attempt, baseDelay, maxDelay)
        onRetry?.(attempt + 1, delay)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}
