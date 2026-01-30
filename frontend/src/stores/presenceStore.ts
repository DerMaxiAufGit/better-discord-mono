import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { presenceApi, type PresenceStatus } from '@/lib/api';

interface UserPresence {
  status: string;
  lastSeen: Date | null;
}

interface PresenceState {
  // Own status
  myStatus: PresenceStatus;
  visibilityList: string[];

  // Others' status (plain object for Zustand reactivity)
  presenceMap: Record<string, UserPresence>;

  // Actions
  setMyStatus: (status: PresenceStatus) => Promise<void>;
  setVisibilityList: (list: string[]) => Promise<void>;
  updateUserPresence: (userId: string, status: string, lastSeen: string | null) => void;
  fetchUserPresence: (userId: string) => Promise<UserPresence | null>;
  fetchBatchPresence: (userIds: string[]) => Promise<void>;
  getPresence: (userId: string) => UserPresence | undefined;
  loadInitialStatus: () => Promise<void>;
}

export const usePresenceStore = create<PresenceState>()(
  persist(
    (set, get) => ({
      myStatus: 'online',
      visibilityList: [],
      presenceMap: {},

      setMyStatus: async (status: PresenceStatus) => {
        set({ myStatus: status });
        await presenceApi.updateStatus(status);
      },

      setVisibilityList: async (list: string[]) => {
        set({ visibilityList: list });
        await presenceApi.setVisibilityList(list);
      },

      updateUserPresence: (userId: string, status: string, lastSeen: string | null) => {
        set((state) => ({
          presenceMap: {
            ...state.presenceMap,
            [userId]: {
              status,
              lastSeen: lastSeen ? new Date(lastSeen) : null,
            },
          },
        }));
      },

      fetchUserPresence: async (userId: string) => {
        try {
          const response = await presenceApi.getUserStatus(userId);
          const presence: UserPresence = {
            status: response.status,
            lastSeen: response.lastSeen ? new Date(response.lastSeen) : null,
          };

          set((state) => ({
            presenceMap: {
              ...state.presenceMap,
              [userId]: presence,
            },
          }));

          return presence;
        } catch {
          return null;
        }
      },

      fetchBatchPresence: async (userIds: string[]) => {
        if (userIds.length === 0) return;

        try {
          const response = await presenceApi.getBatchStatus(userIds);

          set((state) => {
            const newMap: Record<string, UserPresence> = { ...state.presenceMap };
            for (const [userId, data] of Object.entries(response.statuses)) {
              newMap[userId] = {
                status: data.status,
                lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
              };
            }
            return { presenceMap: newMap };
          });
        } catch {
          // Silently fail - presence is non-critical
        }
      },

      getPresence: (userId: string) => get().presenceMap[userId],

      loadInitialStatus: async () => {
        try {
          const visibilityResponse = await presenceApi.getVisibilityList();

          set({
            visibilityList: visibilityResponse.visibilityList,
          });
        } catch {
          // Use persisted status on error
        }
      },
    }),
    {
      name: 'presence-store',
      partialize: (state) => ({
        myStatus: state.myStatus,
        visibilityList: state.visibilityList,
      }),
    }
  )
);
