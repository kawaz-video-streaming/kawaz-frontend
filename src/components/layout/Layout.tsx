import { Capacitor } from '@capacitor/core'
import { Outlet } from 'react-router'
import { Navbar } from './Navbar'
import { BottomNav } from './BottomNav'

// iOS WKWebView doesn't reliably honour position:sticky/fixed with body scroll,
// so on iOS we lock the shell to the viewport and scroll only inside <main>.
const isIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export const Layout = () => {
  return (
    <div className={`flex flex-col bg-background ${isIOS ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      <div className="sticky top-0 z-50">
        <Navbar />
      </div>
      <main className={`flex-1 px-4 pt-8 sm:px-6 md:px-8 md:pb-0 lg:px-10 xl:px-16 pb-20 landscape:pb-0${isIOS ? ' overflow-y-auto overflow-x-hidden' : ''}`}>
        <Outlet />
      </main>
      <BottomNav />
      {Capacitor.isNativePlatform() && (
        <div className="fixed bottom-0 left-0 right-0 z-49 bg-background landscape:hidden" style={{ height: '3rem' }} aria-hidden />
      )}
    </div>
  )
}
