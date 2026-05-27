export const PrivacyPolicyPage = () => (
  <div className="dark min-h-screen bg-zinc-950 px-4 py-12">
    <div className="mx-auto max-w-2xl">
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
          Kawaz<span className="text-red-500">+</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">Privacy Policy</p>
      </div>

      <div className="rounded-2xl bg-zinc-900/80 p-8 shadow-2xl ring-1 ring-white/10 space-y-8 text-zinc-300 text-sm leading-relaxed">
        <p className="text-zinc-500 text-xs">Effective date: May 27, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">1. Overview</h2>
          <p>
            Kawaz+ is a private video streaming platform. This policy explains what personal data we collect,
            why we collect it, and how it is handled. We do not sell or share your data with advertisers or
            third-party marketing services.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">2. Data We Collect</h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><span className="text-zinc-200">Account credentials</span> — username, email address, and a hashed (bcrypt) copy of your password. Your plaintext password is never stored.</li>
            <li><span className="text-zinc-200">Google account data</span> — if you sign in with Google, we receive your name, email address, and Google account ID from Google's OAuth service.</li>
            <li><span className="text-zinc-200">User profiles</span> — profile names and avatar image selections you create within the app.</li>
            <li><span className="text-zinc-200">Authentication tokens</span> — a JWT stored as an HttpOnly cookie. It is not accessible to JavaScript and expires after 2 days.</li>
            <li><span className="text-zinc-200">Password reset tokens</span> — a one-time token emailed to you when you request a password reset. It is stored in hashed form and expires after 1 hour.</li>
            <li><span className="text-zinc-200">Device authorization codes</span> — short-lived codes (60-second expiry, held in memory only) used when signing in on TV or limited-input devices.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">3. How We Use Your Data</h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>To authenticate you and maintain your session.</li>
            <li>To provide access to the video streaming content on the platform.</li>
            <li>To send transactional emails (account approval decisions, password reset links). No marketing emails are sent.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">4. Data Retention</h2>
          <p>
            Your account data (username, email, profiles) is retained for as long as your account exists.
            Password reset tokens expire after 1 hour. Authentication cookies expire after 2 days.
            If you request account deletion, all personal data associated with your account will be removed.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">5. Third-Party Services</h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <span className="text-zinc-200">Google OAuth</span> — if you use Google Sign-In, your authentication is handled by Google.
              Google's own <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline">Privacy Policy</a> applies to that interaction.
            </li>
            <li>
              <span className="text-zinc-200">Cloud storage</span> — video files, thumbnails, and avatar images are stored on S3-compatible object storage. These are binary assets, not personal data.
            </li>
            <li>
              <span className="text-zinc-200">Database hosting</span> — account data is stored in a MongoDB database hosted on a cloud provider. Data is not shared with or accessible to that provider for any purpose other than storage.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">6. Data Sharing</h2>
          <p>
            We do not sell, rent, or share your personal data with any third party for advertising,
            analytics, or any other commercial purpose. Data is only disclosed if required by law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">7. Your Rights</h2>
          <p>You may request at any time:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>A copy of the personal data we hold about you.</li>
            <li>Correction of inaccurate data.</li>
            <li>Deletion of your account and all associated personal data.</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us at the address below.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">8. Children</h2>
          <p>
            Kawaz+ is not directed at children under the age of 13. We do not knowingly collect
            personal data from children under 13. If you believe a child has provided us with
            personal data, please contact us and we will delete it promptly.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">9. Contact</h2>
          <p>
            For privacy-related questions or requests, contact us at:{' '}
            <a href="mailto:idohaker@gmail.com" className="text-red-400 hover:text-red-300 underline">
              idohaker@gmail.com
            </a>
          </p>
        </section>

        <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          This policy may be updated from time to time. The effective date at the top of this page will reflect the most recent revision.
        </p>
      </div>
    </div>
  </div>
)
