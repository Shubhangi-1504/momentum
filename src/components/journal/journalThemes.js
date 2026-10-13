// ============================================
// Journal themes — backgrounds, paper styles, mood options
// Keys are persisted on journal_entries.background / paper_style
// (migration 005). Calm-neobrutalist "Lemon pop" palette:
// FLAT fills only, no gradients.
// ============================================

import { Sun, Smile, Meh, CloudRain, Zap } from 'lucide-react'

// Landing notebook + editor chrome backgrounds.
// `chrome` = swatch + editor-area tint around the paper sheet.
// `paper`  = the paper sheet colour itself (background key -> paper hex).
export const JOURNAL_BACKGROUNDS = {
  botanical: { label: 'Botanical', swatch: '#e4f1d4', chrome: '#e4f1d4', paper: '#faf7ee' },
  warmPaper: { label: 'Warm Paper', swatch: '#fbe9c3', chrome: '#fbe9c3', paper: '#fdfaf3' },
  lightWood: { label: 'Light Wood', swatch: '#f0d9b5', chrome: '#f0d9b5', paper: '#fdf9f0' },
  cream: { label: 'Cream', swatch: '#fff7dc', chrome: '#fff7dc', paper: '#fefcf6' },
  softSage: { label: 'Soft Sage', swatch: '#d9efe6', chrome: '#d9efe6', paper: '#fbfcf5' },
  minimalBeige: { label: 'Minimal Beige', swatch: '#ece3d2', chrome: '#ece3d2', paper: '#fcf9f2' },
}

// Editor paper sheet styles (flat swatch colours).
export const JOURNAL_PAPERS = {
  plain: { label: 'Plain', swatch: '#fdfcf8' },
  lined: { label: 'Lined', swatch: '#fdfcf8' },
  dotted: { label: 'Dotted', swatch: '#fdfcf8' },
  textured: { label: 'Soft Textured', swatch: '#f9f4e8' },
}

// Background CSS for the paper sheet. Lines/dots are drawn ON the
// textarea itself (see neo-journal.css) so they align with the text and
// scroll with it; this helper only paints the sheet colour.
export function paperBackgroundCss(styleKey, paperColor) {
  switch (styleKey) {
    case 'textured':
      return { backgroundColor: paperColor }
    case 'lined':
      return { backgroundColor: paperColor }
    case 'dotted':
      return { backgroundColor: paperColor }
    case 'plain':
    default:
      return { backgroundColor: paperColor }
  }
}

export const JOURNAL_MOODS = [
  { id: 'great', label: 'Great', icon: Sun, hex: '#6bcb77' },
  { id: 'good', label: 'Good', icon: Smile, hex: '#b9e86a' },
  { id: 'neutral', label: 'Neutral', icon: Meh, hex: '#e6e0cc' },
  { id: 'bad', label: 'Low', icon: CloudRain, hex: '#ffd93d' },
  { id: 'terrible', label: 'Rough', icon: Zap, hex: '#ff6b6b' },
]

export function moodMeta(id) {
  return JOURNAL_MOODS.find((m) => m.id === id) || null
}
