import { BookOpen, Target, PenTool, TrendingUp } from 'lucide-react'

// ============================================
// StatsCards — four live metrics computed in StudentHome from
// real Supabase data (assignments, habit_logs, journal_entries).
// ============================================

export default function StatsCards({ stats, loading, error }) {
  const cards = [
    {
      icon: BookOpen,
      value: stats ? String(stats.studySessions) : '—',
      title: 'Study Sessions',
      context: 'Due Today',
      tone: 'bg-[#E8F5E9] text-[#2E7D32]',
    },
    {
      icon: Target,
      value: stats ? stats.habitsCompleted : '—',
      title: 'Habits Completed',
      context: 'Today',
      tone: 'bg-[#F1F8E9] text-[#33691E]',
    },
    {
      icon: PenTool,
      value: stats ? String(stats.journalThisWeek) : '—',
      title: 'Journal Entries',
      context: 'This Week',
      tone: 'bg-[#FBF6EC] text-[#8D6E63]',
    },
    {
      icon: TrendingUp,
      value: stats ? `${stats.overallProgress}%` : '—',
      title: 'Overall Progress',
      context: 'Assignments & Habits',
      tone: 'bg-[#EAF4F2] text-[#33686B]',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.title}
          className="bg-white rounded-2xl border border-line shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {loading ? (
                <div className="h-9 w-14 bg-gray-100 rounded-lg animate-pulse" />
              ) : error ? (
                <p className="text-2xl font-bold text-red-400">—</p>
              ) : (
                <p className="text-3xl font-bold text-gray-900 tracking-tight">{c.value}</p>
              )}
              <p className="mt-1 text-sm font-semibold text-gray-700">{c.title}</p>
              <p className="text-xs text-gray-400">{c.context}</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${c.tone}`}>
              <c.icon className="w-5 h-5" />
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
