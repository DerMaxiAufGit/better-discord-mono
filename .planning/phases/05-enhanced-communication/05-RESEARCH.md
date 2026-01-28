# Phase 5: Enhanced Communication - Research

**Researched:** 2026-01-28
**Domain:** WebRTC video calls, E2E encrypted group messaging, encrypted file sharing, emoji reactions, typing indicators
**Confidence:** HIGH

## Summary

Phase 5 expands the platform with video calls, group conversations, file/image sharing, message reactions, and typing indicators. All features maintain E2E encryption consistency with existing Phase 2 implementation (libsodium XChaCha20-Poly1305).

**Technical domains investigated:**
1. **Video Calls**: WebRTC getUserMedia API for camera access, MediaPipe Selfie Segmentation for background blur, canvas manipulation for video processing
2. **Group Encryption**: Pairwise encryption approach (Signal-style) for groups, sender keys for optimization, multi-device key distribution
3. **File Sharing**: Streaming encryption with libsodium SecretStream API, chunked upload/download, client-side encryption before upload
4. **Reactions & Emoji**: Twemoji with virtualized emoji picker (react-window), cross-platform consistency
5. **Typing Indicators**: WebSocket event debouncing, timeout-based state management

**Primary recommendation:** Use existing libsodium for all encryption (messages, files, reactions), extend WebRTC infrastructure from Phase 3, implement pairwise group encryption to avoid complex key distribution, leverage virtualized emoji picker for performance.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| libsodium-wrappers-sumo | 0.8.2+ | File/group encryption | Already integrated Phase 2, SecretStream API for large files, battle-tested |
| @mediapipe/selfie_segmentation | Latest | Background blur/virtual backgrounds | Google's official ML solution, used in Google Meet, browser-compatible |
| emoji-picker-react | 5.x | Emoji picker with Twemoji | Most popular React emoji picker (500k+ weekly downloads), built-in Twemoji support |
| yet-another-react-lightbox | 3.x | Image lightbox gallery | Modern, actively maintained, supports zoom/pan, best-in-class UX |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-window | 1.8+ | Virtualized emoji list | For performant scrolling (1000+ emoji), only renders visible items |
| @mediapipe/tasks-vision | Latest (fallback) | Alternative to selfie_segmentation | If selfie_segmentation deprecated, same API surface |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pairwise group encryption | Sender Keys protocol | Sender Keys more efficient for large groups (200+), but adds complexity. Pairwise simpler for initial implementation |
| MediaPipe | TensorFlow.js BodyPix | BodyPix more control, MediaPipe better performance and Google-backed |
| emoji-picker-react | Custom with react-twemoji | Custom gives full control, library gives out-of-box search/categories/virtualization |
| libsodium SecretStream | WebCrypto API AES-GCM | WebCrypto native browser support, libsodium maintains consistency with Phase 2 |

