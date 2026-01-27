# Pitfalls Research

**Domain:** Self-hosted E2E encrypted communication platform
**Researched:** 2026-01-27
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Broken Encryption Due to Implementation Flaws

**What goes wrong:**
Over 70% of encryption vulnerabilities stem from implementation flaws rather than algorithm weaknesses. Developers attempt to build custom encryption solutions instead of using battle-tested cryptographic libraries, leading to subtle but critical security holes that can completely compromise message confidentiality.

**Why it happens:**
Developers underestimate cryptographic complexity and overestimate their ability to implement secure encryption. The desire to "understand the system fully" or "optimize for performance" leads to rolling custom crypto instead of using established libraries like libsignal.

**How to avoid:**
- Use the official Signal protocol implementation (libsignal) rather than implementing your own
- Never implement custom cryptographic algorithms or protocols
- Use established libraries: libsignal for E2EE messaging, proven WebRTC libraries for media
- Follow Signal's specifications exactly: X3DH for key exchange, Double Ratchet for session management
- Implement post-quantum resistance from the start using PQXDH to prevent harvest-now-decrypt-later attacks

**Warning signs:**
- Code reviews show custom base64 encoding/decoding of keys
- "We modified the Signal protocol to be simpler"
- Encryption keys stored in plain text configuration files
- No use of established cryptographic libraries in dependencies

**Phase to address:**
Phase 1 (Foundation & Auth) - Select and integrate libsignal library. Phase 2 (E2E Encryption) - Implement E2EE with verified libraries, not custom code.

---

### Pitfall 2: Key Management Catastrophe

**What goes wrong:**
Encryption keys stored alongside encrypted data, hardcoded in source code, or placed in configuration files. The most common failure: storing encryption keys in the same database as encrypted messages, making the entire encryption scheme pointless. Recovery keys not properly secured, allowing attackers who gain database access to decrypt everything.

**Why it happens:**
- Convenience during development becomes permanent architecture
- Misunderstanding of "encryption at rest" vs secure key management
- No clear separation between key storage and data storage from the start
- Docker secret management treated as an afterthought

**How to avoid:**
- Never store encryption keys in the database containing encrypted data
- Never hardcode secrets in source code, Dockerfiles, or docker-compose.yml
- Use Docker secrets or environment variables with proper access controls
- Implement proper key derivation from user passwords (never store user encryption keys server-side)
- For server-side keys (TURN credentials, database encryption), use separate key management service
- Document key rotation procedures before launch

**Warning signs:**
- `.env` files committed to git (even accidentally)
- Database schema includes `encryption_key` column
- Grep for "api_key" or "secret" shows hardcoded values
- Docker Compose has secrets in plain text environment variables
- No key rotation plan documented

**Phase to address:**
Phase 1 (Foundation & Auth) - Establish key management architecture. Prevent this before any encryption implementation begins.

---

### Pitfall 3: Unauthenticated Encryption (No Message Integrity)

**What goes wrong:**
Implementing encryption without authenticated encryption allows attackers to modify ciphertexts to decrypt messages byte-by-byte without knowing the key. Using AES-CBC without HMAC verification enables padding oracle attacks and other cryptographic breaks that completely bypass encryption.

**Why it happens:**
Developers focus on confidentiality (encryption) but forget integrity (authentication). Misunderstanding that encryption alone doesn't prevent tampering. Using older encryption modes (CBC) without understanding modern requirements for AEAD (Authenticated Encryption with Associated Data).

**How to avoid:**
- Use authenticated encryption modes exclusively: AES-GCM, ChaCha20-Poly1305
- Never use AES-CBC alone - if you must, always pair with HMAC-SHA256
- libsignal handles this automatically - don't bypass its encryption methods
- Verify message authentication tags before decryption
- Reject any messages failing integrity checks without processing

**Warning signs:**
- Code shows `AES-CBC` without corresponding HMAC verification
- Encryption code written before authentication code
- No integrity verification in message processing pipeline
- Messages accepted even when MAC verification fails

**Phase to address:**
Phase 2 (E2E Encryption) - Use authenticated encryption from day one. This is not an optimization, it's a requirement.

---

### Pitfall 4: WebRTC NAT Traversal Underestimation

**What goes wrong:**
P2P calls work perfectly in development but fail for 20-30% of users in production due to restrictive NATs and firewalls. STUN alone only achieves ~80% connectivity. Apps ship without properly configured TURN servers, leading to "calls don't work" reports from enterprise users and users behind symmetric NATs.

