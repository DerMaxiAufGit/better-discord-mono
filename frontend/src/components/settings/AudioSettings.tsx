import * as React from 'react'
import { Mic, Volume2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAudioDevices } from '@/lib/webrtc/useAudioDevices'
import { useAudioLevel } from '@/lib/webrtc/useAudioLevel'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'

// Switch component for toggles
function Switch({
  checked,
  onCheckedChange,
  disabled = false
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// Select dropdown component
function Select({
  value,
  onValueChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50'
      )}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// Audio level meter visualization
function AudioLevelMeter({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-75 rounded-full',
            level > 70 ? 'bg-red-500' : level > 40 ? 'bg-yellow-500' : 'bg-green-500'
          )}
          style={{ width: `${Math.min(level, 100)}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{level}%</span>
    </div>
  )
}

export function AudioSettings() {
  const {
    devices,
    isLoading,
    error: deviceError,
    permissionState,
    refresh,
    getAudioStream,
    setSpeaker,
  } = useAudioDevices()

  const {
    selectedMicId,
    selectedSpeakerId,
    echoCancellation,
    noiseSuppression,
    autoGainControl,
    ringtoneEnabled,
    ringTimeout,
    setMicId,
    setSpeakerId,
    setEchoCancellation,
    setNoiseSuppression,
    setAutoGainControl,
    setRingtoneEnabled,
    setRingTimeout,
  } = useSettingsStore()

  const { level, start: startLevel, stop: stopLevel } = useAudioLevel()

  // Mic test state
  const [isTesting, setIsTesting] = React.useState(false)
  const [hearYourself, setHearYourself] = React.useState(false)
  const [testError, setTestError] = React.useState<string | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  // Check if setSinkId is supported for speaker selection
  const speakerSelectionSupported = React.useMemo(() => {
    const audio = document.createElement('audio')
    return 'setSinkId' in audio
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      stopLevel()
    }
  }, [stopLevel])

  // Handle microphone selection
  const handleMicChange = (deviceId: string) => {
    setMicId(deviceId === 'default' ? null : deviceId)
    // If currently testing, restart with new device
    if (isTesting) {
      stopMicTest()
      // Brief delay to allow cleanup
      setTimeout(() => startMicTest(deviceId === 'default' ? undefined : deviceId), 100)
    }
  }

  // Handle speaker selection
  const handleSpeakerChange = async (deviceId: string) => {
    setSpeakerId(deviceId === 'default' ? null : deviceId)
    // Update the playback audio element if testing
    if (audioRef.current && hearYourself) {
      try {
        await setSpeaker(audioRef.current, deviceId === 'default' ? '' : deviceId)
      } catch {
        // Ignore errors for now
      }
    }
  }

  // Start microphone test
  const startMicTest = async (deviceId?: string) => {
    setTestError(null)
    try {
      const stream = await getAudioStream(deviceId)
      streamRef.current = stream
      startLevel(stream)
      setIsTesting(true)
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Failed to start microphone test')
      setIsTesting(false)
    }
  }

  // Stop microphone test
  const stopMicTest = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    stopLevel()
    setIsTesting(false)
    setHearYourself(false)
    if (audioRef.current) {
      audioRef.current.srcObject = null
    }
  }

  // Toggle hear yourself
  const toggleHearYourself = async () => {
    if (!hearYourself && streamRef.current) {
      // Enable playback
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      audioRef.current.srcObject = streamRef.current

      // Set speaker if selected
      if (selectedSpeakerId && speakerSelectionSupported) {
        try {
          await setSpeaker(audioRef.current, selectedSpeakerId)
        } catch {
          // Ignore, use default
        }
      }

      audioRef.current.play().catch(() => {
        setTestError('Could not play audio')
      })
      setHearYourself(true)
    } else {
      // Disable playback
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.srcObject = null
      }
      setHearYourself(false)
    }
  }

  // Request microphone permission
  const requestPermission = async () => {
    setTestError(null)
    try {
      const stream = await getAudioStream()
      // Immediately stop the stream, we just wanted permission
      stream.getTracks().forEach((track) => track.stop())
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Failed to request permission')
    }
  }

  // Build device options
  const micOptions = React.useMemo(() => {
    const options = [{ value: 'default', label: 'System Default' }]
    devices.inputs.forEach((device) => {
      options.push({
        value: device.deviceId,
        label: device.label || `Microphone ${options.length}`,
      })
    })
    return options
  }, [devices.inputs])

  const speakerOptions = React.useMemo(() => {
    const options = [{ value: 'default', label: 'System Default' }]
    devices.outputs.forEach((device) => {
      options.push({
        value: device.deviceId,
        label: device.label || `Speaker ${options.length}`,
      })
    })
    return options
  }, [devices.outputs])

  // Check if labels are empty (permission not granted yet)
  const labelsEmpty = devices.inputs.length > 0 && !devices.inputs[0].label

  return (
    <div className="space-y-6">
      {/* Device Selection */}
      <div className="space-y-4">
        {/* Permission request */}
        {permissionState !== 'granted' && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border border-border">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">Microphone Access Required</p>
              <p className="text-xs text-muted-foreground">
                Grant permission to see device names and test your microphone
              </p>
            </div>
            <Button size="sm" onClick={requestPermission} disabled={permissionState === 'denied'}>
              {permissionState === 'denied' ? 'Permission Denied' : 'Grant Access'}
            </Button>
          </div>
        )}

        {labelsEmpty && permissionState === 'granted' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Grant permission to see device names</span>
          </div>
        )}

        {/* Microphone Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Microphone</label>
          </div>
          {devices.inputs.length === 0 && !isLoading ? (
            <p className="text-sm text-muted-foreground">No microphones found</p>
          ) : (
            <Select
              value={selectedMicId || 'default'}
              onValueChange={handleMicChange}
              options={micOptions}
              disabled={isLoading}
            />
          )}
        </div>

        {/* Speaker Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Speaker</label>
          </div>
          {!speakerSelectionSupported ? (
            <p className="text-sm text-muted-foreground">
              Speaker selection not supported in this browser
            </p>
          ) : devices.outputs.length === 0 && !isLoading ? (
            <p className="text-sm text-muted-foreground">No speakers found</p>
          ) : (
            <Select
              value={selectedSpeakerId || 'default'}
              onValueChange={handleSpeakerChange}
              options={speakerOptions}
              disabled={isLoading}
            />
          )}
        </div>

        {/* Refresh devices */}
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh Devices
        </Button>

        {deviceError && (
          <p className="text-sm text-destructive">{deviceError}</p>
        )}
      </div>

      {/* Microphone Test */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-sm font-medium">Microphone Test</h3>

        {!isTesting ? (
          <Button onClick={() => startMicTest(selectedMicId || undefined)}>
            <Mic className="h-4 w-4 mr-2" />
            Test Microphone
          </Button>
        ) : (
          <div className="space-y-3">
            <AudioLevelMeter level={level} />

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={toggleHearYourself}>
                {hearYourself ? 'Stop Playback' : 'Hear Yourself'}
              </Button>
              <Button variant="destructive" onClick={stopMicTest}>
                Stop Test
              </Button>
            </div>

            {hearYourself && (
              <p className="text-xs text-yellow-600 dark:text-yellow-500">
                Warning: You may hear echo. Use headphones or keep volume low.
              </p>
            )}
          </div>
        )}

        {testError && (
          <p className="text-sm text-destructive">{testError}</p>
        )}
      </div>

      {/* Audio Processing */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-sm font-medium">Audio Processing</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Echo Cancellation</p>
              <p className="text-xs text-muted-foreground">
                Reduces echo from speakers
              </p>
            </div>
            <Switch checked={echoCancellation} onCheckedChange={setEchoCancellation} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Noise Suppression</p>
              <p className="text-xs text-muted-foreground">
                Filters background noise
              </p>
            </div>
            <Switch checked={noiseSuppression} onCheckedChange={setNoiseSuppression} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Auto Gain Control</p>
              <p className="text-xs text-muted-foreground">
                Automatically adjusts volume
              </p>
            </div>
            <Switch checked={autoGainControl} onCheckedChange={setAutoGainControl} />
          </div>
        </div>
      </div>

      {/* Call Preferences */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-sm font-medium">Call Preferences</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Ringtone</p>
              <p className="text-xs text-muted-foreground">
                Play sound for incoming calls
              </p>
            </div>
            <Switch checked={ringtoneEnabled} onCheckedChange={setRingtoneEnabled} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Ring Timeout</p>
                <p className="text-xs text-muted-foreground">
                  Seconds before auto-declining (10-60)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={10}
                  max={60}
                  value={ringTimeout}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val) && val >= 10 && val <= 60) {
                      setRingTimeout(val)
                    }
                  }}
                  className="w-20 text-center"
                />
                <span className="text-sm text-muted-foreground">sec</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