**Installation:**
```bash
# Frontend
npm install @mediapipe/selfie_segmentation emoji-picker-react yet-another-react-lightbox react-window

# Already installed from Phase 2
# libsodium-wrappers-sumo
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── lib/
│   ├── crypto/
│   │   ├── fileEncryption.ts        # SecretStream for files
│   │   ├── groupEncryption.ts       # Pairwise group message encryption
│   │   └── reactionEncryption.ts    # Reaction metadata encryption
│   ├── video/
│   │   ├── backgroundBlur.ts        # MediaPipe integration
│   │   ├── videoConstraints.ts      # getUserMedia helpers
│   │   └── videoQuality.ts          # Quality presets
│   └── file/
│       ├── chunkedUpload.ts         # Multipart upload
│       └── fileDownload.ts          # Streaming decryption
├── stores/
│   ├── groupStore.ts                # Group state, members, permissions
│   ├── fileStore.ts                 # Upload/download progress tracking
│   └── reactionStore.ts             # Reaction state per message
├── components/
│   ├── video/
│   │   ├── VideoPreview.tsx         # Pre-call camera preview
│   │   ├── VideoControls.tsx        # Camera/blur toggles
│   │   └── VideoSettings.tsx        # Quality/device selection
│   ├── groups/
│   │   ├── GroupCreator.tsx         # Create group flow
│   │   ├── MemberList.tsx           # Collapsible sidebar
│   │   └── GroupSettings.tsx        # Permissions, roles, invite
│   ├── files/
│   │   ├── FileUploader.tsx         # Drag-drop, multi-file
│   │   ├── FilePreview.tsx          # Inline image/video
│   │   └── Lightbox.tsx             # Full-screen gallery
│   ├── reactions/
│   │   ├── ReactionPicker.tsx       # emoji-picker-react wrapper
│   │   ├── QuickReactions.tsx       # 5-6 common emoji bar
│   │   └── ReactionList.tsx         # User list on hover
│   └── typing/
│       └── TypingIndicator.tsx      # "Name is typing..."

backend/src/
├── services/
│   ├── groupService.ts              # Group CRUD, member management
│   ├── fileService.ts               # File storage, cleanup
│   ├── reactionService.ts           # Store/retrieve reactions
│   └── typingService.ts             # Broadcast typing events
├── routes/
│   ├── groups.ts                    # Group REST endpoints
│   ├── files.ts                     # Upload/download endpoints
│   └── reactions.ts                 # Reaction endpoints
└── db/
    └── migrations/
        └── 005_groups_files_reactions.sql

postgres/
└── init.sql                         # Add tables: groups, group_members, files, reactions
```

### Pattern 1: Pairwise Group Encryption (Signal-style)

**What:** Each group message is encrypted individually for each recipient using existing 1:1 session keys. No shared group key.

**When to use:** Groups up to 200 participants (Phase 5 requirement), prioritizes simplicity over transmission efficiency.

**Example:**
```typescript
// Source: Signal blog "Private Group Messaging"
// https://signal.org/blog/private-groups/

async function sendGroupMessage(groupId: string, plaintext: string) {
  const members = await groupStore.getMembers(groupId);

  // Encrypt once per recipient using existing pairwise keys
  for (const member of members) {
    const sessionKeys = await cryptoStore.getOrDeriveSessionKeys(
      currentUserId,
      member.id,
      member.publicKey
    );

    const encrypted = await encryptMessage(plaintext, sessionKeys.tx);

    // Send via WebSocket to each member
    ws.send({
      type: 'group_message',
      groupId,
      recipientId: member.id,
      encryptedContent: encrypted,
      senderId: currentUserId
    });
  }
}
```

**Rationale:** Reuses Phase 2's proven X25519 + XChaCha20-Poly1305 stack, avoids complex key distribution, server never sees group metadata.

### Pattern 2: Streaming File Encryption with SecretStream

**What:** Encrypt large files in chunks using libsodium's SecretStream API before upload.

**When to use:** Files > 10MB, prevents memory exhaustion from loading entire file.

**Example:**
```typescript
// Source: libsodium documentation - SecretStream
// https://libsodium.gitbook.io/doc/secret-key_cryptography/secretstream

import { initSodium } from '@/lib/crypto/libsodium';

async function encryptFile(file: File): Promise<{ header: Uint8Array; chunks: Uint8Array[] }> {
  const s = await initSodium();

  // Generate encryption key (later encrypted pairwise for recipients)
  const key = s.randombytes_buf(s.crypto_secretstream_xchacha20poly1305_KEYBYTES);

  // Initialize encryption state
  const { state, header } = s.crypto_secretstream_xchacha20poly1305_init_push(key);

  const chunks: Uint8Array[] = [];
  const CHUNK_SIZE = 64 * 1024; // 64KB chunks

  // Read file in chunks
  for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
    const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
    const plaintextChunk = new Uint8Array(chunk);

    const isLastChunk = offset + CHUNK_SIZE >= file.size;
    const tag = isLastChunk
      ? s.crypto_secretstream_xchacha20poly1305_TAG_FINAL
      : s.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;

    const encryptedChunk = s.crypto_secretstream_xchacha20poly1305_push(
      state,
      plaintextChunk,
      null,
      tag
    );

    chunks.push(encryptedChunk);
  }

  return { header, chunks };
}
```

