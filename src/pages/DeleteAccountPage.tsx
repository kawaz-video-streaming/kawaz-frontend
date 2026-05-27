export const DeleteAccountPage = () => (
  <div className="dark min-h-screen bg-zinc-950 px-4 py-12">
    <div className="mx-auto max-w-2xl">
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
          Kawaz<span className="text-red-500">+</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">Account &amp; Data Deletion</p>
      </div>

      <div className="rounded-2xl bg-zinc-900/80 p-8 shadow-2xl ring-1 ring-white/10 space-y-8 text-zinc-300 text-sm leading-relaxed">

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">Delete your entire account</h2>
          <p>
            To permanently delete your Kawaz+ account and all associated data:
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>Sign in to the Kawaz+ app.</li>
            <li>Open the account menu (top-right avatar button).</li>
            <li>Tap <span className="font-semibold text-zinc-200">Account settings</span>.</li>
            <li>Scroll to the <span className="font-semibold text-red-400">Danger zone</span> section and tap <span className="font-semibold text-zinc-200">Delete account</span>.</li>
            <li>Type your username to confirm, then tap <span className="font-semibold text-zinc-200">Confirm delete</span>.</li>
          </ol>
          <p className="mt-2">
            <span className="font-semibold text-zinc-200">What is deleted:</span> your account record, email address, hashed password, and all profiles.
          </p>
          <p>
            <span className="font-semibold text-zinc-200">What is not deleted:</span> video content and collections on the platform (these are administrator-managed, not user-owned).
          </p>
          <p>
            Deletion is immediate and cannot be undone.
          </p>
        </section>

        <div className="border-t border-zinc-800" />

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">Delete specific data only (without deleting your account)</h2>
          <p>
            You can delete individual profiles without removing your account:
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>Sign in to the Kawaz+ app.</li>
            <li>Open the account menu and tap <span className="font-semibold text-zinc-200">Change profile</span>.</li>
            <li>On the profiles screen, select the profile you want to remove and tap the delete option.</li>
          </ol>
          <p className="mt-2">
            Profile deletion is immediate. Your account and other profiles remain active.
          </p>
        </section>

        <div className="border-t border-zinc-800" />

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">Need help?</h2>
          <p>
            If you are unable to access the app, contact us at{' '}
            <a href="mailto:idohaker@gmail.com" className="text-red-400 hover:text-red-300 underline">
              idohaker@gmail.com
            </a>{' '}
            with the subject <span className="font-semibold text-zinc-200">"Delete my Kawaz+ account"</span> and include your username.
            We will process the request within 30 days.
          </p>
        </section>

      </div>
    </div>
  </div>
)
