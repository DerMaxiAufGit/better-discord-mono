/**
 * Ringtone generator using Web Audio API
 * Generates classic phone-style tones without requiring audio files
 */

let audioContext: AudioContext | null = null

// Singleton tone player - only one tone can play at a time
let currentTonePlayer: { stop: () => void } | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

interface TonePlayer {
  stop: () => void
}

/**
 * Stop any currently playing tone (singleton)
 */
export function stopCurrentTone(): void {
  console.log('[ringtone] stopCurrentTone called, currentTonePlayer:', currentTonePlayer)
  if (currentTonePlayer) {
    currentTonePlayer.stop()
    currentTonePlayer = null
  }
}

/**
 * Play a repeating ringtone pattern (for incoming calls)
 * Classic phone ring: two short tones followed by silence
 */
export function playRingtone(): TonePlayer {
  // Stop any existing tone first
  stopCurrentTone()

  const ctx = getAudioContext()
  let isPlaying = true
  let timeoutId: number | null = null
  let oscillator: OscillatorNode | null = null
  let gainNode: GainNode | null = null

  const playRingBurst = () => {
    if (!isPlaying) return

    // Create oscillator for ring tone
    oscillator = ctx.createOscillator()
    gainNode = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(440, ctx.currentTime) // A4 note

    // Add slight frequency modulation for more natural sound
    oscillator.frequency.setValueAtTime(440, ctx.currentTime)
    oscillator.frequency.setValueAtTime(480, ctx.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    // Fade out at end
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.4)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)

    // Schedule next ring after pause
    timeoutId = window.setTimeout(() => {
      if (isPlaying) {
        // Second ring of the pair
        playSecondRing()
      }
    }, 600)
  }

  const playSecondRing = () => {
    if (!isPlaying) return

    oscillator = ctx.createOscillator()
    gainNode = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(440, ctx.currentTime)
    oscillator.frequency.setValueAtTime(480, ctx.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.4)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)

    // Long pause before next ring pair
    timeoutId = window.setTimeout(() => {
      if (isPlaying) {
        playRingBurst()
      }
    }, 2000)
  }

  // Start playing
  playRingBurst()

  const player = {
    stop: () => {
      isPlaying = false
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      // Disconnect gain node first to immediately silence
      if (gainNode) {
        try {
          gainNode.disconnect()
        } catch {
          // Already disconnected
        }
        gainNode = null
      }
      if (oscillator) {
        try {
          oscillator.stop()
          oscillator.disconnect()
        } catch {
          // Already stopped
        }
        oscillator = null
      }
    },
  }

  // Set as current singleton
  currentTonePlayer = player
  return player
}

/**
 * Play ringback tone (for outgoing calls - what caller hears)
 * Standard ringback: single tone on/off pattern
 */
export function playRingback(): TonePlayer {
  // Stop any existing tone first
  stopCurrentTone()

  const ctx = getAudioContext()
  let isPlaying = true
  let timeoutId: number | null = null
  let oscillator: OscillatorNode | null = null
  let gainNode: GainNode | null = null

  const playTone = () => {
    if (!isPlaying) return

    oscillator = ctx.createOscillator()
    gainNode = ctx.createGain()

    // Standard ringback frequencies (US style: 440 + 480 Hz)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(440, ctx.currentTime)

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    // Tone duration: 2 seconds
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime + 1.9)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 2)

    // 4 second pause between tones
    timeoutId = window.setTimeout(() => {
      if (isPlaying) {
        playTone()
      }
    }, 4000)
  }

  // Start playing
  playTone()

  const player = {
    stop: () => {
      console.log('[ringtone] playRingback stop() called, isPlaying:', isPlaying)
      isPlaying = false
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      // Disconnect gain node first to immediately silence
      if (gainNode) {
        try {
          gainNode.disconnect()
          console.log('[ringtone] gainNode disconnected')
        } catch {
          // Already disconnected
        }
        gainNode = null
      }
      if (oscillator) {
        try {
          oscillator.stop()
          oscillator.disconnect()
          console.log('[ringtone] oscillator stopped')
        } catch {
          // Already stopped
        }
        oscillator = null
      }
    },
  }

  // Set as current singleton
  currentTonePlayer = player
  return player
}

/**
 * Resume audio context if suspended (required for autoplay policies)
 */
export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}
