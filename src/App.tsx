import { BrowserRouter, Routes, Route } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from './auth/AuthContext'
import { ThemeProvider } from './theme/ThemeContext'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { LoginPage } from './pages/LoginPage'
import { ProfilesPage } from './pages/ProfilesPage'
import { HomePage } from './pages/HomePage'
import { UploadPage } from './pages/UploadPage'
import { VideoPage } from './pages/VideoPage'
import { CollectionPage } from './pages/CollectionPage'
import { CreateCollectionPage } from './pages/CreateCollectionPage'
import { AvatarAdminPage } from './pages/AvatarAdminPage'
import { GenreAdminPage } from './pages/GenreAdminPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'

export const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <Toaster position="bottom-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route path="/profiles" element={<ProtectedRoute><ProfilesPage /></ProtectedRoute>} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="upload" element={<AdminRoute><UploadPage /></AdminRoute>} />
            <Route path="videos/:id" element={<VideoPage />} />
            <Route path="collections/:collectionId/videos/:id" element={<VideoPage />} />
            <Route path="collections/:id" element={<CollectionPage />} />
            <Route path="collections/new" element={<AdminRoute><CreateCollectionPage /></AdminRoute>} />
            <Route path="admin/avatars" element={<AdminRoute><AvatarAdminPage /></AdminRoute>} />
            <Route path="admin/genres" element={<AdminRoute><GenreAdminPage /></AdminRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
)
