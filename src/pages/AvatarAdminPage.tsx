import { useRef, useState, type ChangeEvent } from 'react'
import { Trash2, Plus, X, Image } from 'lucide-react'
import { useAvatars } from '../hooks/useAvatars'
import { useUploadAvatar } from '../hooks/useUploadAvatar'
import { useDeleteAvatar } from '../hooks/useDeleteAvatar'
import { useAvatarCategories } from '../hooks/useAvatarCategories'
import { useCreateAvatarCategory } from '../hooks/useCreateAvatarCategory'
import { useDeleteAvatarCategory } from '../hooks/useDeleteAvatarCategory'
import { avatarImageUrl } from '../api/avatar'
import type { Avatar, AvatarCategory } from '../types/api'

const UploadForm = ({ categories, onClose }: { categories: AvatarCategory[]; onClose: () => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const { mutate: upload, isPending } = useUploadAvatar()

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSubmit = () => {
    if (!name.trim() || !categoryId || !file) return
    upload(
      { name: name.trim(), categoryId, file },
      {
        onSuccess: () => {
          if (preview) URL.revokeObjectURL(preview)
          onClose()
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload Avatar</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="avatar-name">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="avatar-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shinji Ikari"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="avatar-category">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="avatar-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <option value="">— Select a category —</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Image <span className="text-red-500">*</span>
            </label>
            {preview ? (
              <div className="flex justify-center">
                <div className="relative w-48">
                  <div className="h-48 w-48 overflow-hidden rounded-full">
                    <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="absolute -right-2 -top-2 rounded-full bg-background p-1 text-muted-foreground shadow ring-1 ring-border hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-red-500/50 hover:bg-accent/50 hover:text-foreground"
              >
                <Image size={16} />
                Choose image
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !categoryId || !file || isPending}
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? 'Uploading…' : 'Upload'}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const AvatarCard = ({ avatar, onDelete }: { avatar: Avatar; onDelete: (id: string) => void }) => (
  <div className="relative flex flex-col items-center gap-2 p-2">
    <div className="h-24 w-24 sm:h-36 sm:w-36 lg:h-48 lg:w-48 overflow-hidden rounded-full ring-1 ring-border">
      <img src={avatarImageUrl(avatar._id)} alt={avatar.name} className="h-full w-full object-cover" />
    </div>
    <span className="w-24 sm:w-36 lg:w-48 truncate text-center text-xs font-medium">{avatar.name}</span>
    <button
      onClick={() => onDelete(avatar._id)}
      className="absolute right-0 top-0 rounded-full bg-background p-1.5 text-muted-foreground shadow ring-1 ring-border transition-colors hover:text-red-500"
      aria-label={`Delete ${avatar.name}`}
    >
      <Trash2 size={14} />
    </button>
  </div>
)

export const AvatarAdminPage = () => {
  const { data: avatars, isLoading } = useAvatars()
  const { data: categories, isLoading: categoriesLoading } = useAvatarCategories()
  const { mutate: deleteAvatar, isPending: isDeleting } = useDeleteAvatar()
  const { mutate: createCategory, isPending: isCreatingCat } = useCreateAvatarCategory()
  const { mutate: deleteCategory, isPending: isDeletingCat } = useDeleteAvatarCategory()
  const [showUpload, setShowUpload] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [pendingDeleteCatId, setPendingDeleteCatId] = useState<string | null>(null)

  const byCategory = (avatars ?? []).reduce<Record<string, Avatar[]>>((acc, a) => {
    (acc[a.categoryId] ??= []).push(a);
    return acc;
  }, {})

  const pendingAvatar = pendingDeleteId ? avatars?.find((a) => a._id === pendingDeleteId) : null
  const pendingCategory = pendingDeleteCatId ? categories?.find((c) => c._id === pendingDeleteCatId) : null

  const confirmDeleteAvatar = () => {
    if (!pendingDeleteId) return
    deleteAvatar(pendingDeleteId, { onSettled: () => setPendingDeleteId(null) })
  }

  const handleCreateCategory = () => {
    const name = newCategoryName.trim()
    if (!name) return
    createCategory(name, { onSuccess: () => setNewCategoryName('') })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Avatars</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage the avatar catalog</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 sm:px-4"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Upload Avatar</span>
          <span className="sm:hidden">Upload</span>
        </button>
      </div>

      {/* Category management */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Categories</h2>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
            placeholder="New category name…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          />
          <button
            onClick={handleCreateCategory}
            disabled={!newCategoryName.trim() || isCreatingCat}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
        {categoriesLoading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-red-500" />
        ) : (categories ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {(categories ?? []).map((cat) => (
              <li key={cat._id} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm">
                <span>{cat.name}</span>
                <button
                  onClick={() => setPendingDeleteCatId(cat._id)}
                  className="ml-0.5 text-muted-foreground transition-colors hover:text-red-500"
                  aria-label={`Delete ${cat.name}`}
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Avatar gallery */}
      {(isLoading || categoriesLoading) ? (
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-red-500" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {(categories ?? []).map((cat) => {
            const items = byCategory[cat._id] ?? []
            return (
              <div key={cat._id}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">{cat.name}</h2>
                <div className="flex min-h-40 flex-wrap content-start gap-4">
                  {items.length === 0 ? (
                    <p className="self-center text-sm text-muted-foreground">No avatars in this category yet.</p>
                  ) : (
                    items.map((avatar) => (
                      <AvatarCard key={avatar._id} avatar={avatar} onDelete={(id) => setPendingDeleteId(id)} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showUpload && <UploadForm categories={categories ?? []} onClose={() => setShowUpload(false)} />}

      {/* Delete avatar confirmation */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Delete avatar?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This will permanently delete <span className="font-medium text-foreground">"{pendingAvatar?.name}"</span>. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={confirmDeleteAvatar}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={() => setPendingDeleteId(null)}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete category confirmation */}
      {pendingDeleteCatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Delete category?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This will permanently delete{' '}
              <span className="font-medium text-foreground">"{pendingCategory?.name}"</span>. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => deleteCategory(pendingDeleteCatId, { onSettled: () => setPendingDeleteCatId(null) })}
                disabled={isDeletingCat}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                {isDeletingCat ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={() => setPendingDeleteCatId(null)}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