**Benefits:** Automatic rekeying, authenticated chunks (detect corruption early), handles files of any size, forward secrecy.

### Pattern 3: MediaPipe Background Blur

**What:** Use MediaPipe Selfie Segmentation to create person mask, apply blur to background via canvas.

**When to use:** User enables blur/virtual background in video call settings.

**Example:**
```typescript
// Source: StackFive.io tutorial
// https://www.stackfive.io/work/webrtc/implementing-virtual-background-with-react-using-mediapipe

import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

const segmenter = new SelfieSegmentation({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
});

segmenter.setOptions({
  modelSelection: 1, // 0 = general (256x256), 1 = landscape (256x144)
  selfieMode: false
});

async function processVideoFrame(videoElement: HTMLVideoElement, outputCanvas: HTMLCanvasElement) {
  await segmenter.send({ image: videoElement });
}

segmenter.onResults((results) => {
  const ctx = outputCanvas.getContext('2d')!;

  // Draw blurred background
  ctx.filter = 'blur(8px)';
  ctx.drawImage(results.image, 0, 0);

  // Draw person with mask (no blur)
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'destination-atop';
  ctx.drawImage(results.segmentationMask, 0, 0);

  ctx.globalCompositeOperation = 'source-over';
});

// Get stream from canvas for WebRTC
const processedStream = outputCanvas.captureStream(30); // 30fps
```

**Note:** Only works in Chromium browsers (Chrome, Edge, Opera). Firefox/Safari lack MediaStreamTrack Insertable Streams support.

### Pattern 4: Virtualized Emoji Picker

**What:** Render only visible emoji using react-window, dramatically reduce DOM nodes.

**When to use:** Emoji picker with 1000+ emoji, prevents scroll jank.

**Example:**
```typescript
// Source: Slack Engineering blog
// https://slack.engineering/rebuilding-slacks-emoji-picker-in-react/

import EmojiPicker from 'emoji-picker-react';

<EmojiPicker
  onEmojiClick={(emojiData) => addReaction(emojiData.emoji)}
  emojiStyle="twitter" // Uses Twemoji
  width="100%"
  height="400px"
  searchPlaceHolder="Search emoji..."
  previewConfig={{ showPreview: false }}
/>
```

**Performance:** Slack reported 85% fewer DOM nodes (318ms → 48ms first mount), smooth 60fps scrolling.

### Pattern 5: Debounced Typing Indicators

**What:** Debounce typing events to reduce WebSocket traffic, auto-stop after timeout.

**When to use:** Real-time typing indicators in 1:1 and group chats.

**Example:**
```typescript
// Source: DEV Community typing indicators tutorial
// https://dev.to/hexshift/adding-typing-indicators-to-real-time-chat-applications-76p

let typingTimeout: NodeJS.Timeout | null = null;

function handleInputChange(conversationId: string) {
  // Clear existing timeout
  if (typingTimeout) clearTimeout(typingTimeout);

  // Send typing=true (only if not already sent)
  if (!isTypingActive) {
    ws.send({ type: 'typing', conversationId, isTyping: true });
    isTypingActive = true;
  }

  // Auto-stop after 5s of inactivity
  typingTimeout = setTimeout(() => {
    ws.send({ type: 'typing', conversationId, isTyping: false });
    isTypingActive = false;
  }, 5000);
}

function handleMessageSend() {
  // Immediately stop typing indicator
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }

  if (isTypingActive) {
    ws.send({ type: 'typing', conversationId, isTyping: false });
    isTypingActive = false;
  }
}
```

**Best Practice:** Server does NOT persist typing events, broadcasts immediately to recipients. Minimal data, no storage overhead.

### Anti-Patterns to Avoid

