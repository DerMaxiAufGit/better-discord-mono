# Roadmap: Self-Hosted Communication Platform

## Overview

This roadmap transforms a vision into a working product: a self-hosted, E2E encrypted communication platform for 1:1 messaging and calls. Starting from infrastructure foundations, we build through authentication and messaging to real-time calls, culminating in production-ready features. Each phase delivers complete, verifiable capabilities that compound toward the core value: own your communication.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Deployment** - Docker infrastructure, authentication, and basic UI
- [x] **Phase 2: E2E Encrypted Messaging** - Core value prop: private 1:1 messaging
- [x] **Phase 3: Voice/Video Calls** - Real-time P2P communication with WebRTC
- [x] **Phase 4: UI Polish & Production Readiness** - UX refinement and production hardening (v1.0.0)
- [ ] **Phase 5: Enhanced Communication** - Video calls, group messaging, file sharing (v1.1.0)
- [ ] **Phase 6: Social Features** - Profiles, friend requests, presence, search (v1.2.0)
- [ ] **Phase 7: Advanced Features** - Group calls, screen sharing, native apps (v2.0.0)

## Phase Details

### Phase 1: Foundation & Deployment
**Goal**: Secure infrastructure and user authentication working end-to-end via Docker Compose
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, DEP-01, DEP-02, DEP-03, DEP-04, UI-01
**Success Criteria** (what must be TRUE):
  1. User can deploy entire stack with `docker compose up` on fresh machine
  2. User can sign up with email/password and receive confirmation
  3. User can log in and stay logged in across browser restarts
  4. User can toggle between light and dark mode
  5. All containers report healthy status in Docker
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Docker infrastructure with PostgreSQL, health checks, and env config
- [x] 01-02-PLAN.md — Backend auth API (signup, login, refresh, logout)
- [x] 01-03-PLAN.md — Frontend shell with shadcn/ui and theme toggle
- [x] 01-04-PLAN.md — Frontend auth integration with protected routes
- [x] 01-05-PLAN.md — Documentation and final verification

### Phase 2: E2E Encrypted Messaging
**Goal**: Users can send private, encrypted messages that only participants can read
**Depends on**: Phase 1 (auth and WebSocket infrastructure)
**Requirements**: MSG-01, MSG-02
**Success Criteria** (what must be TRUE):
  1. User can send message to another user and see it appear in real-time
  2. User can view message history with a contact after logging back in
  3. Messages stored on server cannot be decrypted without client keys
  4. User's encryption keys never leave their device unencrypted
**Plans**: 6 plans

Plans:
- [x] 02-01-PLAN.md — Database schema and WebSocket infrastructure
- [x] 02-02-PLAN.md — Frontend crypto library with libsodium.js
- [x] 02-03-PLAN.md — Backend key and message services
- [x] 02-04-PLAN.md — Frontend messaging stores and WebSocket hook
- [x] 02-05-PLAN.md — Messaging UI components
- [x] 02-06-PLAN.md — User discovery and ContactsPage
- [x] 02-07-PLAN.md — Integration, verification, and password-derived keys

### Phase 3: Voice/Video Calls
**Goal**: Users can start peer-to-peer voice calls with reliable connectivity
**Depends on**: Phase 2 (WebSocket signaling already exists)
**Requirements**: CALL-01, CALL-02
**Success Criteria** (what must be TRUE):
  1. User can initiate voice call with online contact
  2. User receives incoming call notification and can accept/decline
  3. User can mute/unmute microphone during active call
  4. Calls establish successfully even behind NAT/firewall (TURN relay)
  5. User sees connection quality indicators during call
**Plans**: 7 plans

Plans:
- [x] 03-01-PLAN.md — Coturn Docker setup and TURN credentials endpoint
- [x] 03-02-PLAN.md — Call and settings Zustand stores
- [x] 03-03-PLAN.md — WebSocket call signaling and PeerConnection manager
- [x] 03-04-PLAN.md — Audio device management hooks
- [x] 03-05-PLAN.md — Call UI components and useCall orchestration
- [x] 03-06-PLAN.md — Audio settings in SettingsPage
- [x] 03-07-PLAN.md — Integration and end-to-end verification

