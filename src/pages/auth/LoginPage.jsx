import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Mail, Lock, User, Hash, AlertCircle, ArrowRight, Zap } from 'lucide-react'
import RoleSelector from '../../components/auth/RoleSelector'
import IllustrationPanel from '../../components/auth/IllustrationPanel'
import '../../styles/login.css'

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
    <div className="login-neo">
      <div className="ln-card">
        {/* Decorative sticker (not real data) */}
        <div className="ln-sticker" aria-hidden="true">12 day streak!</div>

        {/* Left panel — login form */}
        <div className="ln-left">
          {/* Logo row */}
          <div className="ln-logo-row">
            <div className="ln-logo-badge">
              <Zap className="ln-logo-icon" />
            </div>
            <span className="ln-logo-name">MOMENTUM</span>
          </div>

          {/* Heading */}
          <div className="ln-heading">
            <h1 className="ln-title">
              Welcome <span className="ln-highlight">back!</span>
            </h1>
            <p className="ln-subtitle">Sign in to continue your journey.</p>
          </div>

          {/* Role switch */}
          <div className="ln-role-wrap">
            <RoleSelector selectedRole={role} onRoleChange={handleRoleChange} />
          </div>

          {/* Error message */}
          {error && (
            <div className="ln-error" role="alert">
              <AlertCircle className="ln-error-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="ln-form">
            {role === 'student' ? (
              <>
                <div className="ln-field">
                  <label className="ln-label" htmlFor="login-usn">USN</label>
                  <div className="ln-input-wrap">
                    <Hash className="ln-input-icon" />
                    <input
                      id="login-usn"
                      type="text"
                      value={usn}
                      onChange={(e) => setUsn(e.target.value)}
                      className="ln-input"
                      placeholder="1XX21XX000"
                      required
                    />
                  </div>
                </div>

                <div className="ln-field">
                  <label className="ln-label" htmlFor="login-email">College Email</label>
                  <div className="ln-input-wrap">
                    <Mail className="ln-input-icon" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="ln-input"
                      placeholder="you@college.edu"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="ln-field">
                  <label className="ln-label" htmlFor="login-mentor-name">Mentor Name</label>
                  <div className="ln-input-wrap">
                    <User className="ln-input-icon" />
                    <input
                      id="login-mentor-name"
                      type="text"
                      value={mentorName}
                      onChange={(e) => setMentorName(e.target.value)}
                      className="ln-input"
                      placeholder="Dr. Smith"
                      required
                    />
                  </div>
                </div>

                <div className="ln-field">
                  <label className="ln-label" htmlFor="login-mentee-usn">Mentee USN</label>
                  <div className="ln-input-wrap">
                    <Hash className="ln-input-icon" />
                    <input
                      id="login-mentee-usn"
                      type="text"
                      value={menteeUsn}
                      onChange={(e) => setMenteeUsn(e.target.value)}
                      className="ln-input"
                      placeholder="1XX21XX000"
                    />
                  </div>
                </div>

                <div className="ln-field">
                  <label className="ln-label" htmlFor="login-email">Email</label>
                  <div className="ln-input-wrap">
                    <Mail className="ln-input-icon" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="ln-input"
                      placeholder="you@college.edu"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Password */}
            <div className="ln-field">
              <div className="ln-password-row">
                <label className="ln-label" htmlFor="login-password">Password</label>
                <Link to="/forgot-password" className="ln-forgot">
                  Forgot password?
                </Link>
              </div>
              <div className="ln-input-wrap">
                <Lock className="ln-input-icon" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ln-input"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="ln-submit">
              {loading ? (
                <span className="ln-loading">
                  <svg className="ln-spinner" viewBox="0 0 24 24">
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
                  <ArrowRight className="ln-arrow" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="ln-footer">
            <p className="ln-footer-text">
              New here?{' '}
              <Link to="/signup" className="ln-footer-link">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Right panel — illustration */}
        <div className="ln-right">
          <IllustrationPanel />
        </div>
      </div>
    </div>
  )
}
