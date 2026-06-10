import { Capacitor } from '@capacitor/core'
import { Outlet } from 'react-router'
import { Navbar } from './Navbar'
import { BottomNav } from './BottomNav'

export const Layout = () => {
  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-y-auto px-4 pt-8 sm:px-6 md:px-8 md:pb-0 lg:px-10 xl:px-16 pb-20 landscape:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      {Capacitor.isNativePlatform() && (
        <div className="fixed bottom-0 left-0 right-0 z-49 bg-background landscape:hidden" style={{ height: '3rem' }} aria-hidden />
      )}
    </div>
  )
}
