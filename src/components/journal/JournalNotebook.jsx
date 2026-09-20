import { Leaf, Plus, List, Settings, Lock, Unlock } from 'lucide-react'
import { JOURNAL_BACKGROUNDS, LEAF_TEXTURE } from './journalThemes'

// ============================================
// JournalNotebook — LANDING view (Reference 2).
// A physical-looking notebook on a desk. Shown when Journal is first
// opened; the editor is a separate state (see JournalEditor).
// ============================================

export default function JournalNotebook({
  firstName = 'Student',
  entryCount = 0,
  starredCount = 0,
  background = 'botanical',
  isLockedDefault = true,
  onNewEntry,
  onViewEntries,
  onCustomize,
  onToggleLock,
}) {
  const bg = JOURNAL_BACKGROUNDS[background] || JOURNAL_BACKGROUNDS.botanical

  return (
    <div
      className="relative min-h-[calc(100vh-3rem)] flex items-center justify-center p-4 sm:p-8 overflow-hidden"
      style={{
        background: bg.chrome,
        backgroundImage: `${LEAF_TEXTURE}`,
      }}
    >
      {/* Desk surface — soft vignette for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.5) 0%, rgba(120,110,80,0.14) 78%, rgba(90,82,58,0.22) 100%)',
        }}
      />

      {/* The notebook */}
      <div
        className="relative w-full max-w-md sm:max-w-lg rounded-2xl overflow-hidden
                   shadow-[0_24px_60px_-18px_rgba(76,68,45,0.45),0_8px_20px_-8px_rgba(76,68,45,0.3)]"
      >
        {/* Spine (left edge of the physical notebook) */}
        <div className="absolute inset-y-0 left-0 w-6 sm:w-8 bg-gradient-to-r from-[#4a4238] via-[#5b5245] to-[#6d6353] z-10">
          <div className="absolute inset-y-0 right-0 w-px bg-black/30" />
          {/* stitching */}
          <div className="absolute inset-y-3 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-[#c9b98f]/50" />
        </div>

        {/* Cover — soft paper-like cover with botanical hints */}
        <div
          className="relative pl-6 sm:pl-8 pr-6 py-8 sm:py-10"
          style={{
            background: `linear-gradient(150deg, #e9edda 0%, #dfe6cc 45%, #d3dcbc 100%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{ backgroundImage: LEAF_TEXTURE }}
          />
          {/* subtle paper grain */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.44 0 0 0 0 0.34 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          {/* Elastic band closure */}
          <div className="absolute top-0 bottom-0 right-5 w-[5px] bg-[#8a9b74]/70 rounded-full shadow-inner" />

          <div className="relative">
            {/* Leaf emblem */}
            <div className="w-11 h-11 mx-auto mb-5 rounded-full bg-white/70 border border-[#a8b48c]/60 flex items-center justify-center shadow-sm">
              <Leaf className="w-5.5 h-5.5 text-[#5f7a4f]" strokeWidth={1.75} />
            </div>

            {/* Title card */}
            <div className="bg-[#fdfbf4] rounded-xl shadow-[0_10px_28px_-10px_rgba(70,62,40,0.35)] border border-[#e4dcc6] px-6 py-6 text-center">
              <h1 className="font-serif text-2xl sm:text-3xl text-[#3d4232] tracking-tight">
                {firstName}&apos;s Journal
              </h1>
              <p className="mt-1.5 text-sm text-[#7d7561] italic">
                A space to reflect, reset, and grow.
              </p>

              {/* Entry stats */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[#8b8271]">
                <span>
                  <span className="font-semibold text-[#5f7a4f]">{entryCount}</span>{' '}
                  {entryCount === 1 ? 'entry' : 'entries'}
                </span>
                <span className="w-1 h-1 rounded-full bg-[#c9c2ad]" />
                <span>
                  <span className="font-semibold text-[#5f7a4f]">{starredCount}</span> starred
                </span>
              </div>

              {/* Actions */}
              <div className="mt-5 border-t border-[#e7e0cc] pt-5">
                <button
                  onClick={onNewEntry}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                             bg-[#3f6b46] hover:bg-[#355c3c] text-white font-medium
                             shadow-[0_6px_16px_-6px_rgba(63,107,70,0.6)]
                             transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3f6b46]/40"
                >
                  <Plus className="w-5 h-5" />
                  New Entry
                </button>

                <div className="mt-3 grid grid-cols-3 divide-x divide-[#e7e0cc]">
                  <NotebookAction icon={List} label="Entries" onClick={onViewEntries} />
                  <NotebookAction icon={Settings} label="Customize" onClick={onCustomize} />
                  <NotebookAction
                    icon={isLockedDefault ? Lock : Unlock}
                    label={isLockedDefault ? 'Private' : 'Shared'}
                    onClick={onToggleLock}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-[#6b6350]/80">
        Your journal is private — only entries you choose to share are visible to your mentor.
      </p>
    </div>
  )
}

function NotebookAction({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-2.5 text-[#6f6754] hover:text-[#3f6b46]
                 hover:bg-[#f4f0e2] transition-colors focus:outline-none"
    >
      <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  )
}
