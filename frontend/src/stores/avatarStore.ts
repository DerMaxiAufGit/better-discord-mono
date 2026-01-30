import { create } from 'zustand';
import { avatarApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

interface AvatarUrls {
  tinyUrl: string;
  smallUrl: string;
  largeUrl: string;
}

interface AvatarState {
  // Cache of user avatars
  avatarCache: Map<string, AvatarUrls | null>;

  // Upload state
  isUploading: boolean;
  uploadError: string | null;

  // Actions
  fetchAvatar: (userId: string) => Promise<AvatarUrls | null>;
  uploadAvatar: (blob: Blob) => Promise<AvatarUrls>;
  deleteAvatar: () => Promise<void>;
  clearCache: (userId?: string) => void;
  getAvatarUrl: (userId: string, size: 'tiny' | 'small' | 'large') => string | null;
}

export const useAvatarStore = create<AvatarState>((set, get) => ({
  avatarCache: new Map(),
  isUploading: false,
  uploadError: null,

  fetchAvatar: async (userId: string) => {
    // Check cache first
    const cached = get().avatarCache.get(userId);
    if (cached !== undefined) return cached;

    try {
      const response = await avatarApi.get(userId);
      const urls = response.avatar;

      set((state) => ({
        avatarCache: new Map(state.avatarCache).set(userId, urls),
      }));

      return urls;
    } catch {
      // User has no avatar
      set((state) => ({
        avatarCache: new Map(state.avatarCache).set(userId, null),
      }));
      return null;
    }
  },

  uploadAvatar: async (blob: Blob) => {
    set({ isUploading: true, uploadError: null });

    try {
      const response = await avatarApi.upload(blob);
      const urls = response.avatar;

      // Update cache for current user using auth store
      // URLs from backend already include version for cache-busting
      const user = useAuthStore.getState().user;
      if (user) {
        const userId = user.id;
        set((state) => ({
          avatarCache: new Map(state.avatarCache).set(userId, urls),
          isUploading: false,
        }));
      } else {
        set({ isUploading: false });
      }

      return urls;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      set({ isUploading: false, uploadError: message });
      throw error;
    }
  },

  deleteAvatar: async () => {
    set({ isUploading: true, uploadError: null });

    try {
      await avatarApi.delete();

      // Clear cache for current user using auth store
      const user = useAuthStore.getState().user;
      if (user) {
        set((state) => ({
          avatarCache: new Map(state.avatarCache).set(user.id, null),
          isUploading: false,
        }));
      } else {
        set({ isUploading: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      set({ isUploading: false, uploadError: message });
      throw error;
    }
  },

  clearCache: (userId?: string) => {
    if (userId) {
      set((state) => {
        const newCache = new Map(state.avatarCache);
        newCache.delete(userId);
        return { avatarCache: newCache };
      });
    } else {
      set({ avatarCache: new Map() });
    }
  },

  getAvatarUrl: (userId: string, size: 'tiny' | 'small' | 'large') => {
    const cached = get().avatarCache.get(userId);
    if (!cached) return null;

    switch (size) {
      case 'tiny': return cached.tinyUrl;
      case 'small': return cached.smallUrl;
      case 'large': return cached.largeUrl;
    }
  },
}));
