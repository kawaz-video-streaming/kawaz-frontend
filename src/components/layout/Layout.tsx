import { Outlet } from 'react-router'
import { Navbar } from './Navbar'

export const Layout = () => (
  <div className="flex h-dvh flex-col overflow-hidden bg-background">
    <Navbar />
    <main className="flex-1 min-h-0 overflow-y-auto px-4 pt-8 sm:px-6 lg:px-10 xl:px-16">
      <div className="mx-auto max-w-7xl h-full flex flex-col">
        <Outlet />
      </div>
    </main>
  </div>
)
