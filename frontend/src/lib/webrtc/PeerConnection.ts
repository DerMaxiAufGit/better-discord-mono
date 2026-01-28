import { turnApi } from '../api';

/**
 * Signaling channel interface for sending WebRTC signaling messages.
 * Typically backed by WebSocket.
 */
export interface SignalingChannel {
  send: (msg: { type: string; [key: string]: unknown }) => void;
}

/**
 * Configuration for creating a PeerConnectionManager.
 */
export interface PeerConnectionConfig {
  /** Whether this peer is "polite" in Perfect Negotiation (backs down on collision) */
  isPolite: boolean;
  /** Callback when remote track is received */
  onTrack: (stream: MediaStream) => void;
  /** Callback when ICE connection state changes */
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
  /** Signaling channel for sending offers/answers/candidates */
  signaling: SignalingChannel;
  /** Unique identifier for this call */
  callId: string;
  /** User ID of the remote peer */
  remoteUserId: string;
}

/**
 * Manages an RTCPeerConnection with Perfect Negotiation pattern.
 *
 * Perfect Negotiation handles offer collision (glare) gracefully:
 * - One peer is "polite" (isPolite=true): backs down on collision
 * - One peer is "impolite" (isPolite=false): ignores incoming offer during collision
 *
 * This allows both peers to independently trigger negotiation without coordination.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
 */
export class PeerConnectionManager {
  private pc: RTCPeerConnection | null = null;
  private config: PeerConnectionConfig;

  // Perfect Negotiation state
  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemoteAnswerPending = false;

  constructor(config: PeerConnectionConfig) {
    this.config = config;
  }

  /**
   * Initialize the RTCPeerConnection with ICE servers.
   * Sets up all event handlers for Perfect Negotiation.
   */
  async initialize(iceServers: RTCIceServer[]): Promise<void> {
    this.pc = new RTCPeerConnection({
      iceServers,
      // Enable ICE candidate trickling for faster connection
      iceCandidatePoolSize: 10,
    });

    // Send ICE candidates via signaling channel
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.config.signaling.send({
          type: 'call-ice-candidate',
          recipientId: this.config.remoteUserId,
          callId: this.config.callId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Perfect Negotiation: handle negotiation needed
    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        // Use parameter-less setLocalDescription for implicit offer
        await this.pc!.setLocalDescription();
        this.config.signaling.send({
          type: 'call-offer',
          recipientId: this.config.remoteUserId,
          callId: this.config.callId,
          sdp: this.pc!.localDescription!.sdp,
        });
      } catch (err) {
        console.error('Error during negotiation:', err);
      } finally {
        this.makingOffer = false;
      }
    };

    // Handle incoming tracks (remote audio/video)
    this.pc.ontrack = (event) => {
      // Create a MediaStream for each track
      const stream = event.streams[0];
      if (stream) {
        this.config.onTrack(stream);
      }
    };

    // Monitor ICE connection state for reconnection handling
    this.pc.oniceconnectionstatechange = () => {
      this.config.onIceConnectionStateChange(this.pc!.iceConnectionState);
    };

    // Log connection state changes for debugging
    this.pc.onconnectionstatechange = () => {
      console.log(`[PeerConnection] Connection state: ${this.pc?.connectionState}`);
    };
  }

  /**
   * Add local media stream tracks to the peer connection.
   * This will trigger negotiation if needed.
   */
  async addLocalStream(stream: MediaStream): Promise<void> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    for (const track of stream.getTracks()) {
      this.pc.addTrack(track, stream);
    }
  }

  /**
   * Replace an existing track (e.g., for audio device switching).
   */
  async replaceTrack(oldTrack: MediaStreamTrack, newTrack: MediaStreamTrack): Promise<void> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    const sender = this.pc.getSenders().find(s => s.track === oldTrack);
    if (sender) {
      await sender.replaceTrack(newTrack);
    }
  }

  /**
   * Handle remote SDP description (offer or answer).
   * Implements Perfect Negotiation collision handling.
   */
  async handleRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    const offerCollision =
      description.type === 'offer' &&
      (this.makingOffer || this.pc.signalingState !== 'stable');

    this.ignoreOffer = !this.config.isPolite && offerCollision;
    if (this.ignoreOffer) {
      console.log('[PeerConnection] Ignoring offer due to collision (impolite peer)');
      return;
    }

    if (description.type === 'answer') {
      this.isSettingRemoteAnswerPending = true;
    }

    try {
      await this.pc.setRemoteDescription(description);
    } finally {
      this.isSettingRemoteAnswerPending = false;
    }

    if (description.type === 'offer') {
      // Create answer (parameter-less setLocalDescription for implicit answer)
      await this.pc.setLocalDescription();
      this.config.signaling.send({
        type: 'call-answer',
        recipientId: this.config.remoteUserId,
        callId: this.config.callId,
        sdp: this.pc.localDescription!.sdp,
      });
    }
  }

  /**
   * Handle incoming ICE candidate from remote peer.
   */
  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    // Ignore candidate if we're ignoring the current offer
    if (this.ignoreOffer) {
      return;
    }

    try {
      await this.pc.addIceCandidate(candidate);
    } catch (err) {
      // Ignore candidate errors if we're setting remote answer
      // (candidates may arrive before answer is fully processed)
      if (!this.isSettingRemoteAnswerPending) {
        throw err;
      }
    }
  }

  /**
   * Trigger ICE restart for reconnection.
   */
  restartIce(): void {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }
    this.pc.restartIce();
  }

  /**
   * Close the peer connection and clean up resources.
   */
  close(): void {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.isSettingRemoteAnswerPending = false;
  }

  /**
   * Get WebRTC stats for quality monitoring.
   */
  async getStats(): Promise<RTCStatsReport | null> {
    if (!this.pc) {
      return null;
    }
    return this.pc.getStats();
  }

  /**
   * Get current connection state.
   */
  getConnectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState ?? null;
  }

  /**
   * Get current ICE connection state.
   */
  getIceConnectionState(): RTCIceConnectionState | null {
    return this.pc?.iceConnectionState ?? null;
  }

  /**
   * Check if peer connection is open and usable.
   */
  isConnected(): boolean {
    return this.pc?.connectionState === 'connected';
  }

  /**
   * Mute/unmute local audio track.
   * Returns the new enabled state.
   */
  setAudioEnabled(enabled: boolean): boolean {
    if (!this.pc) {
      return false;
    }

    for (const sender of this.pc.getSenders()) {
      if (sender.track?.kind === 'audio') {
        sender.track.enabled = enabled;
      }
    }
    return enabled;
  }
}

/**
 * Factory function to create a PeerConnectionManager with TURN credentials.
 * Fetches credentials from the backend before initializing.
 */
export async function createPeerConnection(
  config: PeerConnectionConfig
): Promise<PeerConnectionManager> {
  // Fetch TURN credentials from backend
  const credentials = await turnApi.getCredentials();

  // Build ICE servers array with TURN credentials
  const iceServers: RTCIceServer[] = credentials.uris.map((uri) => {
    // STUN URIs don't need credentials
    if (uri.startsWith('stun:')) {
      return { urls: uri };
    }
    // TURN URIs need username and credential
    return {
      urls: uri,
      username: credentials.username,
      credential: credentials.password,
    };
  });

  // Add Google STUN as fallback (no TURN, just for initial connectivity)
  iceServers.push({ urls: 'stun:stun.l.google.com:19302' });

  const manager = new PeerConnectionManager(config);
  await manager.initialize(iceServers);

  return manager;
}
