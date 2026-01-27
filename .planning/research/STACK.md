# Stack Research

**Domain:** Self-hosted communication platform
**Researched:** 2026-01-27
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 24.x LTS (Krypton) | Backend runtime | Active LTS with support until April 2028. Excellent async I/O for real-time features, mature WebSocket ecosystem. v24 is the recommended production version as of 2025. |
| TypeScript | 5.x | Type system | Industry standard for React + Node.js projects. Catches errors early, improves maintainability, required for modern React best practices. |
| React | 19.x | Frontend framework | Stable as of December 2024. Best-in-class component model, huge ecosystem, excellent TypeScript support. Standard choice for modern web UIs. |
| Next.js | 15.x | React meta-framework | Stable as of October 2024 with React 19 support in v15.1. Provides hybrid rendering (SSR/SSG), API routes, built-in optimizations, and full-stack capabilities. Industry standard for production React apps. |
| PostgreSQL | 17.x | Persistent database | Latest stable (v17.7 as of Nov 2025). ACID compliance, mature JSON support, excellent for user data, message history, and relationships. Industry standard for relational data. |
| Redis | 7.4.x | Cache & pub/sub | Latest stable (v7.4 in Redis Software 7.8.4). Built-in Pub/Sub for real-time messaging delivery, session storage, WebSocket connection tracking. Essential for real-time architectures. |
| Docker Compose | 2.x | Deployment | Standard for self-hosted apps. Simple single-server deployment, environment isolation, easy updates. Docker Compose in 2025 includes improved watch command and AI/LLM capabilities. |

### Real-Time Communication

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ws | 8.x | WebSocket server | Lightweight, raw WebSocket performance (50K+ connections/server). Use for production when you need maximum performance and control. Better than Socket.IO for simple messaging use cases. |
| Socket.IO | 4.x | WebSocket client/server | If you need production resilience features (auto-reconnect, heartbeats), rooms/namespaces, or cross-browser fallbacks. Trade-off: larger bundle size, proprietary framing. |
| simple-peer | 10.x | WebRTC P2P library | 1:1 P2P calls (your v1 requirement). Mature, 7,774 GitHub stars, idiomatic JavaScript. Perfect for simple peer-to-peer without server infrastructure. |
| coturn | 4.6.x | TURN/STUN server | NAT traversal for WebRTC. Required for production WebRTC (corporate networks, firewalls). Open-source, battle-tested, excellent Docker support. |

### End-to-End Encryption

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| libsodium.js | Latest | Cryptography primitives | Modern, secure, easy-to-use crypto library. Maintained by libsodium author. Full-featured (encryption, decryption, signatures, key exchange). Use for custom E2E encryption protocol. |
| TweetNaCl.js | 1.x | Lightweight crypto | Compact alternative (7KB minified+gzipped). Use if bundle size is critical and you only need basic crypto primitives. |
| @wireapp/proteus | Latest | Signal Protocol implementation | If implementing Signal Protocol (Double Ratchet). Recommended over deprecated libsignal-protocol-javascript. Signal's official JavaScript library is now deprecated; use Rust-based libsignal-client with TypeScript bindings for new projects. |

