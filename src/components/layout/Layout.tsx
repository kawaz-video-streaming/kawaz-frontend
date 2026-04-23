import { Outlet } from 'react-router'
import { Navbar } from './Navbar'

export const Layout = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="px-4 py-8 sm:px-6 lg:px-10">
      <Outlet />
    </main>
  </div>
)