- **Shared Group Keys:** Avoid single symmetric key for entire group. Key rotation requires re-encrypting for all members, removed members still have old keys.
- **Loading Entire File Before Encrypt:** Memory exhaustion on 100MB files. Use streaming (SecretStream API).
- **Rendering All 1800+ Emoji:** Causes scroll jank, 270ms+ mount time. Use virtualization (react-window).
- **Sending Typing Event Per Keystroke:** Server overload. Debounce to 300-500ms, send start/stop only.
- **Server-side Blur Processing:** Privacy violation (sends unblurred video to server), high compute cost. Always blur client-side.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Person segmentation | Custom ML model training | MediaPipe Selfie Segmentation | Google's pre-trained model, optimized for browser, used in production (Google Meet) |
| Large file encryption | Custom chunking + AES | libsodium SecretStream API | Automatic rekeying, authenticated chunks, handles edge cases (truncation, reordering) |
| Emoji rendering | Unicode text rendering | Twemoji (via emoji-picker-react) | Cross-platform consistency, Twitter's maintained SVG set |
| Emoji search/filter | Regex on emoji names | emoji-picker-react built-in | Pre-indexed search, handles aliases, multi-language |
| Image zoom/pan | Custom touch/mouse handlers | yet-another-react-lightbox | Handles pinch-zoom, momentum, edge cases, accessibility |
| Video constraints | Hardcoded resolution values | getUserMedia ideal/min/max | Browser picks best match for hardware, graceful degradation |
| Group key distribution | Custom key server | Pairwise encryption (Signal-style) | Reuses existing infrastructure, no new attack surface |

**Key insight:** Video processing, encryption, and UI interactions have subtle edge cases (device orientation, memory limits, touch gestures, nonce reuse). Battle-tested libraries encode years of production hardening.

## Common Pitfalls

### Pitfall 1: getUserMedia Rejects with Exact Constraints

**What goes wrong:** Using `{ exact: 1920 }` for resolution causes rejection if camera doesn't support 1080p.

**Why it happens:** Browser strictly enforces "exact" constraints, rejects if unsupported.

**How to avoid:** Use `ideal` and `max` instead. Browser picks closest match.

```typescript
// BAD: Rejects on 720p camera
getUserMedia({ video: { width: { exact: 1920 }, height: { exact: 1080 } } });

// GOOD: Falls back gracefully
getUserMedia({ video: { width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 } } });
```

**Warning signs:** NotFoundError or OverconstrainedError in console, video preview fails.

### Pitfall 2: Nonce Reuse with File Chunks

**What goes wrong:** Reusing same nonce across file chunks breaks encryption security.

**Why it happens:** Developer thinks "same file = same nonce" for simplicity.

**How to avoid:** Use SecretStream API (auto-generates unique nonce per chunk) or manually generate random nonce for each chunk.

```typescript
// BAD: Nonce reused across chunks
const nonce = sodium.randombytes_buf(24);
for (const chunk of fileChunks) {
  const encrypted = sodium.crypto_secretbox_easy(chunk, nonce, key); // INSECURE
}

// GOOD: SecretStream auto-handles nonces
const { state, header } = sodium.crypto_secretstream_xchacha20poly1305_init_push(key);
for (const chunk of fileChunks) {
  const encrypted = sodium.crypto_secretstream_xchacha20poly1305_push(state, chunk, null, tag);
}
```

**Warning signs:** Cryptanalysis can recover plaintext, fails security audits.

### Pitfall 3: Group Member Sees Past Messages

**What goes wrong:** New group member retrieves history before they joined, violating privacy.

**Why it happens:** Server loads all group messages without checking member join timestamp.

**How to avoid:** Filter messages by `created_at >= member.joined_at` on backend. Alternatively, store messages with member-specific encryption (pairwise approach naturally avoids this).

```typescript
// GOOD: Only messages after joining
SELECT * FROM messages
WHERE group_id = $1
  AND recipient_id = $2
  AND created_at >= (
    SELECT joined_at FROM group_members
    WHERE group_id = $1 AND user_id = $2
  )
ORDER BY created_at ASC;
```

**Warning signs:** Privacy complaints, data leak incidents.