**Why it happens:**
- Testing only on developer networks with permissive NATs
- TURN server costs lead to "we'll add it later" decisions
- Misunderstanding that STUN is not sufficient for production
- Not testing with real-world network conditions (corporate firewalls, mobile carriers, symmetric NAT)

**How to avoid:**
- Plan for TURN server infrastructure from Phase 1 (costs money, needs deployment)
- Configure both STUN and TURN servers before first call implementation
- Use geographic distribution: 3-4 regional TURN servers to minimize latency
- Implement fallback chain: Direct P2P → STUN → TURN relay
- Monitor ICE gathering times (timeout non-responsive servers after 2-3 seconds)
- Test on restrictive networks: corporate VPNs, mobile carriers, symmetric NAT

**Warning signs:**
- WebRTC code only specifies STUN servers
- No TURN server costs in infrastructure budget
- Call success rates not monitored by network topology
- No testing documented on restrictive networks
- ICE gathering takes >5 seconds (indicates server issues)

**Phase to address:**
Phase 3 (Voice/Video Calls) - Deploy TURN infrastructure BEFORE implementing calls. Don't treat this as optional.

---

### Pitfall 5: Metadata Leaks Undermining Privacy

**What goes wrong:**
Messages encrypted end-to-end but metadata reveals who talks to whom, when, how often, message sizes, and online patterns. IP addresses logged in unencrypted WebSocket connections or WebRTC ICE candidates expose user location. Server logs contain timestamps and participant relationships that completely undermine the privacy promise despite E2EE.

