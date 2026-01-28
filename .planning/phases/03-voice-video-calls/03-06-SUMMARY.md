---
phase: "03"
plan: "06"
subsystem: "frontend/ui"
tags: ["audio", "settings", "webrtc", "device-selection", "ui"]
dependency-graph:
  requires: ["03-04", "03-05"]
  provides: ["audio-settings-ui", "device-configuration", "mic-test"]
  affects: ["03-07"]
tech-stack:
  added: []
  patterns: ["Switch component", "Select dropdown", "Audio level meter"]
key-files:
  created:
    - "frontend/src/components/settings/AudioSettings.tsx"
  modified:
    - "frontend/src/pages/SettingsPage.tsx"
decisions:
  - key: "inline-switch-select-components"
    choice: "Built Switch and Select components inline in AudioSettings"
    reason: "Simple styling consistent with existing UI patterns, avoids adding external deps"
  - key: "hear-yourself-playback"
    choice: "Loop mic audio to selected speaker with echo warning"
    reason: "Helps users verify audio chain but needs warning about feedback"
  - key: "permission-request-ui"
    choice: "Show permission request banner when not granted"
    reason: "Per CONTEXT.md, request mic permission in settings not during call"
metrics:
  duration: "2 minutes"
  completed: "2026-01-28"
---

# Phase 03 Plan 06: Audio Settings UI Summary

Audio device configuration UI with mic/speaker selection, microphone test, and processing toggles integrated into SettingsPage.

## What Was Built

### AudioSettings Component (frontend/src/components/settings/AudioSettings.tsx)

Complete audio configuration UI providing:

**Device Selection:**
- Microphone dropdown populated from useAudioDevices inputs
- Speaker dropdown populated from useAudioDevices outputs
- "System Default" as first option for each
- Refresh button to detect plugged/unplugged devices
- Permission request banner when microphone access not granted
- Speaker selection disabled with message if setSinkId not supported

**Microphone Test:**
- "Test Microphone" button starts audio capture
- Real-time level meter visualization (green/yellow/red based on level)
- "Hear Yourself" toggle for audio playback through selected speaker
- Echo warning when playback enabled
- Stop Test button for cleanup

**Audio Processing Toggles:**
- Echo cancellation switch (updates settingsStore)
- Noise suppression switch
- Auto gain control switch
- All persist via Zustand persist middleware

**Call Preferences:**
- Ringtone enabled toggle
- Ring timeout number input (10-60 seconds)

### SettingsPage Integration (frontend/src/pages/SettingsPage.tsx)

- Added AudioSettings import
- New "Audio" section after "Appearance" section
- Clean section header with AudioSettings component

## Implementation Details

### Switch Component
```typescript
function Switch({ checked, onCheckedChange, disabled }) {
  // Accessible toggle with keyboard support
  // Styled consistent with shadcn patterns
}
```

### Audio Level Meter
```typescript
function AudioLevelMeter({ level }: { level: number }) {
  // Color coding: green < 40%, yellow 40-70%, red > 70%
  // Width transitions for smooth animation
}
```

### Key Features
- Cleanup on unmount stops streams and audio context
- Device change auto-restarts mic test with new device
- Permission state tracked and displayed appropriately
- Speaker setSinkId support detected at runtime

## Deviations from Plan

None - plan executed exactly as written.

## Verification Completed

1. Audio section visible in SettingsPage - confirmed via grep
2. Device dropdowns configured - uses useAudioDevices hook
3. Device selection updates settingsStore - via setMicId/setSpeakerId
4. Mic test with real-time level visualization - uses useAudioLevel hook
5. "Hear yourself" feature with echo warning - implemented
6. Processing toggles persist - via settingsStore Zustand persist
7. Ring timeout and ringtone settings save - via settingsStore

## Files Changed

| File | Change |
|------|--------|
| frontend/src/components/settings/AudioSettings.tsx | Created - 471 lines |
| frontend/src/pages/SettingsPage.tsx | Added Audio section import and usage |

## Next Steps

03-07 will integrate call components (IncomingCallBanner, ActiveCallWindow) into the main app layout and wire up call initiation from contacts/conversations.
