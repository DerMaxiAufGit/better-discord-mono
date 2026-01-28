import { toast as sonnerToast } from 'sonner'

// Re-export base toast
export const toast = sonnerToast

// Convenience helpers with consistent styling
export function showSuccess(message: string) {
  sonnerToast.success(message)
}

export function showError(message: string, options?: { action?: { label: string; onClick: () => void } }) {
  sonnerToast.error(message, options)
}

export function showInfo(message: string) {
  sonnerToast.info(message)
}

// For API errors with retry
export function showApiError(message: string, retryFn?: () => void) {
  sonnerToast.error(message, retryFn ? {
    action: { label: 'Retry', onClick: retryFn }
  } : undefined)
}

// For promise-based operations
export function showPromise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error: string }
) {
  return sonnerToast.promise(promise, messages)
}
