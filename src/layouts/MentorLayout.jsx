import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  MessageSquare,
  BookOpen,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/mentor', icon: LayoutDashboard },
  { name: 'My Students', href: '/mentor/students', icon: Users },
  { name: 'Study Tasks', href: '/mentor/tasks', icon: ClipboardList },
  { name: 'Mentor Remarks', href: '/mentor/remarks', icon: MessageSquare },
  { name: 'Shared Journals', href: '/mentor/journals', icon: BookOpen },
]

export default function MentorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-line transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-line">
            <Link to="/mentor" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shadow-[#4CAF50]/25">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">MentorPortal</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive =
                item.href === '/mentor'
                  ? location.pathname === '/mentor'
                  : location.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-soft text-primary-dark'
                      : 'text-[#4B5567] hover:bg-[#F1F8F3] hover:text-ink'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-[#7C8798]'}`} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-line">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary-soft rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name || 'Mentor'}
                </p>
                <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-gray-900">MentorPortal</span>
            <div className="w-10" />
          </div>
        </header>

        {/* Page content — nested routes render here via Outlet */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
