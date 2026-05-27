import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { useDeleteAccount } from '../hooks/useDeleteAccount'
import { Input } from '../components/ui/input'

export const AccountPage = () => {
  const { username, logout } = useAuth()
  const navigate = useNavigate()
  const { mutate: deleteAccount, isPending } = useDeleteAccount()

  const [confirming, setConfirming] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleDeleteClick = () => {
    setConfirming(true)
    setError(null)
  }

  const handleCancel = () => {
    setConfirming(false)
    setConfirmInput('')
    setError(null)
  }

  const handleConfirm = () => {
    if (confirmInput !== username) {
      setError('Username does not match.')
      return
    }
    deleteAccount(undefined, {
      onSuccess: () => {
        logout()
        void navigate('/login')
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Failed to delete account.')
      },
    })
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-xl font-bold">Account</h1>

      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="mt-0.5 font-semibold">{username}</p>
      </div>

      <div className="rounded-xl border border-red-900/50 bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold text-red-500">Danger zone</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Permanently deletes your account, all profiles, and associated data. This cannot be undone.
        </p>

        {!confirming ? (
          <button
            onClick={handleDeleteClick}
            className="rounded-lg border border-red-700 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-950/40"
          >
            Delete account
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-semibold text-foreground">{username}</span> to confirm:
            </p>
            <Input
              value={confirmInput}
              onChange={(e) => { setConfirmInput(e.target.value); setError(null) }}
              placeholder="Your username"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              autoFocus
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={isPending || confirmInput !== username}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending ? 'Deleting...' : 'Confirm delete'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
