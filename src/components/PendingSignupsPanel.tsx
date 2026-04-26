import { useState } from 'react'
import { UserCheck, UserX, X } from 'lucide-react'
import { usePendingUsers } from '../hooks/usePendingUsers'
import { useApproveUser } from '../hooks/useApproveUser'
import { useDenyUser } from '../hooks/useDenyUser'

export const PendingSignupsPanel = ({ onClose, positionClass }: { onClose: () => void; positionClass?: string }) => {
  const { data: users, isLoading } = usePendingUsers(true, true)
  const { mutate: approve, isPending: approving } = useApproveUser()
  const { mutate: deny, isPending: denying } = useDenyUser()
  const [confirmDeny, setConfirmDeny] = useState<string | null>(null)
  const busy = approving || denying

  return (
    <div className={`${positionClass ?? 'absolute right-0 top-full mt-2 w-80'} rounded-xl border border-border bg-card shadow-xl`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Pending Signups</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-red-500" />
          </div>
        ) : !users || users.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No pending signups.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {users.map((user) => (
              <li key={user.name} className="flex flex-col gap-2 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(user.name)}
                    disabled={busy}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <UserCheck size={12} />
                    Approve
                  </button>
                  {confirmDeny === user.name ? (
                    <div className="flex flex-1 gap-1.5">
                      <button
                        onClick={() => { deny(user.name); setConfirmDeny(null) }}
                        disabled={busy}
                        className="flex-1 rounded-lg bg-red-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeny(null)}
                        className="flex-1 rounded-lg border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeny(user.name)}
                      disabled={busy}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-700/50 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <UserX size={12} />
                      Deny
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
