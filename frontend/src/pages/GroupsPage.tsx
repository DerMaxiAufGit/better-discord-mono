import { useState, useEffect } from 'react'
import { useGroupStore } from '@/stores/groupStore'
import { GroupCreator } from '@/components/groups/GroupCreator'
import { GroupSettings } from '@/components/groups/GroupSettings'
import { MemberList } from '@/components/groups/MemberList'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function GroupsPage() {
  const [showCreator, setShowCreator] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMembers, setShowMembers] = useState(true)

  const groups = useGroupStore((s) => s.groups)
  const selectedGroupId = useGroupStore((s) => s.selectedGroupId)
  const loadGroups = useGroupStore((s) => s.loadGroups)
  const selectGroup = useGroupStore((s) => s.selectGroup)

  const selectedGroup = groups.find((g: { id: string }) => g.id === selectedGroupId)

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  return (
    <div className="flex h-full">
      {/* Group list sidebar */}
      <div className="w-64 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold">Groups</h2>
          <Button size="sm" onClick={() => setShowCreator(true)}>
            + New
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => selectGroup(group.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 hover:bg-gray-800 transition-colors',
                selectedGroupId === group.id && 'bg-gray-800'
              )}
            >
              <Avatar fallback={group.name.charAt(0)} />
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium truncate">{group.name}</p>
                <p className="text-xs text-gray-500">{group.member_count} members</p>
              </div>
            </button>
          ))}

          {groups.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <p>No groups yet</p>
              <Button variant="link" onClick={() => setShowCreator(true)}>
                Create your first group
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {selectedGroup ? (
          <>
            {/* Conversation view */}
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{selectedGroup.name}</h2>
                  {selectedGroup.description && (
                    <p className="text-sm text-gray-500">{selectedGroup.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMembers(!showMembers)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
                    title="Toggle members"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
                    title="Group settings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Group conversation - placeholder for now */}
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">Group messaging coming soon</p>
                  <p className="text-sm">Backend group message integration pending</p>
                </div>
              </div>
            </div>

            {/* Member list sidebar */}
            {showMembers && (
              <MemberList
                groupId={selectedGroup.id}
                onToggle={() => setShowMembers(false)}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a group or create a new one
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreator && (
        <GroupCreator
          onClose={() => setShowCreator(false)}
          onCreated={(groupId) => {
            selectGroup(groupId)
            setShowCreator(false)
          }}
        />
      )}

      {showSettings && selectedGroup && (
        <GroupSettings
          group={selectedGroup}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
