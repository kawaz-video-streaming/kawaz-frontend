import { Outlet } from 'react-router'
import { Navbar } from './Navbar'

export const Layout = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Outlet />
    </main>
  </div>
)
