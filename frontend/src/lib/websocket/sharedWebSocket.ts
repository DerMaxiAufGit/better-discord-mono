/**
 * Shared WebSocket reference for call signaling.
 * useMessaging sets this when connecting, useCall reads it for signaling.
 */

let sharedWs: WebSocket | null = null

export function setSharedWebSocket(ws: WebSocket | null): void {
  sharedWs = ws
}

export function getSharedWebSocket(): WebSocket | null {
  return sharedWs
}

export function sendViaSharedWebSocket(message: Record<string, unknown>): boolean {
  if (sharedWs && sharedWs.readyState === WebSocket.OPEN) {
    sharedWs.send(JSON.stringify(message))
    return true
  }
  console.warn('[sharedWebSocket] Not connected, cannot send:', message.type)
  return false
}