### Phase 4: UI Polish & Production Readiness (v1.0.0)
**Goal**: Application provides polished, production-ready experience across devices
**Depends on**: Phase 3 (core features complete)
**Requirements**: UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. App layout adapts properly to mobile browser screens
  2. App shows loading states during long operations
  3. App handles network errors gracefully with user-friendly messages
  4. User can recover from common error scenarios without refreshing
**Plans**: 7 plans

Plans:
- [x] 04-01-PLAN.md — Install dependencies and create foundation hooks
- [x] 04-02-PLAN.md — Skeleton loading components and toast setup
- [x] 04-03-PLAN.md — Mobile bottom navigation and responsive AppShell
- [x] 04-04-PLAN.md — Mobile conversation view with back navigation
- [x] 04-05-PLAN.md — Connection banners and error toast integration
- [x] 04-06-PLAN.md — Session expired modal and auth recovery
- [x] 04-07-PLAN.md — Pull-to-refresh, mobile call UI, and verification

### Phase 5: Enhanced Communication (v1.1.0)
**Goal**: Expand communication capabilities with video, groups, and media sharing
**Depends on**: Phase 4 (stable v1.0.0 foundation)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. User can make video calls with camera feed
  2. User can create group conversations with multiple participants
  3. User can share files and images in conversations
  4. User can react to messages with emoji
  5. User sees typing indicators when contact is composing
**Plans**: 16 plans

Plans:
- [ ] 05-01-PLAN.md — Database schema for groups, files, reactions
- [ ] 05-02-PLAN.md — Frontend dependencies and typing indicator backend
- [ ] 05-03-PLAN.md — Video helper library (constraints, preview, blur)
- [ ] 05-04-PLAN.md — Backend group service and REST routes
- [ ] 05-05-PLAN.md — Backend file service with encrypted storage
- [ ] 05-06-PLAN.md — Backend reaction service
- [ ] 05-07-PLAN.md — Frontend group store and pairwise encryption
- [ ] 05-08-PLAN.md — Frontend file encryption and upload/download
- [ ] 05-09-PLAN.md — Frontend reaction store and typing indicator hook
- [ ] 05-10-PLAN.md — Video UI components (preview, controls, settings)
- [ ] 05-11-PLAN.md — Group UI components (creator, members, settings)
- [ ] 05-12-PLAN.md — File UI components (uploader, preview, lightbox)
- [ ] 05-13-PLAN.md — Reaction UI components (picker, quick bar, list)
- [ ] 05-14-PLAN.md — Typing indicator UI and message replies
- [ ] 05-15-PLAN.md — Video integration into call flow
- [ ] 05-16-PLAN.md — Integration and verification checkpoint

### Phase 6: Social Features (v1.2.0)
**Goal**: Add social networking features for better user connections
**Depends on**: Phase 5
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. User can upload and display profile avatar
  2. User can send/accept/decline friend requests
  3. User can see online/offline status of contacts
  4. User can block other users
  5. User can search through message history
**Plans**: TBD

### Phase 7: Advanced Features (v2.0.0)
**Goal**: Enterprise-grade features and native platform support
**Depends on**: Phase 6
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. User can join voice channels for group calls
  2. User can share screen during calls
  3. User receives push notifications on mobile
  4. User can use native desktop app (Electron)
  5. User can use native mobile app (React Native)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Deployment | 5/5 | ✓ Complete | 2026-01-27 |
| 2. E2E Encrypted Messaging | 7/7 | ✓ Complete | 2026-01-28 |
| 3. Voice/Video Calls | 7/7 | ✓ Complete | 2026-01-28 |
| 4. UI Polish & Production Readiness | 0/7 | Ready for execution | - |

---
*Roadmap created: 2026-01-27*
*Last updated: 2026-01-28 after Phase 4 planning*
