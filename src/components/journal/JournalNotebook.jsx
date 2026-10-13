import { Plus, List, Settings, Lock, LockOpen, Pencil } from 'lucide-react'
import { JOURNAL_BACKGROUNDS } from './journalThemes'
import JournalCompanion from './JournalCompanion'

// ============================================
// JournalNotebook — LANDING view (:cat punch card).
// A yellow spiral notebook on a flat background, a nudge bubble
// and the cat companion. Props unchanged: firstName, entryCount,
// starredCount, background, isLockedDefault, onNewEntry,
// onViewEntries, onCustomize, onToggleLock — plus NEW entryDates
// (array of journal_date strings, for the THIS WEEK circles).
// ============================================

const NUDGES = [
  'What are you looking forward to this week?',
  'What is one thing you want to finish this week?',
  'What did you learn today that surprised you?',
  'What is draining you right now, and what could help?',
  'What drained you today, and what helped?',
  'What are you proud of this week?',
  'How do you want to feel tomorrow?',
]

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function JournalNotebook({
  firstName = 'Student',
  entryCount = 0,
  starredCount = 0,
  background = 'botanical',
  isLockedDefault = true,
  entryDates = [],
  onNewEntry,
  onViewEntries,
  onCustomize,
  onToggleLock,
}) {
  const bg = JOURNAL_BACKGROUNDS[background] || JOURNAL_BACKGROUNDS.botanical
  const nudge = NUDGES[new Date().getDay()]
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'

  // last 7 local days ending today, filled when any entry falls on that day
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = dateKeyOf(d)
    return {
      key,
      initial: WEEKDAY_INITIALS[d.getDay()],
      filled: entryDates.includes(key),
      today: i === 6,
    }
  })

  return (
    <div className="nj-landing-inner" style={{ background: bg.chrome }}>
      <div className="nj-notebook">
        {/* spiral rings down the left edge */}
        {[60, 120, 180, 240, 300].map((top) => (
          <span key={top} className="nj-ring" style={{ top }} />
        ))}
        {/* ribbon bookmark */}
        <span className="nj-ribbon-outer" style={{ position: 'absolute', top: -3, right: 34, width: 26, height: 58, background: '#111111', clipPath: 'polygon(0 0,100% 0,100% 100%,50% 80%,0 100%)' }} />
        <span className="nj-ribbon-inner" style={{ position: 'absolute', top: 0, right: 37, width: 20, height: 52, background: '#ffffff', clipPath: 'polygon(0 0,100% 0,100% 100%,50% 80%,0 100%)' }} />

        {/* title plate */}
        <div className="nj-plate">
          <h1 className="nj-plate-title">My Journal</h1>
          <p className="nj-plate-sub">of {firstName}</p>
          <p className="nj-plate-stats">
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'} · {starredCount} starred
          </p>
        </div>

        {/* THIS WEEK strip */}
        <div className="nj-week" aria-label="Entries written this week">
          {week.map((d) => (
            <div key={d.key} className="nj-week-col">
              <span className={`nj-week-dot ${d.filled ? 'nj-week-dot--on' : ''} ${d.today ? 'nj-week-dot--today' : ''}`} />
              <span className={d.today ? 'nj-week-today' : 'nj-week-day'}>
                {d.today ? 'today' : d.initial}
              </span>
            </div>
          ))}
        </div>

        {/* buttons */}
        <div className="nj-nb-buttons">
          <button type="button" className="nj-nb-btn nj-nb-btn--black" onClick={() => onNewEntry?.()}>
            <Plus />
            New Entry
          </button>
          <div className="nj-nb-halfrow">
            <button type="button" className="nj-nb-btn" onClick={() => onViewEntries?.()}>
              <List />
              Entries
            </button>
            <button type="button" className="nj-nb-btn" onClick={() => onCustomize?.()}>
              <Settings />
              Customize
            </button>
          </div>
        </div>

        {/* wax seal */}
        <div className="nj-seal-row">
          <button
            type="button"
            className={`nj-seal ${!isLockedDefault ? 'nj-seal--open' : ''}`}
            onClick={() => onToggleLock?.()}
            title={isLockedDefault ? 'Sealed: private. Click to share with mentor.' : 'Open: shared with mentor. Click to seal.'}
            aria-pressed={!isLockedDefault}
          >
            {isLockedDefault ? <Lock /> : <LockOpen />}
          </button>
          <span className="nj-seal-note">
            {isLockedDefault
              ? 'Sealed. Only you can read it.'
              : 'Open. Your mentor can read shared pages.'}
          </span>
        </div>
      </div>

      {/* right column: nudge bubble + companion */}
      <div className="nj-land-cols">
        <div className="nj-bubble">
          <span className="nj-bubble-tail" />
          <p className="nj-bubble-kicker">
            {greet}, WANT TO WRITE IT DOWN?
          </p>
          <p className="nj-bubble-nudge">{nudge}</p>
          <button type="button" className="nj-bubble-btn" onClick={() => onNewEntry?.(nudge)}>
            <Pencil />
            Start with this
          </button>
        </div>
        <JournalCompanion size={124} sparkle />
      </div>

      <p className="nj-land-footer">
        Your journal is private — only pages you choose to open are visible to your mentor.
      </p>
    </div>
  )
}

function dateKeyOf(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
