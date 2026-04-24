import { Outlet } from 'react-router'
import { Navbar } from './Navbar'
import { useSpatialNavigation } from '../../hooks/useSpatialNavigation'

export const Layout = () => {
  useSpatialNavigation()
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <div className="sticky top-0 z-50">
        <Navbar />
      </div>
      <main className="flex-1 px-4 pt-8 sm:px-6 lg:px-10 xl:px-16">
        <Outlet />
      </main>
    </div>
  )
}
