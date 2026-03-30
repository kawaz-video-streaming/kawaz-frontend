import { BrowserRouter, Routes, Route } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from './auth/AuthContext'
import { ThemeProvider } from './theme/ThemeContext'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { UploadPage } from './pages/UploadPage'
import { VideoPage } from './pages/VideoPage'

export const App = () => (
  <ThemeProvider>
  <AuthProvider>
    <Toaster position="bottom-center" />
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="videos/:id" element={<VideoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
  </ThemeProvider>
)
