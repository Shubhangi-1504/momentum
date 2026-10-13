import { X, Check } from 'lucide-react'
import { JOURNAL_BACKGROUNDS, JOURNAL_PAPERS } from './journalThemes'

// ============================================
// JournalCustomizeModal — "Customize" from the notebook.
// Picks the landing-notebook background + editor paper style.
// Persists via JournalPage (keep onApply({ background, paperStyle })).
// ============================================

export default function JournalCustomizeModal({ open, background, paperStyle, onApply, onClose }) {
  if (!open) return null

  return (
    <div
      className="nj-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Customize journal"
    >
      <div className="nj-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="nj-modal-head">
          <h3 className="nj-modal-title">
            Customize <span className="nj-modal-hl">Journal</span>
          </h3>
          <button type="button" className="nj-modal-close" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>

        {/* Backgrounds */}
        <div className="nj-modal-section">
          <p className="nj-modal-label">Background</p>
          <div className="nj-swatch-grid">
            {Object.entries(JOURNAL_BACKGROUNDS).map(([key, bg]) => (
              <button
                key={key}
                type="button"
                className={`nj-swatch ${background === key ? 'nj-swatch--sel' : ''}`}
                onClick={() => onApply({ background: key })}
              >
                <span className="nj-swatch-tile" style={{ background: bg.chrome }}>
                  <span className="nj-swatch-sheet" style={{ background: bg.paper }} />
                </span>
                <span className="nj-swatch-name">{bg.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Paper styles */}
        <div className="nj-modal-section">
          <p className="nj-modal-label">Paper</p>
          <div className="nj-paper-grid">
            {Object.entries(JOURNAL_PAPERS).map(([key, paper]) => (
              <button
                key={key}
                type="button"
                className={`nj-swatch ${paperStyle === key ? 'nj-swatch--sel' : ''}`}
                onClick={() => onApply({ paperStyle: key })}
              >
                <span
                  className="nj-swatch-tile"
                  style={{ aspectRatio: '1 / 1', background: paper.swatch || '#fdfcf8' }}
                >
                  <PaperPreview styleKey={key} />
                </span>
                <span className="nj-swatch-name">{paper.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="nj-modal-foot">
          <button type="button" className="nj-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="nj-btn nj-modal-apply nj-btn--yellow" onClick={() => onApply({ background, paperStyle })}>
            <Check />
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

function PaperPreview({ styleKey }) {
  if (styleKey === 'lined') {
    return (
      <span
        className="nj-swatch-paper"
        style={{
          backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 7px, rgba(17,17,17,.3) 7px 9px)',
          backgroundSize: '100% 9px',
        }}
      />
    )
  }
  if (styleKey === 'dotted') {
    return (
      <span
        className="nj-swatch-paper"
        style={{
          backgroundImage: 'radial-gradient(rgba(17,17,17,.4) 1px, transparent 1.1px)',
          backgroundSize: '8px 8px',
        }}
      />
    )
  }
  if (styleKey === 'textured') {
    return (
      <span
        className="nj-swatch-paper"
        style={{
          backgroundColor: '#f9f4e8',
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3CfeColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.48 0 0 0 0 0.38 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='40' height='40' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    )
  }
  return <span className="nj-swatch-paper" />
}
