import { usePresenceStore } from '@/stores/presenceStore';
import type { PresenceStatus } from '@/lib/api';

const AUTO_AWAY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes

class PresenceTracker {
  private activityTimer: number | null = null;
  private heartbeatInterval: number | null = null;
  private wasAway = false;
  private ws: WebSocket | null = null;

  /**
   * Start tracking user activity for auto-away
   */
  start(ws: WebSocket) {
    this.ws = ws;
    this.setupActivityTracking();
    this.startHeartbeat();
  }

  /**
   * Stop tracking (on logout/disconnect)
   */
  stop() {
    this.cleanup();
    this.ws = null;
  }

  private setupActivityTracking() {
    const resetTimer = () => {
      // Clear existing timer
      if (this.activityTimer) {
        window.clearTimeout(this.activityTimer);
      }

      // If was away due to inactivity, restore to online
      if (this.wasAway) {
        this.wasAway = false;
        const store = usePresenceStore.getState();
        if (store.myStatus === 'away') {
          store.setMyStatus('online');
          this.sendStatusUpdate('online');
        }
      }

      // Only auto-away if currently online
      const currentStatus = usePresenceStore.getState().myStatus;
      if (currentStatus === 'online') {
        this.activityTimer = window.setTimeout(() => {
          this.wasAway = true;
          usePresenceStore.getState().setMyStatus('away');
          this.sendStatusUpdate('away');
        }, AUTO_AWAY_TIMEOUT);
      }
    };

    // Track user activity events
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // Initial timer
    resetTimer();
  }

  private startHeartbeat() {
    // Clear existing interval
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 2 minutes
    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL);
  }

  private sendStatusUpdate(status: PresenceStatus) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'presence_update',
        status,
      }));
    }
  }

  private sendHeartbeat() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'presence_heartbeat',
      }));
    }
  }

  private cleanup() {
    if (this.activityTimer) {
      window.clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Singleton instance
export const presenceTracker = new PresenceTracker();
