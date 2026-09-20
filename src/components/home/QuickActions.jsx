import { useNavigate } from 'react-router-dom'
import { Play, Target, PenTool, BarChart3 } from 'lucide-react'

// ============================================
// QuickActions — four shortcuts that navigate to the real routes.
// ============================================

const ACTIONS = [
  { label: 'Start Studying', icon: Play, to: '/student/study', tone: 'bg-[#E8F5E9] hover:bg-[#DCEDC8] text-[#2E7D32]' },
  { label: 'Track Habit', icon: Target, to: '/student/habits', tone: 'bg-[#F1F8E9] hover:bg-[#E6EEC8] text-[#33691E]' },
  { label: 'Write in Journal', icon: PenTool, to: '/student/journal', tone: 'bg-[#FFF8E1] hover:bg-[#FFECB3] text-[#8D6E63]' },
  { label: 'View Progress', icon: BarChart3, to: '/student/progress', tone: 'bg-[#E3F2FD] hover:bg-[#BBDEFB] text-[#1565C0]' },
]

export default function QuickActions() {
  const navigate = useNavigate()

  return (
    <section className="bg-white rounded-3xl border border-line shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => navigate(a.to)}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/30 ${a.tone}`}
          >
            <a.icon className="w-5 h-5 shrink-0" />
            {a.label}
          </button>
        ))}
      </div>
    </section>
  )
}