**Why it happens:**
Focus on message content encryption while ignoring metadata collection. Using plain WebSocket (ws://) instead of encrypted (wss://). Not understanding that "who, when, how often" is often more valuable than message content. WebRTC reveals peer IP addresses by default through ICE.

**How to avoid:**
- Use WSS (encrypted WebSockets) exclusively, never plain WS
- Implement minimal logging: don't log message metadata, user relationships, or timestamps beyond security needs
- For WebRTC: Implement TURN-only mode option for privacy-conscious users to prevent IP disclosure
- Strip metadata from database after delivery confirmation
- Document exactly what metadata you collect and retention periods
- Consider implementing sealed sender patterns (though complex for v1)

**Warning signs:**
- Database schema stores `sent_at`, `from_user_id`, `to_user_id` indefinitely
- Server logs show "User A messaged User B at [timestamp]"
- WebSocket connections use `ws://` instead of `wss://`
- No metadata retention policy documented
- WebRTC implementation exposes IP addresses without user consent
- Analytics tracking message frequency per user

**Phase to address:**
Phase 1 (Foundation) - Use WSS from day one. Phase 2 (E2E Encryption) - Design minimal metadata architecture. Phase 4 (Screen Sharing) - Handle IP disclosure in WebRTC.

---

### Pitfall 6: Insecure Docker Deployment

**What goes wrong:**
Containers run as root, Docker socket exposed, secrets in docker-compose.yml plain text, using `latest` tags, images never updated. A single container compromise leads to full host takeover. Production deploys with development configurations that expose entire system.

**Why it happens:**
- Docker tutorials use root for simplicity, developers don't change it
- Quick development setups become production deployments
- "It works" becomes "ship it" without security hardening
- Not understanding Docker's security model and defaults

**How to avoid:**
- Run all containers as non-root users (specify USER in Dockerfile)
- Never expose Docker socket to containers (`-v /var/run/docker.sock`)
- Use Docker secrets for sensitive data, not environment variables in compose files
- Pin specific image versions, never use `latest` tag
- Implement `--security-opt=no-new-privileges` to prevent privilege escalation
- Use `--read-only` filesystem with `--tmpfs` for temporary storage
- Set resource limits: `--memory`, `--cpus`, `--pids-limit`
- Scan images for vulnerabilities before deployment
- Never use `--privileged` flag

**Warning signs:**
- Dockerfile doesn't specify USER directive
- docker-compose.yml contains plain text passwords
- Images tagged as `latest`
- No container scanning in CI/CD
- Containers have write access to entire filesystem
- No resource limits specified

**Phase to address:**
Phase 1 (Foundation) - Establish secure Docker baseline before any code. Use docker-compose template with security hardening from day one.

---

### Pitfall 7: Account Recovery vs E2EE Paradox

**What goes wrong:**
Users lose encryption keys and all message history becomes permanently irrecoverable. No "forgot password" recovery possible with E2EE, leading to user frustration and support burden. Alternatively, implementing server-side key escrow to enable recovery completely undermines E2EE security promise.

**Why it happens:**
Fundamental tension between usability (password recovery) and E2EE (no server access to keys). Not planning recovery mechanisms before implementation. Assuming users will safely store recovery keys (they won't). Pressure to add "helpful" recovery features that break security.

**How to avoid:**
- Accept that E2EE means no server-assisted account recovery
- Implement and document recovery key generation at account creation
- Make recovery key storage UX obvious and unavoidable
- Never implement server-side key escrow (breaks E2EE promise)
- Consider trusted contact recovery (Signal model) for v2+
- Document clearly: "We cannot recover your messages if you lose your password"
- Provide clear warnings before users finalize account setup

**Warning signs:**
- "Forgot password" flow includes message recovery
- Server stores user encryption keys "just in case"
- Marketing promises both "unbreakable E2EE" and "easy recovery"
- No recovery key generation implemented
- User testing shows confusion about key backup

**Phase to address:**
Phase 1 (Foundation & Auth) - Design recovery model before implementing auth. Make architectural choice early: E2EE with no recovery, or non-E2EE with recovery.

---

### Pitfall 8: Group Chat E2EE Complexity

**What goes wrong:**
1:1 E2EE works, but group chat implementation breaks security properties. Forward secrecy lost in groups (old messages decryptable if current key compromised). Group member changes require complex key rotation that's often implemented incorrectly. Sender keys shared across group don't provide post-compromise security.

**Why it happens:**
- Group chat added as "simple extension" of 1:1 without researching complexity
- Sender key approach prioritized for performance without understanding security tradeoffs
- Member add/remove not triggering proper key rotation
- Assuming group chat is in v1 scope without researching implementation difficulty

**How to avoid:**
- For v1: Skip group chat entirely, focus on 1:1 DMs only
- If groups required: Use Signal's sender key protocol, not custom design
- Implement key rotation on every member change (add/remove)
- Accept that group E2EE has weaker security properties than 1:1
- Document limitations: partial forward security, no backward security
- Consider groups a v2 feature after 1:1 is solid

**Warning signs:**
- Roadmap includes "group chat" in v1 without cryptographic research
- Group implementation reuses 1:1 Double Ratchet naively
- No key rotation on member changes
- "Groups are just multiple 1:1 chats" architecture

**Phase to address:**
Phase 0 (Scope Definition) - Remove group chat from v1 unless cryptographic expertise available. Defer to v2+.

---

### Pitfall 9: WebRTC Signaling Channel Security Gaps

**What goes wrong:**
WebRTC media encrypted with SRTP/DTLS, but signaling channel uses plain WebSocket (ws://) or HTTP, allowing man-in-the-middle attacks during call setup. Attacker intercepts SDP offers/answers to inject malicious TURN servers or modify media parameters. Authentication bypassed by hijacking WebSocket connections (CSWSH attacks).

**Why it happens:**
- Focus on media encryption, ignoring signaling security
- WebSocket tutorials use plain WS for simplicity
- Not understanding that signaling is the control plane - compromise it, compromise calls
- Treating WebSocket authentication as separate from call security

**How to avoid:**
- Use WSS (WebSocket Secure) exclusively for signaling
- Implement TLS 1.3 for all signaling traffic
- Validate origin headers to prevent Cross-Site WebSocket Hijacking
- Authenticate WebSocket connections before allowing signaling
- Never send auth tokens in query strings (they appear in logs)
- Verify SDP offers/answers haven't been tampered with
- Implement user consent prompts before camera/microphone access

**Warning signs:**
- WebSocket connections use `ws://` protocol
- No origin validation on WebSocket handshake
- Auth tokens passed in URL query parameters
- No user permission prompts for media access
- Same WebSocket handles both authenticated and public traffic

**Phase to address:**
Phase 1 (Foundation) - WSS infrastructure. Phase 3 (Voice/Video) - Secure signaling before implementing calls.

---

### Pitfall 10: Session Management Security Mistakes

**What goes wrong:**
Using persistent cookies for sessions in a self-hosted platform creates long-lived attack windows. Session tokens stored in localStorage vulnerable to XSS. Session invalidation only client-side (cookies cleared) but server-side session remains active. Sessions never expire, allowing hijacked tokens to work indefinitely.

**Why it happens:**
- Convenience of persistent login prioritized over security
- Not understanding difference between session cookies and persistent cookies
- Logout implementation that only clears client-side state
- No session expiration to avoid "annoying" users with re-authentication

**How to avoid:**
- Use non-persistent session cookies (expire when browser closes)
- Set HttpOnly and Secure flags on all session cookies
- Implement SameSite=Strict to prevent CSRF
- Server-side session invalidation on logout (don't trust client)
- Set reasonable session expiration (24 hours max for sensitive app)
- Regenerate session ID on authentication and privilege changes
- Store session tokens in httpOnly cookies, never localStorage

**Warning signs:**
- Session cookies have explicit expiration dates weeks/months out
- localStorage used for authentication tokens
- Logout only clears cookies without server API call
- No session expiration implemented
- Sessions survive server restarts (without explicit design decision)

**Phase to address:**
Phase 1 (Foundation & Auth) - Implement secure session management from the start. This is not an optimization, it's a requirement.

---

### Pitfall 11: Screen Sharing Privacy Leaks

**What goes wrong:**
Users accidentally share entire desktop showing sensitive information (passwords managers, personal messages, financial data) when they intended to share one window. No warnings before screen sharing starts. Screen sharing streams not properly encrypted or shared beyond intended recipient.

**Why it happens:**
- Browser APIs default to showing all sharing options equally
- No application-level warnings before sharing
- Assuming users understand the difference between window/tab/screen sharing
- Not implementing additional consent prompts

**How to avoid:**
- Guide users toward window/tab sharing, not full screen
- Implement explicit warning: "You're about to share your screen. Close sensitive information."
- Show preview of what's being shared before starting
- Default to window selection, require extra clicks for full screen
- Stop screen sharing immediately when call ends
- Encrypt screen sharing streams with same security as video (SRTP/DTLS)

**Warning signs:**
- No differentiated UX between window and screen sharing
- No warning prompts before sharing begins
- Screen sharing continues after call disconnect
- User testing shows accidental sensitive data exposure

**Phase to address:**
Phase 4 (Screen Sharing) - Implement privacy warnings and smart defaults before exposing screen share to users.

---

### Pitfall 12: Multi-Device Synchronization Breaking E2EE

**What goes wrong:**
Adding multi-device support requires sharing encryption keys across devices. Poor implementation exposes keys during sync, uses insecure cloud backup, or implements client fanout that leaks metadata about user's device list to all contacts. Sender required to encrypt separately for each recipient device, exposing who has how many devices.

**Why it happens:**
- Multi-device treated as simple feature addition to 1:1 messaging
- Using convenient but insecure sync (cloud storage, email keys)
- Not researching how Signal/WhatsApp implement multi-device correctly
- Underestimating cryptographic complexity of device management

**How to avoid:**
- For v1: Single device per account, defer multi-device to v2+
- If multi-device required: Use Signal's Sesame protocol for device management
- Never sync keys via cloud storage (iCloud, Google Drive, etc.)
- Implement QR code scanning for device linking (out-of-band key exchange)
- Use server-side device registry with E2EE key distribution
- Accept metadata leakage tradeoff or implement privacy-preserving alternatives

**Warning signs:**
- Roadmap includes "multi-device" in v1 without cryptographic research
- Key sync design involves cloud storage
- No device linking UX designed
- "Just send the key in encrypted message" approach

**Phase to address:**
Phase 0 (Scope Definition) - Remove multi-device from v1 scope. This is a v2+ feature requiring significant cryptographic design.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip TURN servers in MVP | Saves infrastructure cost ($50-200/mo) | 20-30% of calls fail silently | Never - users assume app is broken |
| Use AES-CBC instead of AES-GCM | Simpler implementation | Vulnerable to padding oracle attacks | Never - use authenticated encryption |
| Store keys in database | Easier backup/recovery | Complete encryption bypass if DB compromised | Never - defeats purpose of E2EE |
| Skip post-quantum crypto | Faster time to market | Vulnerable to harvest-now-decrypt-later | Only if documented for v2 upgrade |
| Plain WebSocket (ws://) | Works in development | Complete MitM attack surface | Never - always use WSS |
| Root user in containers | Fewer permission issues | Container escape = full host compromise | Never - always use non-root |
| "latest" Docker tags | Don't have to update compose | Unpredictable deployments, security holes | Never - pin specific versions |
| localStorage for tokens | Survives page refresh | XSS vulnerability | Never - use httpOnly cookies |
| No session expiration | Better UX (stay logged in) | Hijacked sessions work forever | Never - implement reasonable timeout |
| Skip recovery key UX | Simpler onboarding | Users lose all data on password loss | Never - make recovery key mandatory |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| TURN Servers | Hardcoding credentials in frontend | Generate temporary credentials server-side with HMAC |
| libsignal | Attempting to modify protocol for "simplicity" | Use library exactly as specified, no customization |
| WebRTC ICE | Only configuring STUN, skipping TURN | Configure both STUN and TURN, with TURN as fallback |
| Docker networking | Using default bridge network | Create custom bridge networks with proper isolation |
| Database encryption | Encrypting data with key in same DB | Separate key management from encrypted data storage |
| WebSocket auth | Sending tokens in URL query string | Use WSS with cookie authentication or secure headers |
| Let's Encrypt | Manual cert renewal in self-hosted | Implement certbot auto-renewal in Docker setup |
| Logging | Logging encrypted messages "for debugging" | Never log message content, minimal metadata only |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No WebSocket connection pooling | Memory leak, connection exhaustion | Implement connection limits per server | ~1000 concurrent users |
| Storing all messages in memory | Server RAM exhaustion on restart | Paginate message history, cache recent only | ~10K messages per user |
| No database indexing on lookup fields | Slow queries, timeout errors | Index user_id, conversation_id, created_at | ~100K messages |
| Single TURN server globally | High latency for distant users | Geographic distribution (3-4 regions) | Global user base |
| No WebRTC connection cleanup | Memory leak in long-running calls | Close connections properly on disconnect | After ~100 calls |
| Unbounded Docker logs | Disk space exhaustion | Configure log rotation in compose | ~10GB logs |
| No rate limiting on WebSocket | CPU exhaustion from malicious client | Implement per-connection message limits | Single attacker |
| Synchronous encryption/decryption | UI freeze on large messages | Use Web Workers or async crypto operations | >1MB message content |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-side encryption verification | Malicious client bypasses encryption | Server validates E2EE handshake, rejects unencrypted |
| No rate limiting on key exchange | DoS via forced re-keying | Limit key exchange requests per user/hour |
| Logging encryption keys "for debugging" | Complete confidentiality breach | Never log keys, use debug flags with safe defaults |
| Reusing nonces in AEAD encryption | Catastrophic encryption failure | Use libsignal's nonce handling, never manual |
| No DTLS verification in WebRTC | MitM attack on call media | Implement DTLS fingerprint verification |
| Docker secrets in environment variables | Exposed in `docker inspect` output | Use Docker Swarm secrets or vault solution |
| No input sanitization on WebSocket messages | XSS in real-time messages | Sanitize server-side, validate all inputs |
| Allowing container internet access by default | Malware C2 communication if compromised | Default deny, whitelist required external services |
| Storing TURN credentials in frontend code | Unlimited TURN server abuse | Generate time-limited credentials server-side |
| No certificate pinning for WSS | MitM despite TLS | Pin certificates for self-hosted known servers |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual encryption indicator | Users don't know messages are encrypted | Show lock icon, "E2EE" badge on all conversations |
| Cryptic key fingerprint verification | Users skip verification, vulnerable to MitM | Use emoji/word fingerprints, make comparison fun |
| No call quality indicator | Users blame app for network issues | Show connection quality, suggest switching to TURN |
| Screen sharing entire desktop by default | Accidental sensitive data exposure | Default to window sharing, warn before screen |
| Silent call failures | "App doesn't work" with no explanation | Show specific errors: "Cannot connect through firewall" |
| Automatic key backup to cloud | False E2EE promise, keys in iCloud/Google | Explicit manual recovery key, no automatic cloud |
| No offline message indicator | Users think messages sent when they're queued | Clear "Message will send when online" state |
| Recovery key shown once during signup | Users lose keys immediately | Force download/copy before proceeding |
| No "verify contact" workflow | Users vulnerable to MitM without knowing | In-app QR code scanning to verify fingerprints |
| Persistent login in E2EE app | Session hijacking exposes all messages | Short session timeout with re-auth for sensitive ops |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **E2EE Implementation:** Often missing authenticated encryption (AEAD) — verify messages have both confidentiality AND integrity
- [ ] **WebRTC Calls:** Often missing TURN server — verify call success rate across network types >95%
- [ ] **Session Management:** Often missing server-side invalidation — verify logout actually terminates server session
- [ ] **Docker Deployment:** Often missing non-root user configuration — verify containers don't run as UID 0
- [ ] **Key Management:** Often missing separation from encrypted data — verify keys stored outside main database
- [ ] **Recovery System:** Often missing mandatory backup enforcement — verify users cannot skip recovery key storage
- [ ] **WebSocket Security:** Often missing WSS in production config — verify no ws:// connections in production
- [ ] **Metadata Protection:** Often missing retention policy — verify old message metadata deleted, not just marked
- [ ] **Input Validation:** Often missing server-side sanitization — verify XSS protection on WebSocket messages
- [ ] **Resource Limits:** Often missing Docker memory/CPU caps — verify containers have explicit limits set
- [ ] **Certificate Renewal:** Often missing auto-renewal setup — verify Let's Encrypt certbot configured
- [ ] **Error Handling:** Often missing user-friendly call failure messages — verify users see actionable errors, not "failed"
- [ ] **Encryption Indicators:** Often missing visual E2EE confirmation — verify users see encryption status clearly
- [ ] **Permission Prompts:** Often missing camera/mic consent warnings — verify browser prompts before media access

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Keys stored in database | HIGH | Impossible to retrofit E2EE; must rebuild key management, rotate all keys |
| No TURN servers deployed | MEDIUM | Deploy TURN infrastructure, update client ICE config, redeploy |
| Using AES-CBC without HMAC | HIGH | Migrate to AES-GCM, re-encrypt all stored messages with authenticated encryption |
| Root containers in production | MEDIUM | Create non-root users, rebuild images, update deployments, test privileges |
| Plain WebSocket (ws://) in prod | LOW | Configure WSS with Let's Encrypt, update client URLs, redeploy |
| Hardcoded secrets in code | MEDIUM | Rotate all secrets, implement proper secret management, audit git history |
| No session expiration | LOW | Invalidate all sessions, implement expiration, force re-authentication |
| Group chat breaking security | HIGH | Remove group chat feature or reimplement with sender keys protocol |
| Multi-device breaking E2EE | HIGH | Disable multi-device or implement Sesame protocol for proper device management |
| Metadata logged indefinitely | MEDIUM | Delete historical metadata, implement retention policy, update logging |
| No recovery key system | MEDIUM | Cannot retrofit - accept support burden or redesign auth with recovery |
| XSS in WebSocket messages | LOW | Sanitize all inputs server-side, deploy hotfix, audit message history for exploits |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Broken crypto implementation | Phase 2 (E2E Encryption) | Verify libsignal integrated, not custom crypto |
| Key management catastrophe | Phase 1 (Foundation) | Verify keys stored separately from data |
| Unauthenticated encryption | Phase 2 (E2E Encryption) | Verify AEAD mode (GCM/Poly1305) in use |
| WebRTC NAT traversal failure | Phase 3 (Voice/Video) | Verify TURN servers deployed, >95% call success |
| Metadata leaks | Phase 1 (Foundation) + Phase 2 | Verify WSS, minimal logging, retention policy |
| Insecure Docker deployment | Phase 1 (Foundation) | Verify non-root containers, secret management |
| Account recovery paradox | Phase 1 (Auth) | Verify recovery key UX enforced at signup |
| Group chat E2EE complexity | Phase 0 (Scope) | Verify groups removed from v1 or properly researched |
| WebRTC signaling insecurity | Phase 3 (Voice/Video) | Verify WSS signaling, origin validation, DTLS |
| Session management mistakes | Phase 1 (Auth) | Verify httpOnly cookies, server-side invalidation |
| Screen sharing privacy leaks | Phase 4 (Screen Sharing) | Verify warnings, window-first UX, consent prompts |
| Multi-device sync breaking E2EE | Phase 0 (Scope) | Verify multi-device removed from v1 scope |

## Sources

### End-to-End Encryption
- [10 Cryptography Mistakes You're Probably Making](https://www.appsecengineer.com/blog/10-cryptography-mistakes-youre-probably-making)
- [Common Mistakes in Data Encryption Practices](https://supportstack.com/it-security/common-mistakes-in-data-encryption-practices-and-how-to-avoid-them/)
- [Signal Protocol Documentation](https://signal.org/docs/)
- [The Dangers of End-to-End Encryption](https://www.privacyguides.org/articles/2025/04/01/the-dangers-of-end-to-end-encryption/)

### WebRTC Security
- [A Study of WebRTC Security](https://webrtc-security.github.io/)
- [WebRTC Encryption and Security - All You Need to Know [2026]](https://www.mirrorfly.com/blog/webrtc-encryption-and-security/)
- [WebRTC Security: Best Practices and Key Risks Explained](https://www.digitalsamba.com/blog/webrtc-security)
- [WebRTC TURN Servers: When you NEED it](https://bloggeek.me/webrtc-turn/)
- [WebRTC NAT Traversal: Understanding STUN, TURN, and ICE Servers](https://www.nihardaily.com/168-webrtc-nat-traversal-understanding-stun-turn-and-ice)

### Metadata and Privacy
- [How Email Metadata Undermines Your Privacy: What You Need to Know in 2026](https://www.getmailbird.com/how-email-metadata-undermines-privacy/)
- [Encryption Isn't Enough: The Hidden Threat of Messaging Metadata](https://blogs.blackberry.com/en/2025/07/hidden-threat-messaging-metadata)
- [7 Privacy Risks in Encrypted Messaging Apps](https://www.europeanfinancialreview.com/7-ways-your-encrypted-messaging-app-isnt-protecting-your-privacy/)
- [Researcher Spotlights WhatsApp Metadata Leak](https://www.securityweek.com/researcher-spotlights-whatsapp-metadata-leak-as-meta-begins-rolling-out-fixes/)

### Self-Hosted Deployment
- [Critical unauthenticated RCE in n8n (CVE-2026-21858)](https://orca.security/resources/blog/cve-2026-21858-n8n-rce-vulnerability/)
- [How to Build a Full-Stack Communication Platform](https://talent500.com/blog/building-full-stack-communication-platform-guide/)

### Docker Security
- [9 Common Docker Container Security Vulnerabilities & Fixes](https://www.aikido.dev/blog/docker-container-security-vulnerabilities)
- [Docker Security - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [10 Common Docker Container Mistakes](https://www.virtualizationhowto.com/2025/08/10-common-docker-container-mistakes-and-how-to-avoid-them/)
- [Top 7 Docker security risks and best practices](https://www.chainguard.dev/supply-chain-security-101/top-7-docker-security-risks-and-best-practices)

### Group Chat and Multi-Device
- [End-to-End Encryption (E2EE) in Chat Applications — A Complete Guide](https://medium.com/@siddhantshelake/end-to-end-encryption-e2ee-in-chat-applications-a-complete-guide-12b226cae8f8)
- [Implementing End-to-End Encryption for Group Chats](https://medium.com/@asierr/implementing-end-to-end-encryption-for-group-chats-f068577c53de)
- [Challenges in E2E Encrypted Group Messaging](https://tjerandsilde.no/files/GroupMessagingReport.pdf)
- [The Ambassador protocol: Multi-device E2EE with Privacy](https://medium.com/@TalBeerySec/the-ambassador-protocol-multi-device-e2ee-with-privacy-5c906a2d210a)

### Account Recovery and Key Management
- [SoK: Web Authentication in the Age of End-to-End Encryption](https://arxiv.org/html/2406.18226v1)
- [How Signal, WhatsApp, Apple, and Google Handle Encrypted Chat Backups](https://www.eff.org/deeplinks/2025/05/back-it-back-it-let-us-begin-explain-encrypted-chat-backups)
- [Introducing Signal Secure Backups](https://signal.org/blog/introducing-secure-backups/)

### Session Management
- [Session Management - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Session Management: Best Practices & Common Vulnerabilities](https://www.1kosmos.com/security-glossary/session-management/)
- [10 Session Management Security Best Practices](https://endgrate.com/blog/10-session-management-security-best-practices)

### WebSocket Security
- [WebSocket Security: Top 8 Vulnerabilities and How to Solve Them](https://brightsec.com/blog/websocket-security-top-vulnerabilities/)
- [WebSocket Security - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- [Securing WebSockets: Identifying and Remediating Common Vulnerabilities](https://www.cyberchief.ai/2025/05/securing-websockets.html)

---
*Pitfalls research for: Self-hosted E2E encrypted communication platform*
*Researched: 2026-01-27*
