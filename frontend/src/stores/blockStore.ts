import { create } from 'zustand';
import { blocksApi } from '@/lib/api';

interface BlockedUser {
  blockedId: string;
  blockedAt: Date;
  username: string | null;
}

interface BlockState {
  // Set of blocked user IDs (for quick lookup)
  blockedIds: Set<string>;

  // Full blocked users list with details
  blockedUsers: BlockedUser[];

  // Loading state
  isLoading: boolean;

  // Actions
  loadBlockedUsers: () => Promise<void>;
  blockUser: (userId: string, deleteHistory?: boolean) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  isBlocked: (userId: string) => boolean;
  checkBlockStatus: (userId: string) => Promise<{ isBlocked: boolean; isBlockedByThem: boolean }>;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blockedIds: new Set(),
  blockedUsers: [],
  isLoading: false,

  loadBlockedUsers: async () => {
    set({ isLoading: true });

    try {
      const response = await blocksApi.getBlocked();
      const blockedUsers = response.blockedUsers.map((u) => ({
        blockedId: u.blockedId,
        blockedAt: new Date(u.blockedAt),
        username: u.username,
      }));

      set({
        blockedUsers,
        blockedIds: new Set(blockedUsers.map((u) => u.blockedId)),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  blockUser: async (userId: string, deleteHistory = false) => {
    await blocksApi.block(userId, deleteHistory);

    // Optimistically update local state
    set((state) => ({
      blockedIds: new Set(state.blockedIds).add(userId),
      blockedUsers: [
        ...state.blockedUsers,
        { blockedId: userId, blockedAt: new Date(), username: null },
      ],
    }));
  },

  unblockUser: async (userId: string) => {
    await blocksApi.unblock(userId);

    // Optimistically update local state
    set((state) => {
      const newBlockedIds = new Set(state.blockedIds);
      newBlockedIds.delete(userId);

      return {
        blockedIds: newBlockedIds,
        blockedUsers: state.blockedUsers.filter((u) => u.blockedId !== userId),
      };
    });
  },

  isBlocked: (userId: string) => get().blockedIds.has(userId),

  checkBlockStatus: async (userId: string) => {
    return blocksApi.checkBlock(userId);
  },
}));
