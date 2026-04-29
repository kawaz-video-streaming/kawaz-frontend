import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useGenres } from '../hooks/useGenres'
import { useCreateGenre } from '../hooks/useCreateGenre'
import { useDeleteGenre } from '../hooks/useDeleteGenre'

export const GenreAdminPage = () => {
    const { data: genres, isLoading } = useGenres()
    const { mutate: createGenre, isPending: isCreating } = useCreateGenre()
    const { mutate: deleteGenre, isPending: isDeleting } = useDeleteGenre()
    const [newName, setNewName] = useState('')
    const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null)

    const handleCreate = () => {
        const name = newName.trim()
        if (!name) return
        createGenre(name, { onSuccess: () => setNewName('') })
    }

    return (
        <div className="mx-auto max-w-xl">
            <div className="mb-8">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Genres</h1>
                <p className="mt-1 text-sm text-muted-foreground">Manage media genre tags</p>
            </div>

            <div className="mb-6 flex gap-2">
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="New genre name…"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                />
                <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || isCreating}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Plus size={16} />
                    Add
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-red-500" />
                </div>
            ) : (genres ?? []).length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">No genres yet.</p>
            ) : (
                <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {(genres ?? []).map((genre) => (
                        <li key={genre._id} className="flex items-center justify-between bg-card px-4 py-3">
                            <span className="text-sm font-medium">{genre.name}</span>
                            <button
                                onClick={() => setPendingDeleteName(genre.name)}
                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-red-500"
                                aria-label={`Delete ${genre.name}`}
                            >
                                <Trash2 size={15} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {pendingDeleteName && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
                        <h2 className="text-lg font-semibold">Delete genre?</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            This will permanently delete{' '}
                            <span className="font-medium text-foreground">"{pendingDeleteName}"</span>. This cannot be undone.
                        </p>
                        <div className="mt-5 flex gap-2">
                            <button
                                onClick={() => deleteGenre(pendingDeleteName, { onSettled: () => setPendingDeleteName(null) })}
                                disabled={isDeleting}
                                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
                            >
                                {isDeleting ? 'Deleting…' : 'Delete'}
                            </button>
                            <button
                                onClick={() => setPendingDeleteName(null)}
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
