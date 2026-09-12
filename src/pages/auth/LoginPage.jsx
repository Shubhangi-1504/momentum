import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Mail, Lock, User, Hash, AlertCircle, ArrowRight, Zap } from 'lucide-react'
import RoleSelector from '../../components/auth/RoleSelector'
import IllustrationPanel from '../../components/auth/IllustrationPanel'

export default function LoginPage() {
  const [role, setRole] = useState('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [usn, setUsn] = useState('')
  const [mentorName, setMentorName] = useState('')
  const [menteeUsn, setMenteeUsn] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  function handleRoleChange(newRole) {
    setRole(newRole)
    setError('')
    setEmail('')
    setPassword('')
    setUsn('')
    setMentorName('')
    setMenteeUsn('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (role === 'student' && !usn.trim()) {
      setError('Please enter your USN')
      setLoading(false)
      return
    }
    if (role === 'mentor' && !mentorName.trim()) {
      setError('Please enter your name')
      setLoading(false)
      return
    }

    const { data, error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate(`/${role}`)
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Section — Login Form (45%) */}
      <div className="w-[45%] min-w-0 flex items-center justify-center bg-gradient-to-br from-[#F0FAF0] via-[#F5FBF5] to-[#E8F5E9] relative">
        {/* Subtle decorative circles */}
        <div className="absolute top-[-60px] left-[-60px] w-48 h-48 bg-[#C8E6C9] rounded-full opacity-30 blur-3xl" />
        <div className="absolute bottom-[-40px] right-[-40px] w-40 h-40 bg-[#A5D6A7] rounded-full opacity-20 blur-3xl" />

        <div className="relative z-10 w-full max-w-md px-8">
          {/* White Login Card */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/5 p-8 md:p-10 border border-gray-100/80">
            {/* Brand Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 bg-[#4CAF50] rounded-xl flex items-center justify-center shadow-lg shadow-[#4CAF50]/25">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900 tracking-tight">
                  Momentum
                </span>
              </div>
            </div>

            {/* Welcome Text */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-gray-900 mb-1.5">
                Welcome back
              </h1>
              <p className="text-gray-500 text-sm">
                Sign in to continue your journey.
              </p>
            </div>

            {/* Role Selector */}
            <div className="mb-6">
              <RoleSelector selectedRole={role} onRoleChange={handleRoleChange} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200/80 rounded-xl flex items-center gap-2.5 text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {role === 'student' ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      USN
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={usn}
                        onChange={(e) => setUsn(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-[#4CAF50] outline-none transition-all duration-200"
                        placeholder="1XX21XX000"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      College Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-[#4CAF50] outline-none transition-all duration-200"
                        placeholder="you@college.edu"
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Mentor Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={mentorName}
                        onChange={(e) => setMentorName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-[#4CAF50] outline-none transition-all duration-200"
                        placeholder="Dr. Smith"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Mentee USN
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={menteeUsn}
                        onChange={(e) => setMenteeUsn(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-[#4CAF50] outline-none transition-all duration-200"
                        placeholder="1XX21XX000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-[#4CAF50] outline-none transition-all duration-200"
                        placeholder="you@college.edu"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-[#4CAF50] hover:text-[#43A047] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-[#4CAF50] outline-none transition-all duration-200"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#4CAF50] hover:bg-[#43A047] disabled:bg-[#81C784] text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-5 shadow-lg shadow-[#4CAF50]/25 hover:shadow-xl hover:shadow-[#4CAF50]/30 cursor-pointer disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                New here?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-[#4CAF50] hover:text-[#43A047] transition-colors"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section — Illustration (55%) */}
      <div className="w-[55%] min-w-0 hidden lg:block">
        <IllustrationPanel />
      </div>
    </div>
  )
}
