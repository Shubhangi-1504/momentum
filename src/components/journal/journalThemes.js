// ============================================
// Journal themes — backgrounds, paper styles, mood options
// Keys are persisted on journal_entries.background / paper_style
// (migration 005). All options stay LIGHT per the design brief.
// ============================================

// Landing notebook + editor chrome backgrounds.
// `chrome` = swatch + editor-area tint around the paper sheet.
export const JOURNAL_BACKGROUNDS = {
  botanical: {
    label: 'Botanical',
    swatch: 'linear-gradient(135deg, #f2ede0 0%, #e7ecd9 55%, #dfe8cf 100%)',
    chrome: 'linear-gradient(160deg, #eef0e2 0%, #e4ead3 45%, #dde6c9 100%)',
    paper: '#faf7ee',
  },
  warmPaper: {
    label: 'Warm Paper',
    swatch: 'linear-gradient(135deg, #faf6ec 0%, #f3ead8 100%)',
    chrome: 'linear-gradient(160deg, #f7f1e3 0%, #efe6d0 50%, #eaddc4 100%)',
    paper: '#fdfaf3',
  },
  lightWood: {
    label: 'Light Wood',
    swatch: 'linear-gradient(135deg, #f5e9d6 0%, #ecd9ba 100%)',
    chrome: 'linear-gradient(160deg, #f6ecda 0%, #eddcbd 45%, #e5d0ac 100%)',
    paper: '#fdf9f0',
  },
  cream: {
    label: 'Cream',
    swatch: 'linear-gradient(135deg, #fbf8f0 0%, #f1ecdd 100%)',
    chrome: 'linear-gradient(160deg, #faf7ee 0%, #f2edde 50%, #ebe4d0 100%)',
    paper: '#fefcf6',
  },
  softSage: {
    label: 'Soft Sage',
    swatch: 'linear-gradient(135deg, #eef2e6 0%, #dde5d0 100%)',
    chrome: 'linear-gradient(160deg, #f0f4e8 0%, #e2e9d3 50%, #d8e1c6 100%)',
    paper: '#fbfcf5',
  },
  minimalBeige: {
    label: 'Minimal Beige',
    swatch: 'linear-gradient(135deg, #f6f1e7 0%, #ece4d3 100%)',
    chrome: 'linear-gradient(160deg, #f7f2e9 0%, #efe7d6 50%, #e7ddc9 100%)',
    paper: '#fcf9f2',
  },
}

// Editor paper sheet styles.
export const JOURNAL_PAPERS = {
  plain: { label: 'Plain', swatch: '#fbf8f0' },
  lined: { label: 'Lined', swatch: '#fbf8f0' },
  dotted: { label: 'Dotted', swatch: '#fbf8f0' },
  textured: { label: 'Soft Textured', swatch: '#f9f4e8' },
}

// Background CSS for the paper sheet. Data-URI SVGs keep it dependency-free.
export function paperBackgroundCss(styleKey, paperColor) {
  switch (styleKey) {
    case 'lined':
      return {
        backgroundColor: paperColor,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Cline x1='0' y1='27.5' x2='28' y2='27.5' stroke='%23b9c3a8' stroke-opacity='0.35' stroke-width='1'/%3E%3C/svg%3E\")",
        backgroundSize: '28px 28px',
      }
    case 'dotted':
      return {
        backgroundColor: paperColor,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Ccircle cx='2' cy='2' r='1.1' fill='%23a8b298' fill-opacity='0.4'/%3E%3C/svg%3E\")",
        backgroundSize: '22px 22px',
      }
    case 'textured':
      return {
        backgroundColor: paperColor,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.52 0 0 0 0 0.42 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }
    case 'plain':
    default:
      return { backgroundColor: paperColor }
  }
}

// Botanical leaf accents (data-URI, no assets). Used on landing + botanical chrome.
export const LEAF_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260' viewBox='0 0 260 260'%3E%3Cg fill='none' stroke='%237c9568' stroke-opacity='0.22'%3E%3Cpath d='M20 40c18-24 44-24 58-6-16 18-44 20-58 6z'/%3E%3Cpath d='M30 44c14-12 32-14 44-8'/%3E%3Cpath d='M170 190c22-14 46-6 54 12-22 12-46 6-54-12z'/%3E%3Cpath d='M178 194c14-6 32-2 40 8'/%3E%3Cpath d='M210 60c-6-22 8-42 30-44 4 22-10 40-30 44z'/%3E%3Cpath d='M214 58c-2-14 6-28 20-34'/%3E%3Ccircle cx='80' cy='200' r='5'/%3E%3Ccircle cx='232' cy='150' r='4'/%3E%3C/g%3E%3C/svg%3E\")"

export const JOURNAL_MOODS = [
  { id: 'great', label: 'Great', emoji: '🌤️', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'good', label: 'Good', emoji: '🙂', classes: 'bg-lime-50 text-lime-700 border-lime-200' },
  { id: 'neutral', label: 'Neutral', emoji: '😐', classes: 'bg-stone-100 text-stone-600 border-stone-200' },
  { id: 'bad', label: 'Low', emoji: '🌧️', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'terrible', label: 'Rough', emoji: '⛈️', classes: 'bg-rose-50 text-rose-700 border-rose-200' },
]

export function moodMeta(id) {
  return JOURNAL_MOODS.find((m) => m.id === id) || null
}
