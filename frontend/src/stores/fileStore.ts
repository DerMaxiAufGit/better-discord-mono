import { create } from 'zustand'

export type FileStatus = 'pending' | 'encrypting' | 'uploading' | 'downloading' | 'decrypting' | 'complete' | 'error'

export interface FileUpload {
  id: string // temp ID until server responds
  file: File
  status: FileStatus
  progress: number // 0-100
  error?: string
  serverId?: string // ID from server after upload
}

export interface FileDownload {
  id: string // server file ID
  filename: string
  status: FileStatus
  progress: number
  error?: string
  blob?: Blob // decrypted file data
  url?: string // object URL for download
}

interface FileState {
  uploads: Map<string, FileUpload>
  downloads: Map<string, FileDownload>

  // Upload actions
  startUpload: (file: File) => string // returns temp ID
  updateUploadStatus: (id: string, status: FileStatus, progress?: number) => void
  completeUpload: (tempId: string, serverId: string) => void
  failUpload: (id: string, error: string) => void
  removeUpload: (id: string) => void

  // Download actions
  startDownload: (id: string, filename: string) => void
  updateDownloadStatus: (id: string, status: FileStatus, progress?: number) => void
  completeDownload: (id: string, blob: Blob) => void
  failDownload: (id: string, error: string) => void
  removeDownload: (id: string) => void

  // Cleanup
  clearAll: () => void
}

export const useFileStore = create<FileState>((set, get) => ({
  uploads: new Map(),
  downloads: new Map(),

  startUpload: (file) => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`
    set((state) => ({
      uploads: new Map(state.uploads).set(id, {
        id,
        file,
        status: 'pending',
        progress: 0
      })
    }))
    return id
  },

  updateUploadStatus: (id, status, progress) => {
    set((state) => {
      const upload = state.uploads.get(id)
      if (!upload) return state

      return {
        uploads: new Map(state.uploads).set(id, {
          ...upload,
          status,
          progress: progress ?? upload.progress
        })
      }
    })
  },

  completeUpload: (tempId, serverId) => {
    set((state) => {
      const upload = state.uploads.get(tempId)
      if (!upload) return state

      return {
        uploads: new Map(state.uploads).set(tempId, {
          ...upload,
          status: 'complete',
          progress: 100,
          serverId
        })
      }
    })
  },

  failUpload: (id, error) => {
    set((state) => {
      const upload = state.uploads.get(id)
      if (!upload) return state

      return {
        uploads: new Map(state.uploads).set(id, {
          ...upload,
          status: 'error',
          error
        })
      }
    })
  },

  removeUpload: (id) => {
    set((state) => {
      const uploads = new Map(state.uploads)
      uploads.delete(id)
      return { uploads }
    })
  },

  startDownload: (id, filename) => {
    set((state) => ({
      downloads: new Map(state.downloads).set(id, {
        id,
        filename,
        status: 'pending',
        progress: 0
      })
    }))
  },

  updateDownloadStatus: (id, status, progress) => {
    set((state) => {
      const download = state.downloads.get(id)
      if (!download) return state

      return {
        downloads: new Map(state.downloads).set(id, {
          ...download,
          status,
          progress: progress ?? download.progress
        })
      }
    })
  },

  completeDownload: (id, blob) => {
    set((state) => {
      const download = state.downloads.get(id)
      if (!download) return state

      const url = URL.createObjectURL(blob)

      return {
        downloads: new Map(state.downloads).set(id, {
          ...download,
          status: 'complete',
          progress: 100,
          blob,
          url
        })
      }
    })
  },

  failDownload: (id, error) => {
    set((state) => {
      const download = state.downloads.get(id)
      if (!download) return state

      return {
        downloads: new Map(state.downloads).set(id, {
          ...download,
          status: 'error',
          error
        })
      }
    })
  },

  removeDownload: (id) => {
    set((state) => {
      const download = state.downloads.get(id)
      if (download?.url) {
        URL.revokeObjectURL(download.url)
      }

      const downloads = new Map(state.downloads)
      downloads.delete(id)
      return { downloads }
    })
  },

  clearAll: () => {
    // Revoke all URLs
    const state = get()
    for (const download of state.downloads.values()) {
      if (download.url) {
        URL.revokeObjectURL(download.url)
      }
    }

    set({ uploads: new Map(), downloads: new Map() })
  }
}))
