import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Home,
  BookOpen,
  Target,
  PenTool,
  MessageSquare,
  StickyNote,
  BarChart3,
  MessagesSquare,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react'
import '../styles/neo-student.css'

const navigation = [
  { name: 'Home', href: '/student', icon: Home },
  { name: 'Study Tracker', href: '/student/study', icon: BookOpen },
  { name: 'Habit Tracker', href: '/student/habits', icon: Target },
  { name: 'Journal', href: '/student/journal', icon: PenTool },
  { name: 'Remarks', href: '/student/remarks', icon: MessageSquare },
  { name: 'Chat', href: '/student/chat', icon: MessagesSquare },
  { name: 'Notes', href: '/student/notes', icon: StickyNote },
  { name: 'Progress', href: '/student/progress', icon: BarChart3 },
]

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initial = (profile?.full_name || 'S').trim().charAt(0).toUpperCase()

  return (
    <div className="ns-root">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="ns-backdrop fixed inset-0 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`ns-sidebar fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo row */}
          <div className="ns-side-head">
            <Link to="/student" className="ns-side-brand">
              <span className="ns-side-logo-badge">
                <Zap className="ns-side-logo-icon" />
              </span>
              <span className="ns-side-wordmark">MOMENTUM</span>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="ns-side-close lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="ns-side-close-icon" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`ns-nav-link ${isActive ? 'ns-nav-link--active' : ''}`}
                >
                  <item.icon className="ns-nav-icon" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="ns-side-foot">
            <div className="ns-user-card">
              <span className="ns-avatar">{initial}</span>
              <span className="ns-user-meta">
                <span className="ns-user-name truncate">
                  {profile?.full_name || 'Student'}
                </span>
                <span className="ns-user-email truncate">{profile?.email}</span>
              </span>
            </div>
            <button type="button" onClick={handleSignOut} className="ns-signout">
              <LogOut className="ns-nav-icon" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="ns-mobile-header sticky top-0 z-10 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="ns-burger"
              aria-label="Open sidebar"
            >
              <Menu className="ns-burger-icon" />
            </button>
            <span className="ns-mobile-wordmark">MOMENTUM</span>
            <div className="w-10" />
          </div>
        </header>

        {/* Page content — nested routes render here via Outlet */}
        <main className="p-6">
          <div className="ns-page" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