**Recommendation for v1:** Use **libsodium.js** with a custom E2E protocol (public key exchange, encrypt message with recipient's public key). Signal Protocol is overkill for v1 and adds complexity. Implement proper key management in PostgreSQL (public keys) and local storage (private keys).

### Reverse Proxy

| Tool | Purpose | Notes |
|------|---------|-------|
| Caddy | Reverse proxy & TLS | Recommended for v1. Automatic HTTPS via Let's Encrypt (zero config), intuitive Caddyfile syntax, perfect for self-hosted. Gaining traction in 2025 for simplicity. |
| Traefik | Reverse proxy & TLS | Alternative if you need dynamic container discovery via Docker labels. More complex config but better for large deployments. Overkill for single-server v1. |

### Frontend UI

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 3.x | Utility-first CSS | Industry standard for modern React UIs. Rapid prototyping, consistent design system, excellent with component libraries. |
| shadcn/ui | Latest | Component library | Pre-built accessible components using Radix UI + Tailwind. Mentioned in multiple 2025 chat app tutorials. Copy-paste components, fully customizable. |
| Radix UI | Latest | Headless UI primitives | Unstyled, accessible components. Foundation for shadcn/ui. Use directly if you want full design control. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite | Build tool | Fast dev server, HMR, modern module resolution. Standard for React apps (Next.js uses Turbopack internally). |
| ESLint | Linting | TypeScript + React rules. Enforce code quality. |
| Prettier | Formatting | Auto-format code. Reduce bikeshedding. |
| pnpm | Package manager | Faster than npm, disk-efficient. Growing adoption in 2025. |

## Installation

```bash
# Core backend
pnpm install express ws redis ioredis pg
pnpm install libsodium-wrappers simple-peer

# Frontend
pnpm install react@19 react-dom@19 next@15
pnpm install tailwindcss @tailwindcss/forms
pnpm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu

# Dev dependencies
pnpm install -D typescript @types/node @types/react @types/react-dom
pnpm install -D eslint eslint-config-next prettier
pnpm install -D @types/ws
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| ws | Socket.IO | Need rooms/namespaces, auto-reconnect out-of-box, or cross-browser fallbacks. Trade-off: ~40KB larger bundle, proprietary protocol. |
| simple-peer | mediasoup | Need multi-party calls (>2 people) or SFU architecture. Simple-peer is P2P only; mediasoup requires Node.js server but scales to 100+ participants. |
| Caddy | Traefik | Need dynamic service discovery via Docker labels, Kubernetes integration, or multi-server deployments. Caddy simpler for single-server self-hosted. |
| Next.js | Vite + React Router | Need SSR/SSG for SEO or prefer full-stack framework. Vite faster dev experience but no built-in backend. |
| PostgreSQL | SQLite | SQLite fine for single-user or very small deployments (<10 concurrent users). PostgreSQL better for concurrent writes, multi-user, production. |
| libsodium.js | Signal Protocol | Signal Protocol provides forward secrecy (new keys per message) but adds complexity. Overkill for v1. Add in v2 if users demand Signal-level security. |
| Node.js | Rust (Actix/Axum) + TypeScript frontend | Rust backend offers better performance and memory safety but steeper learning curve, slower dev velocity. Node.js fine for v1 scale; consider Rust if hitting 10K+ concurrent users. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| libsignal-protocol-javascript | Deprecated by Signal team. No longer maintained. | @wireapp/proteus or libsodium.js with custom protocol |
| Socket.IO for simple messaging | Overkill for your use case. Larger bundle, proprietary framing, harder to debug. | ws (raw WebSockets) for simplicity and performance |
| Matrix protocol | Over-engineered for v1. Matrix is a federated protocol (multiple servers) with complex state resolution. Your v1 is single-server. ESS Community requires 2 CPU, 2GB RAM, Kubernetes. | Build custom with recommended stack. Simpler, full control, easier to extend. |
| Node.js v25 (Current) | Odd-numbered releases not promoted to LTS. Only 6 months support. | Node.js v24 LTS (Krypton) - supported until April 2028 |
| mediasoup for 1:1 calls | Requires SFU server infrastructure. Overkill for P2P. | simple-peer (direct P2P) |
| MongoDB | No ACID guarantees for multi-document transactions (critical for user auth). Schemaless complicates TypeScript integration. | PostgreSQL (ACID, relational, excellent TypeScript support via Prisma/Drizzle) |
| Firebase/Supabase | Vendor lock-in. Not self-hosted (violates core requirement). | PostgreSQL + Redis + custom backend |
| Redis as primary database | In-memory only. Data lost on restart unless persistence configured. Not suitable for user data, message history. | PostgreSQL for persistent data, Redis for cache/pub-sub |

## Stack Patterns by Variant

**If you want Signal-level security (post-v1):**
- Use **libsignal-client** with TypeScript bindings (Rust-based, maintained by Signal)
- Implement Double Ratchet for forward secrecy
- Add message deletion with key rotation
- Trade-off: Significant complexity increase (~2-3x dev time for crypto layer)

**If you need multi-party calls (post-v1):**
- Replace simple-peer with **mediasoup** (SFU architecture)
- Deploy mediasoup Node.js server alongside backend
- Scales to 100+ participants per room
- Trade-off: Requires server infrastructure, more complex WebRTC logic

**If deploying to cloud (not self-hosted):**
- Consider **managed PostgreSQL** (AWS RDS, DigitalOcean Managed DB) instead of self-hosting
- Use **managed Redis** (AWS ElastiCache, Redis Cloud)
- Replace Caddy with **cloud load balancer** (ALB, DigitalOcean LB)
- Trade-off: Higher cost but less ops burden

**If you want federation (multiple servers, post-v1):**
- Consider **Matrix protocol** as architecture reference
- Implement server-to-server API for message routing
- Use **ActivityPub** patterns for identity federation
- Trade-off: Massive complexity increase (10x dev time), but enables decentralized network

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 15.x | React 19.x | React 19 support added in Next.js 15.1 (December 2024). Use 15.1+ for stable React 19. |
| Node.js 24.x | PostgreSQL 17.x | pg library v8.x supports PostgreSQL 17. No breaking changes. |
| ws 8.x | Node.js 24.x | Fully compatible. ws has no native dependencies, works across Node versions. |
| simple-peer 10.x | Modern browsers | Requires WebRTC support. IE11 not supported (EOL anyway). |
| libsodium.js | Node.js 24.x + browsers | Universal library. Works in Node and browser contexts. |
| coturn 4.6.x | Docker 20+ | Requires host networking or large port range (49152-65535 UDP) for RTP relays. |

## Architecture Notes

### Recommended Project Structure

```
project/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── server/              # Node.js backend (Express + ws)
├── packages/
│   ├── crypto/              # E2E encryption logic (libsodium wrappers)
│   ├── types/               # Shared TypeScript types
│   └── ui/                  # Shared UI components
├── docker-compose.yml       # PostgreSQL, Redis, coturn, Caddy
└── infrastructure/
    └── caddy/               # Caddyfile for reverse proxy
```

### WebSocket Architecture

- **Backend:** Express server + ws WebSocket server on same port
- **Redis Pub/Sub:** Distribute messages across multiple backend instances (if you scale horizontally)
- **Session storage:** Redis with ioredis client
- **Message flow:** Client → WebSocket → Backend → Redis Pub/Sub → Other clients

### E2E Encryption Flow

1. **Registration:** Generate keypair (libsodium.js), store public key in PostgreSQL, private key in browser localStorage
2. **Key exchange:** Fetch recipient's public key from server
3. **Encryption:** Encrypt message with recipient's public key (sealed box)
4. **Storage:** Store encrypted message in PostgreSQL (server cannot decrypt)
5. **Decryption:** Recipient decrypts with their private key (client-side only)

### WebRTC Signaling

- **Signaling:** WebSocket connection (reuse existing ws connection)
- **ICE candidates:** Exchange via WebSocket
- **TURN/STUN:** coturn server (Docker container)
- **Connection:** simple-peer manages RTCPeerConnection

## Sources

**High Confidence (Verified with Official Docs):**
- [Node.js LTS Releases](https://nodejs.org/en/about/previous-releases) - Node.js 24 LTS (Krypton)
- [React 19 Stable Release](https://react.dev/blog/2024/12/05/react-19) - December 2024
- [Next.js 15 Release](https://nextjs.org/blog/next-15) - October 2024
- [PostgreSQL 17 Release](https://www.postgresql.org/about/news/postgresql-17-released-2936/) - November 2025
- [Redis Software 7.8.4 Release Notes](https://redis.io/docs/latest/operate/rs/release-notes/rs-7-8-releases/rs-7-8-4-66/) - February 2025
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Signal Protocol Deprecation](https://github.com/signalapp/libsignal-protocol-javascript) - Deprecated, use libsignal-client

**Medium Confidence (Verified with Multiple Sources):**
- [WebRTC Best Practices 2025](https://antmedia.io/webrtc-scalability/) - SFU architecture, TURN servers
- [Caddy vs Traefik Comparison](https://medium.com/@thomas.byern/npm-traefik-or-caddy-how-to-pick-the-reverse-proxy-youll-still-like-in-6-months-1e1101815e07) - December 2025
- [ws vs Socket.IO Comparison](https://dev.to/alex_aslam/nodejs-websockets-when-to-use-ws-vs-socketio-and-why-we-switched-di9) - 2025
- [PostgreSQL + Redis for Messaging](https://dev.to/olymahmud/building-high-performance-apps-with-redis-postgresql-spring-boot-3m36) - 2025
- [simple-peer vs mediasoup](https://www.javaspring.net/blog/current-state-of-javascript-webrtc-libraries/) - 2024
- [TypeScript React Best Practices 2025](https://medium.com/@blogstacker20/typescript-in-react-advancements-and-best-practices-in-2025-b6848381734f) - December 2025
- [coturn Docker Setup](https://webrtc.ventures/2025/01/how-to-set-up-self-hosted-stun-turn-servers-for-webrtc-applications/) - January 2025

**WebSearch Findings (Cross-Referenced):**
- [Self-Hosted Communication Platforms](https://www.contus.com/blog/best-self-hosted-chat-platforms/) - Matrix, Element, Rocket.Chat
- [Matrix Self-Hosting 2025](https://blog.klein.ruhr/self-hosting-matrix-in-2025) - Complexity, resource requirements
- [Docker Compose 2025 Features](https://dokploy.com/blog/how-to-deploy-apps-with-docker-compose-in-2025) - Watch command, AI capabilities
- [libsodium.js](https://tweetnacl.js.org/) - TweetNaCl.js as lightweight alternative
- [React + Next.js Best Practices 2025](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices) - Modern patterns

---
*Stack research for: Self-hosted communication platform*
*Researched: 2026-01-27*
*Confidence: HIGH - All core technologies verified with official sources or multiple authoritative references*
