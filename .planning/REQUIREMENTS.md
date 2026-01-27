# Requirements: Self-Hosted Communication Platform

**Defined:** 2025-01-27
**Core Value:** Own your communication — your server, your data, your rules.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in and stay logged in across sessions (persistent auth)

### Messaging

- [ ] **MSG-01**: User can send 1:1 direct messages (E2E encrypted)
- [ ] **MSG-02**: User can view message history with a contact (encrypted at rest)

### Calls

- [ ] **CALL-01**: User can start a 1:1 voice call (P2P/WebRTC)
- [ ] **CALL-02**: User can mute/unmute during calls

### UI/UX

- [ ] **UI-01**: User can toggle between light and dark mode
- [ ] **UI-02**: App works on mobile browsers (responsive design)
- [ ] **UI-03**: App shows loading states and handles errors gracefully

### Deployment

- [ ] **DEP-01**: Instance deploys via `docker compose up`
- [ ] **DEP-02**: Instance is configurable via environment variables
- [ ] **DEP-03**: Documentation covers setup and usage
- [ ] **DEP-04**: Containers include health checks

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Authentication

- **AUTH-03**: User receives email verification after signup
- **AUTH-04**: User can reset password via email link
- **AUTH-05**: User can enable 2FA/MFA

### Messaging

- **MSG-03**: User sees typing indicators
- **MSG-04**: User sees read receipts
- **MSG-05**: User can react to messages with emoji
- **MSG-06**: User can edit own messages
- **MSG-07**: User can delete own messages
- **MSG-08**: User can share files/images (E2E encrypted)
- **MSG-09**: User can format messages with Markdown

### Calls

- **CALL-03**: User can start a 1:1 video call (P2P/WebRTC)
- **CALL-04**: User can share screen during calls
- **CALL-05**: User can toggle camera on/off

### Groups (v2+)

- **GRP-01**: User can create group chats
- **GRP-02**: User can send messages to groups (E2E encrypted)
- **GRP-03**: User can start group voice calls (SFU)
- **GRP-04**: User can start group video calls (SFU)

### Servers (v2+)

- **SRV-01**: User can create servers with channels
- **SRV-02**: User can assign roles and permissions
- **SRV-03**: User can manage server members

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| OAuth/social login | Email/password sufficient for v1 |
| Mobile native apps | Web-first, native apps later |
| Federation | Single-instance focus for v1 |
| Multi-device sync | Breaks E2EE simplicity, requires complex key management |
| Server-side search | Incompatible with E2E encryption (zero-knowledge server) |
| AI features | Incompatible with E2E encryption |
| Real-time everything | Typing indicators, presence deferred to reduce v1 complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| MSG-01 | TBD | Pending |
| MSG-02 | TBD | Pending |
| CALL-01 | TBD | Pending |
| CALL-02 | TBD | Pending |
| UI-01 | TBD | Pending |
| UI-02 | TBD | Pending |
| UI-03 | TBD | Pending |
| DEP-01 | TBD | Pending |
| DEP-02 | TBD | Pending |
| DEP-03 | TBD | Pending |
| DEP-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 0
- Unmapped: 13 ⚠️

---
*Requirements defined: 2025-01-27*
*Last updated: 2025-01-27 after initial definition*
