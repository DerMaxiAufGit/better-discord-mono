// Map: "conversationId:userId" -> timestamp
const typingStates = new Map<string, number>();

export function handleTypingEvent(
  conversationId: string,
  userId: string,
  isTyping: boolean
): void {
  const key = `${conversationId}:${userId}`;

  if (isTyping) {
    typingStates.set(key, Date.now());
  } else {
    typingStates.delete(key);
  }
}

export function getTypingUsers(conversationId: string): string[] {
  const users: string[] = [];
  const now = Date.now();

  for (const [key, timestamp] of typingStates.entries()) {
    if (key.startsWith(`${conversationId}:`)) {
      // Only include if within timeout (10s)
      if (now - timestamp < 10000) {
        const userId = key.split(':')[1];
        users.push(userId);
      }
    }
  }

  return users;
}

export function clearStaleTyping(): void {
  const now = Date.now();

  for (const [key, timestamp] of typingStates.entries()) {
    if (now - timestamp > 10000) {
      typingStates.delete(key);
    }
  }
}

// Start cleanup interval
setInterval(clearStaleTyping, 5000);
