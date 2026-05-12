import { Capacitor } from '@capacitor/core'
import { Outlet } from 'react-router'
import { Navbar } from './Navbar'
import { BottomNav } from './BottomNav'
import { useSpatialNavigation } from '../../hooks/useSpatialNavigation'

export const Layout = () => {
  useSpatialNavigation()
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <div className="sticky top-0 z-50">
        <Navbar />
      </div>
      <main className="flex-1 px-4 pt-8 sm:px-6 lg:px-10 xl:px-16 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      {Capacitor.isNativePlatform() && (
        <div className="fixed bottom-0 left-0 right-0 z-49 bg-background" style={{ height: '3rem' }} aria-hidden />
      )}
    </div>
  )
}
