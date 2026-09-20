import { X, Check } from 'lucide-react'
import { JOURNAL_BACKGROUNDS, JOURNAL_PAPERS, LEAF_TEXTURE } from './journalThemes'

// ============================================
// JournalCustomizeModal — "Customize" from the notebook.
// Picks the landing-notebook background + editor paper style.
// Persists via JournalPage (per-entry override or journal default).
// ============================================

export default function JournalCustomizeModal({ open, background, paperStyle, onApply, onClose }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#fdfbf4] rounded-2xl shadow-2xl border border-[#e4dcc6] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eee9da]">
          <div>
            <h3 className="font-serif text-lg text-[#3d4232]">Customize your journal</h3>
            <p className="text-xs text-gray-500 mt-0.5">Backgrounds and paper stay light and cozy.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-[#f4f0e2] hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Backgrounds */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8b8271] mb-2">Background</p>
          <div className="grid grid-cols-3 gap-2.5">
            {Object.entries(JOURNAL_BACKGROUNDS).map(([key, bg]) => (
              <button
                key={key}
                onClick={() => onApply({ background: key })}
                className={`relative rounded-xl overflow-hidden border-2 transition-all
                  ${background === key ? 'border-[#3f6b46] ring-2 ring-[#a8b48c]/50' : 'border-transparent hover:border-[#c9d4b4]'}`}
                style={{ background: bg.swatch, height: 64 }}
              >
                {key === 'botanical' && (
                  <span
                    className="absolute inset-0"
                    style={{ backgroundImage: LEAF_TEXTURE, backgroundSize: 130 }}
                  />
                )}
                <span className="absolute inset-x-0 bottom-0 text-[10px] py-0.5 bg-white/70 text-[#5f5a48]">
                  {bg.label}
                </span>
                {background === key && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#3f6b46] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Paper styles */}
        <div className="px-5 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8b8271] mb-2">Paper Style</p>
          <div className="grid grid-cols-4 gap-2.5">
            {Object.entries(JOURNAL_PAPERS).map(([key, paper]) => (
              <button
                key={key}
                onClick={() => onApply({ paperStyle: key })}
                className={`relative rounded-xl overflow-hidden border-2 transition-all
                  ${paperStyle === key ? 'border-[#3f6b46] ring-2 ring-[#a8b48c]/50' : 'border-transparent hover:border-[#c9d4b4]'}`}
                style={{ height: 64 }}
              >
                <PaperPreview styleKey={key} />
                <span className="absolute inset-x-0 bottom-0 text-[10px] py-0.5 bg-white/75 text-[#5f5a48]">
                  {paper.label}
                </span>
                {paperStyle === key && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#3f6b46] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#eee9da] bg-[#fbf8f0]/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-[#3f6b46] text-white font-medium hover:bg-[#355c3c] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function PaperPreview({ styleKey }) {
  const base = { height: '100%', backgroundColor: '#fbf8f0' }
  if (styleKey === 'lined') {
    return (
      <span
        className="block"
        style={{
          ...base,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 7px, rgba(150,160,120,0.4) 7px 8px)",
        }}
      />
    )
  }
  if (styleKey === 'dotted') {
    return (
      <span
        className="block"
        style={{
          ...base,
          backgroundImage: 'radial-gradient(rgba(150,160,120,0.5) 1px, transparent 1px)',
          backgroundSize: '7px 7px',
        }}
      />
    )
  }
  if (styleKey === 'textured') {
    return (
      <span
        className="block"
        style={{
          ...base,
          backgroundColor: '#f9f4e8',
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3CfeColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.48 0 0 0 0 0.38 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    )
  }
  return <span className="block" style={base} />
}