### Pitfall 4: Emoji Picker Causes Frame Drops

**What goes wrong:** Rendering 1800+ emoji DOM nodes freezes UI for 200-300ms, scroll is janky.

**Why it happens:** Browser must layout/paint all emoji even if offscreen.

**How to avoid:** Use virtualized picker (emoji-picker-react with react-window). Only 20-30 emoji rendered at a time.

**Warning signs:** Profiler shows >100ms scripting time on picker open, scroll fps < 30.

### Pitfall 5: Video Background Blur Kills Performance

**What goes wrong:** Background blur drops video fps from 30 to 10-15fps, laggy call.

**Why it happens:** MediaPipe runs on every frame, heavy computation, or using wrong model.

**How to avoid:**
- Use `modelSelection: 1` (landscape model, 256x144, faster than general 256x256)
- Throttle processing to 15-20fps instead of 30fps
- Offload to Web Worker if possible
- Offer "Low Quality" video setting (480p) when blur enabled

**Warning signs:** frame drops in DevTools performance tab, user complaints about lag.

### Pitfall 6: Typing Indicator Never Stops

**What goes wrong:** User sees "Name is typing..." forever after contact closes browser.

**Why it happens:** No timeout on server-side, relies on client to send stop event.

**How to avoid:** Server-side timeout (10-15s), auto-clear typing state if no refresh received.

```typescript
// Server-side
const typingStates = new Map<string, { userId: string; timestamp: number }>();

function handleTypingEvent(conversationId: string, userId: string, isTyping: boolean) {
  const key = `${conversationId}:${userId}`;

  if (isTyping) {
    typingStates.set(key, { userId, timestamp: Date.now() });
  } else {
    typingStates.delete(key);
  }

  broadcast(conversationId, { type: 'typing', userId, isTyping });
}

// Cleanup stale typing indicators every 5s
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of typingStates.entries()) {
    if (now - state.timestamp > 10000) { // 10s timeout
      typingStates.delete(key);
      const [conversationId] = key.split(':');
      broadcast(conversationId, { type: 'typing', userId: state.userId, isTyping: false });
    }
  }
}, 5000);
```

**Warning signs:** Typing indicators persist after page refresh, user confusion.

## Code Examples

Verified patterns from official sources:

### Video Camera Preview Before Call

```typescript
// Source: MDN getUserMedia documentation
// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

async function showCameraPreview(videoElement: HTMLVideoElement, deviceId?: string) {
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 30 }
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    videoElement.onloadedmetadata = () => {
      videoElement.play();
    };
    return stream;
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'NotAllowedError') {
        console.error('Camera permission denied');
      } else if (err.name === 'NotFoundError') {
        console.error('No camera found');
      } else if (err.name === 'OverconstrainedError') {
        console.error('Constraints not supported by camera');
      }
    }
    throw err;
  }
}

// Enumerate available cameras
async function getCameraDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(device => device.kind === 'videoinput');
}
```

### Pairwise Group Message Encryption

```typescript
// Source: Signal blog post + existing Phase 2 crypto
// https://signal.org/blog/private-groups/

interface GroupMessage {
  groupId: string;
  content: string;
  attachments?: string[];
}

async function sendGroupMessage(msg: GroupMessage) {
  const members = await groupStore.getMembers(msg.groupId);
  const currentUserId = authStore.user!.id;

  // Encrypt for each member using pairwise keys
  const encryptedMessages = await Promise.all(
    members
      .filter(m => m.id !== currentUserId) // Don't send to self
      .map(async (member) => {
        const sessionKeys = await cryptoStore.getOrDeriveSessionKeys(
          currentUserId,
          member.id,
          member.publicKey
        );

        const encrypted = await encryptMessage(msg.content, sessionKeys.tx);

        return {
          recipientId: member.id,
          encryptedContent: encrypted
        };
      })
  );

  // Send via WebSocket (server fans out to recipients)
  ws.send({
    type: 'group_message',
    groupId: msg.groupId,
    messages: encryptedMessages,
    senderId: currentUserId,
    timestamp: Date.now()
  });
}
```

