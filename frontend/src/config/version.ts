/**
 * Application version and changelog
 */

export const APP_VERSION = '1.2.0'
export const APP_NAME = 'ChatApp'

export interface RoadmapPhase {
  version: string
  title: string
  status: 'completed' | 'current' | 'planned'
  features: string[]
}

export const ROADMAP: RoadmapPhase[] = [
  {
    version: '1.0.0',
    title: 'Foundation & Core Features',
    status: 'completed',
    features: [
      'User registration and authentication',
      'End-to-end encrypted messaging',
      'Real-time message delivery',
      'Voice calls with WebRTC',
      'Mobile-responsive design',
      'Dark/Light theme support',
      'Connection recovery and offline support',
    ],
  },
  {
    version: '1.1.0',
    title: 'Enhanced Communication',
    status: 'completed',
    features: [
      'Video calls',
      'Group messaging',
      'File sharing',
      'Message reactions',
      'Typing indicators',
    ],
  },
  {
    version: '1.2.0',
    title: 'Social Features',
    status: 'current',
    features: [
      'User profiles with avatars',
      'Friend requests system',
      'Online/offline status',
      'User blocking',
      'Message search',
    ],
  },
  {
    version: '2.0.0',
    title: 'Advanced Features',
    status: 'planned',
    features: [
      'Voice channels (group calls)',
      'Screen sharing',
      'Push notifications',
      'Desktop app (Electron)',
      'Mobile app (React Native)',
    ],
  },
]

export const CHANGELOG = [
  {
    version: '1.2.0',
    date: '2026-02-24',
    changes: [
      'Social layer rollout in progress',
      'User avatars and profile surfaces',
      'Friend request flow',
      'Presence system with status and visibility controls',
      'Blocking and unblock restore behavior',
      'Message search and indexing',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-02-10',
    changes: [
      'Video call support on top of existing WebRTC voice calls',
      'Group messaging',
      'File upload and attachment delivery',
      'Message reactions',
      'Typing indicators for direct and group conversations',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-01-28',
    changes: [
      'Initial release',
      'End-to-end encrypted messaging with XChaCha20-Poly1305',
      'Voice calls with WebRTC and TURN relay support',
      'Mobile-optimized UI with bottom navigation',
      'Automatic reconnection with message queueing',
      'Session recovery without losing app state',
    ],
  },
]
