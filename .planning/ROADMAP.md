# Roadmap: Self-Hosted Communication Platform

## Overview

This roadmap transforms a vision into a working product: a self-hosted, E2E encrypted communication platform for 1:1 messaging and calls. Starting from infrastructure foundations, we build through authentication and messaging to real-time calls, culminating in production-ready features. Each phase delivers complete, verifiable capabilities that compound toward the core value: own your communication.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Deployment** - Docker infrastructure, authentication, and basic UI
- [ ] **Phase 2: E2E Encrypted Messaging** - Core value prop: private 1:1 messaging
- [ ] **Phase 3: Voice/Video Calls** - Real-time P2P communication with WebRTC
- [ ] **Phase 4: UI Polish & Production Readiness** - UX refinement and production hardening

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
**Plans**: TBD

Plans:
- [ ] TBD during planning

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
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 4: UI Polish & Production Readiness
**Goal**: Application provides polished, production-ready experience across devices
**Depends on**: Phase 3 (core features complete)
**Requirements**: UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. App layout adapts properly to mobile browser screens
  2. App shows loading states during long operations
  3. App handles network errors gracefully with user-friendly messages
  4. User can recover from common error scenarios without refreshing
**Plans**: TBD

Plans:
- [ ] TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Deployment | 5/5 | ✓ Complete | 2026-01-27 |
| 2. E2E Encrypted Messaging | 0/TBD | Not started | - |
| 3. Voice/Video Calls | 0/TBD | Not started | - |
| 4. UI Polish & Production Readiness | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-27*
*Last updated: 2026-01-27 after Phase 1 completion*
