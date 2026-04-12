import { X } from 'lucide-react'
import { usePendingMedia } from '../hooks/usePendingMedia'
import type { MediaStatus } from '../types/api'

const STATUS_LABEL: Record<MediaStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
}

const STATUS_COLOR: Record<MediaStatus, string> = {
  pending: 'text-yellow-500',
  processing: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
}

const TRACK_COLOR: Record<MediaStatus, string> = {
  pending: 'stroke-yellow-500/30',
  processing: 'stroke-blue-500/30',
  completed: 'stroke-green-500/30',
  failed: 'stroke-red-500/30',
}

const FILL_COLOR: Record<MediaStatus, string> = {
  pending: 'stroke-yellow-500',
  processing: 'stroke-blue-500',
  completed: 'stroke-green-500',
  failed: 'stroke-red-500',
}

const CircularProgress = ({ percentage, status }: { percentage: number; status: MediaStatus }) => {
  const floored = Math.floor(percentage)
  const r = 22
  const circumference = 2 * Math.PI * r
  const offset = circumference - (floored / 100) * circumference

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
      <svg className="-rotate-90" width="64" height="64" viewBox="0 0 64 64">
        {/* Track */}
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          strokeWidth="4"
          className={TRACK_COLOR[status]}
        />
        {/* Fill */}
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${FILL_COLOR[status]} transition-[stroke-dashoffset] duration-500`}
        />
      </svg>
      <span className={`absolute text-xs font-semibold tabular-nums ${STATUS_COLOR[status]}`}>
        {Math.floor(percentage)}%
      </span>
    </div>
  )
}

export const MediaProcessingPanel = ({ onClose }: { onClose: () => void }) => {
  const { data: items, isLoading } = usePendingMedia(true)

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Media Processing</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[420px] overflow-y-auto py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-red-500" />
          </div>
        ) : !items || items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No media currently processing.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={item._id} className="flex items-center gap-3 px-4 py-3">
                <CircularProgress percentage={item.percentage} status={item.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className={`text-xs font-medium ${STATUS_COLOR[item.status]}`}>
                    {STATUS_LABEL[item.status]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
