import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Trash2, X, ChevronRight, Pencil } from 'lucide-react'
import { useProfiles } from '../hooks/useProfiles'
import { useCreateProfile } from '../hooks/useCreateProfile'
import { useUpdateProfile } from '../hooks/useUpdateProfile'
import { useDeleteProfile } from '../hooks/useDeleteProfile'
import { useAvatars } from '../hooks/useAvatars'
import { useAuth } from '../auth/useAuth'
import { avatarImageUrl } from '../api/avatar'
import type { Avatar } from '../types/api'

const AvatarPickerDialog = ({
  avatars,
  onSelect,
  onClose,
}: {
  avatars: Avatar[]
  onSelect: (avatar: Avatar) => void
  onClose: () => void
}) => {
  const byCategory = avatars.reduce<Record<string, Avatar[]>>((acc, a) => {
    ;(acc[a.category] ??= []).push(a)
    return acc
  }, {})
  const categories = Object.keys(byCategory).sort()

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-semibold">Choose an avatar</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground">
          <div className="flex flex-col gap-6">
            {categories.map((cat) => (
              <div key={cat}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{cat}</p>
                <div className="flex flex-wrap gap-3">
                  {byCategory[cat].map((avatar) => (
                    <button
                      key={avatar._id}
                      type="button"
                      onClick={() => { onSelect(avatar); onClose() }}
                      className="flex flex-col items-center gap-1.5 transition-transform hover:scale-105 focus:outline-none"
                    >
                      <div className="h-20 w-20 overflow-hidden rounded-full ring-1 ring-border focus-within:ring-2 focus-within:ring-red-500">
                        <img src={avatarImageUrl(avatar._id)} alt={avatar.name} className="h-full w-full object-cover" />
                      </div>
                      <span className="max-w-20 truncate text-[11px] text-muted-foreground">{avatar.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const ProfilesPage = () => {
  const navigate = useNavigate()
  const { selectProfile } = useAuth()
  const { data: profiles, isLoading: profilesLoading } = useProfiles()
  const { data: avatars } = useAvatars()
  const { mutate: createProfile, isPending: creating } = useCreateProfile()
  const { mutate: deleteProfile, isPending: deleting } = useDeleteProfile()

  const { mutate: updateProfile } = useUpdateProfile()

  const [adding, setAdding] = useState(false)
  const [pickingAvatar, setPickingAvatar] = useState(false)
  const [editingProfileName, setEditingProfileName] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null)
  const [deletingName, setDeletingName] = useState<string | null>(null)

  const resetForm = () => {
    setProfileName('')
    setSelectedAvatar(null)
    setAdding(false)
  }

  const handleCreate = () => {
    if (!profileName.trim() || !selectedAvatar) return
    createProfile(
      { profileName: profileName.trim(), avatarId: selectedAvatar._id },
      { onSuccess: resetForm },
    )
  }

  const handleDelete = (name: string) => {
    setDeletingName(name)
    deleteProfile(name, { onSettled: () => setDeletingName(null) })
  }

  const avatarMap = new Map(avatars?.map((a) => [a._id, a]))

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Who's watching?</h1>
      <p className="mb-10 text-sm text-muted-foreground">Select a profile to continue</p>

      {profilesLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-red-500" />
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
          {profiles?.map((profile) => {
            const avatar = avatarMap.get(profile.avatarId)
            return (
              <div key={profile.name} className="group relative flex flex-col items-center gap-2">
                <button
                  onClick={() => { selectProfile({ name: profile.name, avatarId: profile.avatarId }); void navigate('/') }}
                  className="relative overflow-hidden rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  {avatar ? (
                    <div className="h-36 w-36 overflow-hidden rounded-full sm:h-48 sm:w-48 lg:h-64 lg:w-64 xl:h-72 xl:w-72">
                      <img src={avatarImageUrl(avatar._id)} alt={avatar.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-36 w-36 items-center justify-center rounded-full bg-accent text-3xl font-bold text-muted-foreground sm:h-48 sm:w-48 lg:h-64 lg:w-64 xl:h-72 xl:w-72">
                      {profile.name[0]?.toUpperCase()}
                    </div>
                  )}
                </button>
                <span className="text-sm font-medium">{profile.name}</span>
                <button
                  onClick={() => setEditingProfileName(profile.name)}
                  className="absolute -left-2 -top-2 hidden rounded-full bg-background p-1 text-muted-foreground shadow ring-1 ring-border transition-colors hover:text-foreground group-hover:flex"
                  aria-label={`Change avatar for ${profile.name}`}
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleDelete(profile.name)}
                  disabled={deleting && deletingName === profile.name}
                  className="absolute -right-2 -top-2 hidden rounded-full bg-background p-1 text-muted-foreground shadow ring-1 ring-border transition-colors hover:text-red-500 group-hover:flex"
                  aria-label={`Delete ${profile.name}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}

          {/* Add profile button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setAdding(true)}
              className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-red-500/50 hover:bg-accent/50 hover:text-foreground sm:h-48 sm:w-48 lg:h-64 lg:w-64 xl:h-72 xl:w-72"
              aria-label="Add profile"
            >
              <Plus size={28} />
            </button>
            <span className="text-sm font-medium text-muted-foreground">Add Profile</span>
          </div>
        </div>
      )}

      {/* Add profile modal */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Profile</h2>
              <button onClick={resetForm} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="profile-name">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter a profile name"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Avatar <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPickingAvatar(true)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 transition-colors hover:border-red-500/50 hover:bg-accent/50"
                >
                  {selectedAvatar ? (
                    <>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                        <img src={avatarImageUrl(selectedAvatar._id)} alt={selectedAvatar.name} className="h-full w-full object-cover" />
                      </div>
                      <span className="flex-1 text-left text-sm">{selectedAvatar.name}</span>
                    </>
                  ) : (
                    <span className="flex-1 text-left text-sm text-muted-foreground">Choose an avatar…</span>
                  )}
                  <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreate}
                  disabled={!profileName.trim() || !selectedAvatar || creating}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {creating ? 'Creating…' : 'Create Profile'}
                </button>
                <button
                  onClick={resetForm}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avatar picker dialog — new profile */}
      {pickingAvatar && avatars && (
        <AvatarPickerDialog
          avatars={avatars}
          onSelect={setSelectedAvatar}
          onClose={() => setPickingAvatar(false)}
        />
      )}

      {/* Avatar picker dialog — edit existing profile */}
      {editingProfileName && avatars && (
        <AvatarPickerDialog
          avatars={avatars}
          onSelect={(avatar) => updateProfile({ profileName: editingProfileName, avatarId: avatar._id })}
          onClose={() => setEditingProfileName(null)}
        />
      )}
    </div>
  )
}
