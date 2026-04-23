import { Outlet } from 'react-router'
import { Navbar } from './Navbar'

export const Layout = () => (
  <div className="flex h-dvh flex-col overflow-hidden bg-background">
    <Navbar />
    <main className="flex-1 min-h-0 overflow-y-auto px-4 py-8 sm:px-6 lg:px-10">
      <Outlet />
    </main>
  </div>
)
