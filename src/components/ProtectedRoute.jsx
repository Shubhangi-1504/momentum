import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, profile, loading, profileError, signOut } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Profile failed to load — show error with retry option
  if (profileError && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-8">
          <div className="text-red-500 text-lg font-semibold mb-2">Profile Error</div>
          <p className="text-gray-600 mb-4">{profileError}</p>
          <p className="text-gray-500 text-sm mb-6">
            Your profile may not have been created. Try signing out and signing up again,
            or make sure your Supabase migrations have been applied.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Retry
            </button>
            <button
              onClick={async () => { await signOut(); window.location.href = '/login'; }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Profile hasn't loaded yet — show loading instead of redirecting
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  // Check if user has the required role
  if (role && profile.role !== role) {
    return <Navigate to={`/${profile.role || 'student'}`} replace />
  }

  return children
}
