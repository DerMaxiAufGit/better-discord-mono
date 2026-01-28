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

  // Actions
  setMicId: (deviceId: string | null) => void
  setSpeakerId: (deviceId: string | null) => void
  setEchoCancellation: (enabled: boolean) => void
  setNoiseSuppression: (enabled: boolean) => void
  setAutoGainControl: (enabled: boolean) => void
  setRingtoneEnabled: (enabled: boolean) => void
  setRingTimeout: (seconds: number) => void
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

      // Actions
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
    }),
    {
      name: 'audio-settings',
      // Only persist the settings values, not the actions
      partialize: (state) => ({
        selectedMicId: state.selectedMicId,
        selectedSpeakerId: state.selectedSpeakerId,
        echoCancellation: state.echoCancellation,
        noiseSuppression: state.noiseSuppression,
        autoGainControl: state.autoGainControl,
        ringtoneEnabled: state.ringtoneEnabled,
        ringTimeout: state.ringTimeout,
      }),
    }
  )
)
