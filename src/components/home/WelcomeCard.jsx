import { Sunrise, Sun, Sunset, Leaf, Flower2 } from 'lucide-react'

// ============================================
// WelcomeCard — soft mint hero with time-based greeting,
// the authenticated student's first name, and a subtle
// botanical illustration on the right.
// ============================================

function greetMeta(word) {
  if (word === 'MORNING') return { icon: Sunrise, text: 'Good Morning,' }
  if (word === 'AFTERNOON') return { icon: Sun, text: 'Good Afternoon,' }
  return { icon: Sunset, text: 'Good Evening,' }
}

export default function WelcomeCard({ greeting, firstName }) {
  const meta = greetMeta(greeting.word)
  const Icon = meta.icon

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#EAF7ED] to-[#F4FBF6] border border-line rounded-3xl shadow-sm">
      {/* soft decorative blobs — same treatment as login page */}
      <div className="absolute -top-10 -left-10 w-44 h-44 bg-[#C8E6C9] rounded-full opacity-30 blur-3xl" />
      <div className="absolute -bottom-12 -right-8 w-40 h-40 bg-[#A5D6A7] rounded-full opacity-20 blur-3xl" />

      <div className="relative flex items-center gap-6 p-7 md:p-9">
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-[#2E7D32]">
            <Icon className="w-4 h-4" />
            {meta.text}
          </p>
          <h2 className="mt-2 text-2xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Hi, {firstName}!
          </h2>
          <p className="mt-2.5 text-sm md:text-base text-gray-600">
            Ready to make today count? Stay consistent, keep learning, and be proud of your progress.
          </p>
        </div>

        {/* Illustration — small, contained, decorative */}
        <div className="hidden sm:flex relative shrink-0" aria-hidden="true">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/70 border border-[#C8E6C9] flex items-center justify-center shadow-inner">
            <Sprout />
          </div>
        </div>
      </div>
    </section>
  )
}

function Sprout() {
  return (
    <div className="relative flex items-center justify-center">
      <Leaf className="w-10 h-10 md:w-14 md:h-14 text-[#66BB6A]" strokeWidth={1.5} />
      <Flower2 className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 text-[#A5D6A7]" strokeWidth={1.5} />
    </div>
  )
}
