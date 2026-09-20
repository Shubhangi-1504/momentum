import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { UserPlus, Mail, Lock, User, BookOpen, Award, AlertCircle } from 'lucide-react'

export default function SignupPage() {
  const [role, setRole] = useState('student')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [usn, setUsn] = useState('')
  const [credentials, setCredentials] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const userData = {
      fullName,
      role,
      usn: role === 'student' ? usn : undefined,
      credentials: role === 'mentor' ? credentials : undefined,
    }

    const { error } = await signUp(email, password, userData)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate(`/${role}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0FAF0] via-[#F5FBF5] to-[#E8F5E9] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4 shadow-lg shadow-[#4CAF50]/25">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join the Student Study Tracker Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              I am a...
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                  role === 'student'
                    ? 'border-primary bg-primary-soft text-primary-dark'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <BookOpen className="w-8 h-8" />
                <span className="font-medium">Student</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('mentor')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                  role === 'mentor'
                    ? 'border-primary bg-primary-soft text-primary-dark'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Award className="w-8 h-8" />
                <span className="font-medium">Mentor</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary outline-none transition"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            {role === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  USN (University Seat Number)
                </label>
                <input
                  type="text"
                  value={usn}
                  onChange={(e) => setUsn(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary outline-none transition"
                  placeholder="1XX21XX000"
                  required
                />
              </div>
            )}

            {role === 'mentor' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credentials
                </label>
                <input
                  type="text"
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary outline-none transition"
                  placeholder="PhD in Computer Science"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary outline-none transition"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary outline-none transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary outline-none transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary hover:bg-[#43A047] disabled:bg-[#81C784] text-white font-medium rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Creating account...</>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:text-[#43A047] font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
