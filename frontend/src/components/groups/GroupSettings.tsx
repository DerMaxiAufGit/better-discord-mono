import { useState } from 'react'
import { useGroupStore, Group, GroupInvite } from '@/stores/groupStore'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GroupSettingsProps {
  group: Group
  onClose: () => void
}

export function GroupSettings({ group, onClose }: GroupSettingsProps) {
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invites, setInvites] = useState<GroupInvite[]>([])
  const [newInviteExpiry, setNewInviteExpiry] = useState<number | undefined>()
  const [newInviteMaxUses, setNewInviteMaxUses] = useState<number | undefined>()

  const updateGroup = useGroupStore((s) => s.updateGroup)
  const deleteGroup = useGroupStore((s) => s.deleteGroup)
  const leaveGroup = useGroupStore((s) => s.leaveGroup)
  const createInvite = useGroupStore((s) => s.createInvite)
  const currentUserId = useAuthStore((s) => s.user?.id)

  const isOwner = group.owner_id === String(currentUserId)
  const canEdit = isOwner || group.role === 'admin'

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Group name is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await updateGroup(group.id, {
        name: name.trim(),
        description: description.trim() || undefined
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return
    }

    try {
      await deleteGroup(group.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group')
    }
  }

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this group?')) {
      return
    }

    try {
      await leaveGroup(group.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave group')
    }
  }

  const handleCreateInvite = async () => {
    try {
      const invite = await createInvite(group.id, newInviteExpiry, newInviteMaxUses)
      setInvites([...invites, invite])
      setNewInviteExpiry(undefined)
      setNewInviteMaxUses(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    }
  }

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(link)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold">Group Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-300">Basic Info</h3>

            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupDesc">Description</Label>
              <textarea
                id="groupDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white disabled:opacity-50"
              />
            </div>

            {canEdit && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>

          {/* Invite Links */}
          {canEdit && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-300">Invite Links</h3>

              <div className="flex gap-2">
                <select
                  value={newInviteExpiry || ''}
                  onChange={(e) => setNewInviteExpiry(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Never expires</option>
                  <option value="3600">1 hour</option>
                  <option value="86400">1 day</option>
                  <option value="604800">7 days</option>
                </select>

                <Input
                  type="number"
                  placeholder="Max uses"
                  value={newInviteMaxUses || ''}
                  onChange={(e) => setNewInviteMaxUses(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-28"
                />

                <Button onClick={handleCreateInvite}>Create Invite</Button>
              </div>

              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                  <div>
                    <code className="text-blue-400">{invite.code}</code>
                    <p className="text-xs text-gray-500">
                      {invite.uses}{invite.max_uses ? `/${invite.max_uses}` : ''} uses
                      {invite.expires_at && ` | Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyInviteLink(invite.code)}>
                    Copy
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Danger Zone */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <h3 className="font-medium text-red-400">Danger Zone</h3>

            {!isOwner && (
              <Button variant="outline" className="text-red-500 border-red-500" onClick={handleLeave}>
                Leave Group
              </Button>
            )}

            {isOwner && (
              <Button variant="outline" className="text-red-500 border-red-500" onClick={handleDelete}>
                Delete Group
              </Button>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
