interface IndexedMessage {
  id: number;
  conversationId: string;  // recipientId for DMs, groupId for groups
  conversationType: 'dm' | 'group';
  senderId: string;
  senderName: string;
  plaintext: string;
  timestamp: number;  // Unix timestamp for indexing
  searchTokens: string[];  // Pre-tokenized lowercase words
}

const DB_NAME = 'MessageSearchCache';
const DB_VERSION = 1;
const STORE_NAME = 'messages';
const MAX_CACHED_MESSAGES = 10000;  // LRU limit

class MessageIndex {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB connection
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store with indexes
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('conversationId', 'conversationId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('senderId', 'senderId', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  /**
   * Index a decrypted message for search
   */
  async indexMessage(message: {
    id: number;
    conversationId: string;
    conversationType: 'dm' | 'group';
    senderId: string;
    senderName: string;
    plaintext: string;
    timestamp: Date;
  }): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    // Tokenize message for search
    const searchTokens = this.tokenize(message.plaintext);

    const indexedMessage: IndexedMessage = {
      id: message.id,
      conversationId: message.conversationId,
      conversationType: message.conversationType,
      senderId: message.senderId,
      senderName: message.senderName,
      plaintext: message.plaintext,
      timestamp: message.timestamp.getTime(),
      searchTokens,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const request = store.put(indexedMessage);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Index multiple messages (batch)
   */
  async indexMessages(messages: Array<{
    id: number;
    conversationId: string;
    conversationType: 'dm' | 'group';
    senderId: string;
    senderName: string;
    plaintext: string;
    timestamp: Date;
  }>): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      for (const message of messages) {
        const searchTokens = this.tokenize(message.plaintext);
        store.put({
          id: message.id,
          conversationId: message.conversationId,
          conversationType: message.conversationType,
          senderId: message.senderId,
          senderName: message.senderName,
          plaintext: message.plaintext,
          timestamp: message.timestamp.getTime(),
          searchTokens,
        });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Search messages by query
   */
  async search(
    query: string,
    options?: {
      conversationId?: string;
      limit?: number;
    }
  ): Promise<IndexedMessage[]> {
    await this.initialize();
    if (!this.db) return [];

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      // Get all messages (or filtered by conversation)
      const request = options?.conversationId
        ? store.index('conversationId').getAll(options.conversationId)
        : store.getAll();

      request.onsuccess = () => {
        const allMessages: IndexedMessage[] = request.result;

        // Filter by query tokens
        const matches = allMessages.filter((msg) =>
          queryTokens.every((qt) =>
            msg.searchTokens.some((st) => st.includes(qt))
          )
        );

        // Sort by timestamp (newest first)
        matches.sort((a, b) => b.timestamp - a.timestamp);

        // Apply limit
        const limited = options?.limit ? matches.slice(0, options.limit) : matches;
        resolve(limited);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a message from index
   */
  async deleteMessage(messageId: number): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const request = store.delete(messageId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached messages
   */
  async clear(): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clean up old messages (LRU eviction)
   */
  async cleanup(): Promise<number> {
    await this.initialize();
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');

      const countRequest = store.count();
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        if (count <= MAX_CACHED_MESSAGES) {
          resolve(0);
          return;
        }

        // Get oldest messages to delete
        const toDelete = count - MAX_CACHED_MESSAGES;
        let deleted = 0;

        const cursorRequest = index.openCursor();
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && deleted < toDelete) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            resolve(deleted);
          }
        };
        cursorRequest.onerror = () => reject(cursorRequest.error);
      };
    });
  }

  /**
   * Tokenize text for search indexing
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length >= 2)
      .slice(0, 100);  // Limit tokens per message
  }
}

export const messageIndex = new MessageIndex();
export type { IndexedMessage };
