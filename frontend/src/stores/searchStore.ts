import { create } from 'zustand';
import { messageIndex, type IndexedMessage } from '@/lib/search/messageIndex';
import { useContactStore } from '@/stores/contactStore';
import { useGroupStore } from '@/stores/groupStore';

interface SearchResult {
  message: IndexedMessage;
  highlight: string;  // Text with search term highlighted
}

interface GroupedResults {
  conversationId: string;
  conversationType: 'dm' | 'group';
  conversationName: string;
  results: SearchResult[];
}

interface SearchState {
  // Search state
  query: string;
  isSearching: boolean;
  results: SearchResult[];
  groupedResults: GroupedResults[];

  // Filter
  filterConversationId: string | null;

  // Actions
  setQuery: (query: string) => void;
  search: () => Promise<void>;
  clearSearch: () => void;
  setFilterConversation: (conversationId: string | null) => void;

  // Indexing
  indexMessage: (message: {
    id: number;
    conversationId: string;
    conversationType: 'dm' | 'group';
    senderId: string;
    senderName: string;
    plaintext: string;
    timestamp: Date;
  }) => Promise<void>;
  indexMessages: (messages: Array<{
    id: number;
    conversationId: string;
    conversationType: 'dm' | 'group';
    senderId: string;
    senderName: string;
    plaintext: string;
    timestamp: Date;
  }>) => Promise<void>;
  deleteFromIndex: (messageId: number) => Promise<void>;
  clearIndex: () => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  isSearching: false,
  results: [],
  groupedResults: [],
  filterConversationId: null,

  setQuery: (query: string) => {
    set({ query });
  },

  search: async () => {
    const { query, filterConversationId } = get();

    if (query.trim().length < 2) {
      set({ results: [], groupedResults: [] });
      return;
    }

    set({ isSearching: true });

    try {
      const indexedMessages = await messageIndex.search(query, {
        conversationId: filterConversationId || undefined,
        limit: 100,
      });

      // Create search results with highlighting
      const results: SearchResult[] = indexedMessages.map((msg) => ({
        message: msg,
        highlight: highlightQuery(msg.plaintext, query),
      }));

      // Group by conversation
      const grouped = groupByConversation(results);

      set({ results, groupedResults: grouped, isSearching: false });
    } catch (error) {
      console.error('Search error:', error);
      set({ results: [], groupedResults: [], isSearching: false });
    }
  },

  clearSearch: () => {
    set({ query: '', results: [], groupedResults: [] });
  },

  setFilterConversation: (conversationId: string | null) => {
    set({ filterConversationId: conversationId });
  },

  indexMessage: async (message) => {
    await messageIndex.indexMessage(message);
  },

  indexMessages: async (messages) => {
    await messageIndex.indexMessages(messages);
  },

  deleteFromIndex: async (messageId: number) => {
    await messageIndex.deleteMessage(messageId);
  },

  clearIndex: async () => {
    await messageIndex.clear();
  },
}));

/**
 * Highlight search query in text
 */
function highlightQuery(text: string, query: string): string {
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return text;

  let highlighted = text;
  for (const token of tokens) {
    const regex = new RegExp(`(${escapeRegex(token)})`, 'gi');
    highlighted = highlighted.replace(regex, '**$1**');
  }

  return highlighted;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Group search results by conversation
 */
function groupByConversation(results: SearchResult[]): GroupedResults[] {
  const groups = new Map<string, GroupedResults>();
  const contactStore = useContactStore.getState();
  const groupStore = useGroupStore.getState();

  for (const result of results) {
    const { conversationId, conversationType } = result.message;
    const key = conversationId;

    if (!groups.has(key)) {
      // Resolve conversation name from contacts or groups
      let conversationName = conversationId;
      if (conversationType === 'dm') {
        const contact = contactStore.contacts.get(conversationId);
        conversationName = contact?.username || conversationId;
      } else if (conversationType === 'group') {
        const group = groupStore.groups.find((g: any) => g.id === conversationId);
        conversationName = group?.name || conversationId;
      }

      groups.set(key, {
        conversationId,
        conversationType,
        conversationName,
        results: [],
      });
    }

    groups.get(key)!.results.push(result);
  }

  return Array.from(groups.values());
}
