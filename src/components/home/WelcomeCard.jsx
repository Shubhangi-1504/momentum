import { Sunrise, Sun, Moon } from 'lucide-react'
import HeroMascot from './HeroMascot'

// ============================================
// WelcomeCard — yellow neobrutalist hero with time-based greeting,
// highlighted first name, one-line quote and the bobbing mascot.
// ============================================

function greetMeta(word) {
  if (word === 'MORNING') return { icon: Sunrise }
  if (word === 'AFTERNOON') return { icon: Sun }
  return { icon: Moon }
}

export default function WelcomeCard({ greeting, firstName }) {
  const meta = greetMeta(greeting.word)
  const Icon = meta.icon

  return (
    <>
      <section className="nh-hero">
        <div className="nh-hero-text">
          <p className="nh-greet-pill">
            <Icon className="nh-greet-icon" aria-hidden="true" />
            GOOD {greeting.word}
          </p>
          <h2 className="nh-hero-title">
            Hi, <span className="nh-name-chip">{firstName}</span>!
          </h2>
          <p className="nh-quote">
            “Progress isn't always big. Sometimes it's just showing up.”
          </p>
        </div>

        {/* Decorative mascot — hidden below 640px */}
        <div className="nh-hero-mascot" aria-hidden="true">
          <HeroMascot />
        </div>

        {/* Decorative sticker (not real data) */}
        <span className="nh-hero-sticker" aria-hidden="true">Let's go!</span>
      </section>

      {/* Date line, directly below the hero card */}
      <div className="nh-date-line">
        <span className="nh-date-dot" aria-hidden="true" />
        <span>{greeting.date}</span>
      </div>
    </>
  )
}
