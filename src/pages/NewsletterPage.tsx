import { useState } from 'react'
import { Input } from '../components/ui/input'
import { useSendNewsletter } from '../hooks/useSendNewsletter'

export const NewsletterPage = () => {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { mutate: send, isPending } = useSendNewsletter()

  const canSend = subject.trim().length > 0 && body.trim().length > 0

  const handleSend = () => {
    setError(null)
    send({ subject, body }, {
      onSuccess: (data) => {
        setSuccessMessage(data.message)
        setConfirming(false)
        setSubject('')
        setBody('')
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Failed to send newsletter.')
        setConfirming(false)
      },
    })
  }

  const previewHtml = `
    <div style="font-family:-apple-system,sans-serif;background:#18181b;border-radius:8px;padding:24px;color:#e4e4e7;">
      <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:16px;letter-spacing:-0.5px;">
        Kawaz<span style="color:#ef4444;">+</span>
      </div>
      <div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:12px;">${subject || '<span style="color:#52525b;">Subject preview</span>'}</div>
      <div style="font-size:14px;color:#a1a1aa;line-height:1.7;">
        Hi <span style="color:#e4e4e7;">username</span>,<br><br>
        ${(body || '<span style="color:#52525b;">Body preview</span>').replace(/\n/g, '<br>')}
      </div>
      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #27272a;font-size:11px;color:#52525b;">
        You're receiving this email because you have a Kawaz+ account.
      </div>
    </div>
  `

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-xl font-bold">Send Newsletter</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compose */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Subject</label>
            <Input
              placeholder="e.g. Kawaz+ is now available on Android TV"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setSuccessMessage(null) }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Body</label>
            <textarea
              placeholder="Write your message here..."
              value={body}
              onChange={(e) => { setBody(e.target.value); setSuccessMessage(null) }}
              rows={12}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {successMessage && (
            <p className="rounded-lg bg-green-950/60 px-3 py-2 text-sm text-green-300 ring-1 ring-green-700">
              {successMessage}
            </p>
          )}

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={!canSend}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send to all users
            </button>
          ) : (
            <div className="rounded-xl border border-red-900/50 bg-card p-4 flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                This will send an email to <span className="font-semibold text-foreground">every approved user</span>. Are you sure?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSend}
                  disabled={isPending}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-40"
                >
                  {isPending ? 'Sending...' : 'Yes, send it'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={isPending}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">Email preview</label>
          <div
            className="rounded-xl border border-border overflow-hidden"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  )
}
