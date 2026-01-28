import { useEffect, useState } from 'react'
import { useGroupStore, GroupMember, GroupRole } from '@/stores/groupStore'
import { useAuthStore } from '@/stores/auth'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface MemberListProps {
  groupId: string
  isCollapsed?: boolean
  onToggle?: () => void
}

const ROLE_COLORS: Record<GroupRole, string> = {
  owner: 'text-yellow-500',
  admin: 'text-red-500',
  moderator: 'text-blue-500',
  member: 'text-gray-400'
}

const ROLE_LABELS: Record<GroupRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Mod',
  member: ''
}

export function MemberList({ groupId, isCollapsed, onToggle }: MemberListProps) {
  const members = useGroupStore((s) => s.members.get(groupId) || [])
  const loadMembers = useGroupStore((s) => s.loadMembers)
  const removeMember = useGroupStore((s) => s.removeMember)
  const changeRole = useGroupStore((s) => s.changeRole)
  const currentUserId = useAuthStore((s) => s.user?.id)

  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null)

  useEffect(() => {
    loadMembers(groupId)
  }, [groupId, loadMembers])

  const currentUserRole = members.find(m => m.user_id === String(currentUserId))?.role

  const canManageRoles = currentUserRole === 'owner'
  const canRemove = currentUserRole === 'owner' || currentUserRole === 'admin'

  // Group members by role
  const groupedMembers = {
    owner: members.filter(m => m.role === 'owner'),
    admin: members.filter(m => m.role === 'admin'),
    moderator: members.filter(m => m.role === 'moderator'),
    member: members.filter(m => m.role === 'member')
  }

  const handleRoleChange = async (userId: string, newRole: GroupRole) => {
    await changeRole(groupId, userId, newRole)
    setSelectedMember(null)
  }

  const handleRemove = async (userId: string) => {
    if (confirm('Remove this member from the group?')) {
      await removeMember(groupId, userId)
      setSelectedMember(null)
    }
  }

  if (isCollapsed) {
    return (
      <button
        onClick={onToggle}
        className="p-2 text-gray-400 hover:text-white"
        title="Show members"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="w-60 border-l border-gray-800 bg-gray-900 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="font-medium text-gray-300">Members - {members.length}</h3>
        {onToggle && (
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-2">
        {Object.entries(groupedMembers).map(([role, roleMembers]) => {
          if (roleMembers.length === 0) return null

          return (
            <div key={role} className="mb-4">
              {role !== 'member' && (
                <div className={cn('text-xs font-semibold uppercase px-2 py-1', ROLE_COLORS[role as GroupRole])}>
                  {ROLE_LABELS[role as GroupRole]} - {roleMembers.length}
                </div>
              )}
              {role === 'member' && (
                <div className="text-xs font-semibold uppercase px-2 py-1 text-gray-500">
                  Members - {roleMembers.length}
                </div>
              )}

              {roleMembers.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800 cursor-pointer group"
                  onClick={() => setSelectedMember(selectedMember?.user_id === member.user_id ? null : member)}
                >
                  <Avatar
                    className="w-8 h-8"
                    fallback={member.email.charAt(0).toUpperCase()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {member.email.split('@')[0]}
                      {member.user_id === String(currentUserId) && (
                        <span className="text-gray-500 ml-1">(you)</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Member Actions Popover */}
      {selectedMember && selectedMember.user_id !== String(currentUserId) && (
        <div className="fixed inset-0 z-50" onClick={() => setSelectedMember(null)}>
          <div
            className="absolute right-64 top-1/3 bg-gray-800 rounded-lg shadow-xl p-4 min-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium mb-2">{selectedMember.email.split('@')[0]}</p>
            <p className="text-sm text-gray-400 mb-4">{ROLE_LABELS[selectedMember.role] || 'Member'}</p>

            {canManageRoles && selectedMember.role !== 'owner' && (
              <div className="space-y-1 mb-4">
                <p className="text-xs text-gray-500 uppercase">Change Role</p>
                {(['admin', 'moderator', 'member'] as GroupRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(selectedMember.user_id, role)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 rounded text-sm hover:bg-gray-700',
                      selectedMember.role === role && 'bg-gray-700'
                    )}
                  >
                    {ROLE_LABELS[role] || 'Member'}
                  </button>
                ))}
              </div>
            )}

            {canRemove && selectedMember.role !== 'owner' && (
              <button
                onClick={() => handleRemove(selectedMember.user_id)}
                className="w-full text-left px-3 py-1.5 rounded text-sm text-red-500 hover:bg-red-500/10"
              >
                Remove from Group
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