### Streaming File Decryption on Download

```typescript
// Source: libsodium SecretStream documentation
// https://libsodium.gitbook.io/doc/secret-key_cryptography/secretstream

async function* decryptFileStream(
  header: Uint8Array,
  encryptedChunks: AsyncIterable<Uint8Array>,
  key: Uint8Array
) {
  const s = await initSodium();

  // Initialize decryption state with header
  const state = s.crypto_secretstream_xchacha20poly1305_init_pull(header, key);

  for await (const encryptedChunk of encryptedChunks) {
    const result = s.crypto_secretstream_xchacha20poly1305_pull(state, encryptedChunk);

    if (!result) {
      throw new Error('Decryption failed - authentication error');
    }

    const { message, tag } = result;

    yield message; // Yield decrypted chunk

    if (tag === s.crypto_secretstream_xchacha20poly1305_TAG_FINAL) {
      break; // End of stream
    }
  }
}

// Usage with Blob API for download
async function downloadAndDecryptFile(fileId: string) {
  const { header, key, encryptedChunks } = await fetchEncryptedFile(fileId);
  const decryptedChunks: Uint8Array[] = [];

  for await (const chunk of decryptFileStream(header, encryptedChunks, key)) {
    decryptedChunks.push(chunk);
  }

  const blob = new Blob(decryptedChunks);
  const url = URL.createObjectURL(blob);

  // Trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = 'file.bin';
  a.click();
  URL.revokeObjectURL(url);
}
```

### Quick Reaction Bar with Custom Emoji

```typescript
// Source: User requirements + emoji-picker-react docs
// https://www.npmjs.com/package/emoji-picker-react

interface QuickReactionsProps {
  messageId: number;
  currentReactions: Map<string, string[]>; // emoji -> userIds
  onReact: (emoji: string) => void;
}

function QuickReactions({ messageId, currentReactions, onReact }: QuickReactionsProps) {
  const userId = authStore.user!.id;

  // User-customizable in settings, defaults to these
  const quickEmoji = settingsStore.quickReactions || ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const hasReacted = (emoji: string) => currentReactions.get(emoji)?.includes(userId) ?? false;

  return (
    <div className="flex gap-1 p-2">
      {quickEmoji.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={cn(
            'text-xl p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition',
            hasReacted(emoji) && 'bg-blue-100 dark:bg-blue-900'
          )}
        >
          {emoji}
        </button>
      ))}

      <Popover>
        <PopoverTrigger>
          <button className="text-gray-500 hover:text-gray-700 px-2">+</button>
        </PopoverTrigger>
        <PopoverContent>
          <EmojiPicker
            onEmojiClick={(data) => onReact(data.emoji)}
            emojiStyle="twitter"
            width="350px"
            height="400px"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

### Group Permissions Check

```typescript
// Source: RBAC best practices + user requirements
// https://www.nocobase.com/en/blog/how-to-design-rbac-role-based-access-control-system

type Role = 'owner' | 'admin' | 'moderator' | 'member';

interface Permission {
  sendMessages: boolean;
  deleteMessages: boolean; // Own and others
  addMembers: boolean;
  removeMembers: boolean;
  banMembers: boolean;
  changeGroupSettings: boolean; // Name, avatar, description
  manageRoles: boolean;
}

const rolePermissions: Record<Role, Permission> = {
  owner: {
    sendMessages: true,
    deleteMessages: true,
    addMembers: true,
    removeMembers: true,
    banMembers: true,
    changeGroupSettings: true,
    manageRoles: true
  },
  admin: {
    sendMessages: true,
    deleteMessages: true,
    addMembers: true,
    removeMembers: true,
    banMembers: true,
    changeGroupSettings: true,
    manageRoles: false // Can't promote to admin/owner
  },
  moderator: {
    sendMessages: true,
    deleteMessages: true, // Can delete others' messages
    addMembers: true,
    removeMembers: false,
    banMembers: true,
    changeGroupSettings: false,
    manageRoles: false
  },
  member: {
    sendMessages: true,
    deleteMessages: false, // Can only delete own
    addMembers: false,
    removeMembers: false,
    banMembers: false,
    changeGroupSettings: false,
    manageRoles: false
  }
};

