import { Sprout } from 'lucide-react'

// ============================================
// MotivationCard — quiet encouragement, mint + sprout, no animation.
// ============================================

export default function MotivationCard() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#EAF7ED] to-[#F4FBF6] border border-line rounded-3xl shadow-sm p-6">
      <Sprout
        className="absolute -right-3 -bottom-4 w-24 h-24 text-[#A5D6A7] opacity-30"
        strokeWidth={1.2}
        aria-hidden="true"
      />
      <div className="relative">
        <p className="text-[#2E7D32] text-xs font-bold tracking-[0.18em] mb-2">DAILY REMINDER</p>
        <p className="text-gray-800 font-semibold leading-relaxed">
          “Progress isn't always big. Sometimes it's just showing up.”
        </p>
        <p className="text-gray-500 text-sm mt-2">Keep going, you're doing great.</p>
      </div>
    </section>
  )
}
