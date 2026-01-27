# Self-Hosted Communication Platform

## What This Is

A self-hostable, end-to-end encrypted communication platform for messaging and calls. Think Discord's UX with Signal's privacy model — users own their server, their data, and their conversations. Deployable via Docker Compose for anyone who wants to run their own instance.

## Core Value

**Own your communication.** Your server, your data, your rules. Privacy through self-hosting and E2E encryption.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can sign up with email and password
- [ ] User can log in and stay logged in across sessions (persistent auth)
- [ ] User can log out
- [ ] User can send 1:1 direct messages (E2E encrypted)
- [ ] User can receive messages in real-time
- [ ] User can start a 1:1 voice call (P2P/WebRTC)
- [ ] User can start a 1:1 video call (P2P/WebRTC)
- [ ] User can share screen during calls
- [ ] User can toggle between light and dark mode
- [ ] Instance is deployable via `docker compose up`

### Out of Scope

- Group chats — deferred to v2 (adds key distribution complexity for E2E)
- Group calls — deferred to v2 (requires SFU infrastructure)
- Servers and channels — deferred to v2+ (Discord-style communities)
- Roles and permissions — deferred to v2+
- OAuth/social login — email/password sufficient for v1
- Mobile apps — web-first, native apps later
- Federation — single-instance focus for v1

## Context

**Motivation:** Existing platforms either lack privacy (Discord) or lack self-hosting simplicity (Matrix/Element). The goal is a middle ground: Discord-like experience that anyone can deploy and own.

**Architecture direction:**
- P2P for 1:1 calls (no server involvement in media)
- Hybrid approach planned for v2 group calls (P2P for small, SFU for large)
- E2E encryption means server never sees plaintext messages
- WebRTC for real-time communication

**Target deployment:** Docker Compose — single command setup, accessible to non-experts.

## Constraints

- **Deployment**: Must run via Docker Compose — simplicity is key for self-hosters
- **Privacy**: E2E encryption for all messages — server is zero-knowledge for content
- **P2P calls**: 1:1 calls must be peer-to-peer, no server relay for v1
- **Tech stack**: No constraints — pick what's best for the job

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| P2P for 1:1 calls | Privacy, reduced server load | — Pending |
| E2E encryption for messages | Core value proposition | — Pending |
| Docker Compose deployment | Accessible to self-hosters | — Pending |
| Web-first (no mobile v1) | Reduce scope, ship faster | — Pending |

---
*Last updated: 2025-01-27 after initialization*