function hasPermission(groupId: string, userId: string, permission: keyof Permission): boolean {
  const member = groupStore.getMember(groupId, userId);
  if (!member) return false;

  return rolePermissions[member.role][permission];
}

// Example usage
async function deleteGroupMessage(groupId: string, messageId: number) {
  const message = await messageStore.getMessage(messageId);
  const currentUserId = authStore.user!.id;

  // Can delete if: own message OR has deleteMessages permission
  const canDelete =
    message.senderId === currentUserId ||
    hasPermission(groupId, currentUserId, 'deleteMessages');

  if (!canDelete) {
    throw new Error('Permission denied');
  }

  await api.delete(`/groups/${groupId}/messages/${messageId}`);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canvas manipulation for blur | MediaStreamTrack Insertable Streams | 2021-2022 | More efficient (no DOM), but only Chromium. Canvas fallback needed. |
| Sender Keys for all groups | Pairwise encryption (Signal) | Signal 2020+ update | Simpler implementation, better privacy (no group metadata), tradeoff bandwidth for security |
| emoji-mart (v3) | emoji-picker-react (v5) | 2023-2024 | Better TypeScript, built-in virtualization, active maintenance |
| react-image-lightbox | yet-another-react-lightbox | 2022+ | Modern hooks API, better mobile gestures, smaller bundle |
| WebCrypto SubtleCrypto for files | libsodium SecretStream | Always | SecretStream has automatic rekeying, authenticated chunks, no nonce management |
| Base64 inline images | Blob URLs with revocation | Always | Better memory, faster rendering, explicit cleanup |
| Global typing state | Per-conversation typing | Always | Scales better, prevents broadcast storms |

**Deprecated/outdated:**
- **BodyPix (TensorFlow.js)**: Replaced by MediaPipe (faster, better accuracy, smaller model). BodyPix repo archived 2021.
- **Simple React Lightbox**: Deprecated, unmaintained. Use yet-another-react-lightbox.
- **emoji-mart v3**: Use emoji-picker-react or emoji-mart v5+ (breaking changes from v3).
- **RTCPeerConnection.addStream**: Use addTrack() instead. addStream deprecated 2018.

## Open Questions

Things that couldn't be fully resolved:

1. **Group Call Scaling (deferred Phase 7)**
   - What we know: 1:1 video works with P2P (Phase 3 complete), groups need SFU
   - What's unclear: At what group size (3? 5? 10?) do we switch from mesh P2P to SFU?
   - Recommendation: Phase 5 only supports 1:1 video. Group video calls deferred to Phase 7 (Advanced Features) with SFU infrastructure.

2. **File Storage Cleanup Strategy**
   - What we know: Files stored locally on server disk, 100MB+ limit per file
   - What's unclear: When to delete orphaned files (message deleted, user removed from group, retention policy)?
   - Recommendation: Start with no auto-deletion, add manual "Clean up old files" admin task. Plan retention policy for Phase 6 or 7.

3. **Browser Compatibility for Background Blur**
   - What we know: MediaPipe + Insertable Streams only works in Chromium (Chrome, Edge, Opera)
   - What's unclear: Should we offer canvas-based fallback for Firefox/Safari, or just disable feature?
   - Recommendation: Phase 5 ships Chromium-only blur, show "Blur not supported in Firefox/Safari" message. Investigate canvas fallback if user demand.

4. **Reaction Notification Strategy**
   - What we know: Reactions should notify, but not spam like regular messages
   - What's unclear: Aggregate reactions in single notification? "X people reacted"? Separate notification category?
   - Recommendation: Start simple: no push notifications for reactions, only in-app badge/count. Iterate based on user feedback.

5. **Group Encryption Optimization Timing**
   - What we know: Pairwise encryption scales to 200 members, but bandwidth grows linearly
   - What's unclear: At what group size does sender keys become worth the complexity?
   - Recommendation: Ship pairwise for Phase 5 (v1.1.0), monitor bandwidth usage, consider sender keys in Phase 6 if large groups common.

## Sources

### Primary (HIGH confidence)

- **MDN Web Docs**: [getUserMedia() method](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) - Official WebRTC API documentation (verified 2026-01-28)
- **WebRTC.org**: [Media devices](https://webrtc.org/getting-started/media-devices) - Official WebRTC best practices
- **libsodium documentation**: [SecretStream API](https://libsodium.gitbook.io/doc/secret-key_cryptography/secretstream) - Official encryption stream docs
- **Signal blog**: [Private Group Messaging](https://signal.org/blog/private-groups/) - Signal's pairwise group encryption approach
- **npm registry**: emoji-picker-react v5.x, yet-another-react-lightbox v3.x (package verification)
- **MediaPipe docs**: [@mediapipe/selfie_segmentation](https://www.npmjs.com/package/@mediapipe/selfie_segmentation) - Official Google package

### Secondary (MEDIUM confidence)

- **Slack Engineering**: [Rebuilding Slack's Emoji Picker in React](https://slack.engineering/rebuilding-slacks-emoji-picker-in-react/) - Real-world performance improvements (85% fewer DOM nodes)
- **StackFive.io**: [Implementing Virtual Background with React using MediaPipe](https://www.stackfive.io/work/webrtc/implementing-virtual-background-with-react-using-mediapipe) - Tutorial with code examples
- **DEV Community**: [Adding Typing Indicators to Real Time Chat Applications](https://dev.to/hexshift/adding-typing-indicators-to-real-time-chat-applications-76p) - Implementation patterns
- **Medium**: [End-to-End Encryption in Chat Applications](https://medium.com/@siddhantshelake/end-to-end-encryption-e2ee-in-chat-applications-a-complete-guide-12b226cae8f8) (January 2026) - Recent E2EE overview
- **WebRTC Hacks**: [How to add virtual background transparency](https://webrtchacks.com/how-to-make-virtual-backgrounds-transparent-in-webrtc/) - Insertable Streams explanation
- **NocoBase**: [How to Design RBAC System](https://www.nocobase.com/en/blog/how-to-design-rbac-role-based-access-control-system) - Role-based permissions design
- **LogRocket**: [Comparing React lightbox libraries](https://blog.logrocket.com/comparing-the-top-3-react-lightbox-libraries/) - Library comparison (2024+)

### Tertiary (LOW confidence - marked for validation)

- **GitHub repos**: Various MediaPipe + React examples (code quality varies, not vetted)
- **WebSearch**: General background blur techniques (some outdated, pre-Insertable Streams)
- **Medium tutorials**: Chunked file upload patterns (language-agnostic, need Node/Fastify adaptation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified on npm, official docs reviewed, Phase 2 integration proven
- Architecture: HIGH - Pairwise encryption proven by Signal, SecretStream official libsodium API, WebRTC from Phase 3
- Pitfalls: MEDIUM - Compiled from multiple sources (MDN, blog posts, Stack Overflow patterns), some anecdotal
- Performance: HIGH - Slack's 85% improvement verified, MediaPipe benchmarks available, virtualization proven

**Research date:** 2026-01-28
**Valid until:** 2026-04-28 (90 days - stable domain, but MediaPipe/browser APIs evolve)

**Key dependencies on prior phases:**
- Phase 2: libsodium integration, X25519 key exchange, XChaCha20-Poly1305 encryption
- Phase 3: WebRTC infrastructure, Perfect Negotiation, PeerConnectionManager
- Phase 4: Mobile UI patterns, error handling, skeleton loading

**Risks for planning:**
- MediaPipe browser compatibility limited (Chromium-only)
- Group encryption bandwidth scales linearly (200 members = 200x encryption)
- File upload/download needs new backend storage service (not implemented yet)
- Emoji picker bundle size (300KB+ for full Twemoji set)
