import { Search, Bell, ChevronDown, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getGreeting } from './homeUtils'

// ============================================
// HomeHeader — "Home" + live date on the left; search, notification
// bell and user dropdown on the right. Uses the authenticated profile.
// ============================================

export default function HomeHeader() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const greeting = getGreeting()

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const initial = (profile?.full_name || 'S').trim().charAt(0).toUpperCase()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: page title + dynamic date */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Home</h1>
        <p className="text-sm text-gray-500 mt-0.5">{greeting.date}</p>
      </div>

      {/* Right: search / bell / user */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search anything..."
            className="w-56 lg:w-64 pl-9 pr-4 py-2 bg-white border border-input rounded-full text-sm text-gray-900 placeholder-placeholder focus:ring-2 focus:ring-[#4CAF50]/20 focus:border-primary outline-none transition-all duration-200"
          />
        </div>

        <button
          type="button"
          aria-label="Notifications"
          onClick={() => setMenuOpen(false)}
          className="p-2.5 bg-white border border-line rounded-full text-[#7C8798] hover:text-primary hover:border-[#4CAF50]/40 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/30"
        >
          <Bell className="w-5 h-5" />
          <span className="sr-only">No new notifications</span>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 bg-white border border-line rounded-full hover:border-[#4CAF50]/40 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/30"
          >
            <span className="w-8 h-8 rounded-full bg-[#4CAF50] text-white text-sm font-semibold flex items-center justify-center">
              {initial}
            </span>
            <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
              {profile?.full_name || 'Student'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-lg shadow-black/5 py-2 z-20"
            >
              <div className="px-4 pb-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {profile?.full_name || 'Student'}
                </p>
                <p className="text-xs text-gray-500 truncate">{profile?.email || ''}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
