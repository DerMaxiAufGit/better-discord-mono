import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Audio devices
  selectedMicId: string | null        // null = system default
  selectedSpeakerId: string | null    // null = system default

  // Audio processing
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean

  // Call preferences
  ringtoneEnabled: boolean
  ringTimeout: number                  // seconds, default 30

  // Video settings
  videoQuality: 'low' | 'medium' | 'high'
  preferredCameraId: string | null
  blurEnabled: boolean
  selfViewPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  selfViewHidden: boolean

  // Audio actions
  setMicId: (deviceId: string | null) => void
  setSpeakerId: (deviceId: string | null) => void
  setEchoCancellation: (enabled: boolean) => void
  setNoiseSuppression: (enabled: boolean) => void
  setAutoGainControl: (enabled: boolean) => void
  setRingtoneEnabled: (enabled: boolean) => void
  setRingTimeout: (seconds: number) => void

  // Video actions
  setVideoQuality: (quality: 'low' | 'medium' | 'high') => void
  setPreferredCameraId: (deviceId: string | null) => void
  setBlurEnabled: (enabled: boolean) => void
  setSelfViewPosition: (position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void
  setSelfViewHidden: (hidden: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Audio devices - null means use system default
      selectedMicId: null,
      selectedSpeakerId: null,

      // Audio processing - all enabled by default for best quality
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,

      // Call preferences
      ringtoneEnabled: true,
      ringTimeout: 30,

      // Video settings - defaults match 05-10 localStorage pattern
      videoQuality: 'medium' as const,
      preferredCameraId: null,
      blurEnabled: false,
      selfViewPosition: 'bottom-right' as const,
      selfViewHidden: false,

      // Audio actions
      setMicId: (deviceId: string | null) => {
        set({ selectedMicId: deviceId })
      },

      setSpeakerId: (deviceId: string | null) => {
        set({ selectedSpeakerId: deviceId })
      },

      setEchoCancellation: (enabled: boolean) => {
        set({ echoCancellation: enabled })
      },

      setNoiseSuppression: (enabled: boolean) => {
        set({ noiseSuppression: enabled })
      },

      setAutoGainControl: (enabled: boolean) => {
        set({ autoGainControl: enabled })
      },

      setRingtoneEnabled: (enabled: boolean) => {
        set({ ringtoneEnabled: enabled })
      },

      setRingTimeout: (seconds: number) => {
        set({ ringTimeout: seconds })
      },

      // Video actions
      setVideoQuality: (quality: 'low' | 'medium' | 'high') => {
        set({ videoQuality: quality })
      },

      setPreferredCameraId: (deviceId: string | null) => {
        set({ preferredCameraId: deviceId })
      },

      setBlurEnabled: (enabled: boolean) => {
        set({ blurEnabled: enabled })
      },

      setSelfViewPosition: (position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
        set({ selfViewPosition: position })
      },

      setSelfViewHidden: (hidden: boolean) => {
        set({ selfViewHidden: hidden })
      },
    }),
    {
      name: 'call-settings',
      // Persist audio and video settings values, not the actions
      partialize: (state) => ({
        selectedMicId: state.selectedMicId,
        selectedSpeakerId: state.selectedSpeakerId,
        echoCancellation: state.echoCancellation,
        noiseSuppression: state.noiseSuppression,
        autoGainControl: state.autoGainControl,
        ringtoneEnabled: state.ringtoneEnabled,
        ringTimeout: state.ringTimeout,
        videoQuality: state.videoQuality,
        preferredCameraId: state.preferredCameraId,
        blurEnabled: state.blurEnabled,
        selfViewPosition: state.selfViewPosition,
        selfViewHidden: state.selfViewHidden,
      }),
    }
  )
)
