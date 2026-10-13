import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

// ============================================
// JournalPhotos — taped polaroid photo strip + lightbox.
// Presentational only: uploading/adding/removing is handled by
// the parent via props (images, urls, onAdd, onRemove).
// The lightbox is self-contained: Escape closes, ArrowLeft/Right
// navigate, focus returns to the clicked photo on close.
// ============================================

const TILTS = [-2, 1.5, -1, 2, -2.5, 1]

export default function JournalPhotos({
  images = [], // [{ path, name, size, w, h }]
  urls = {}, // { [path]: signedUrl | null }
  uploading = [], // [{ key, name, }] in-flight placeholder polaroids
  onAdd, // () => void — opens the hidden file input (parent)
  onRemove, // (path) => void
  onImageError, // (path) => void — parent refetches the signed URL once
  disabled = false,
}) {
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const imgRefs = useRef({})
  const pending = images.length + uploading.length

  function openLightbox(i) {
    setLightboxIndex(i)
  }
  function closeLightbox() {
    setLightboxIndex(-1)
    // return focus to the photo that was clicked
    if (lightboxIndex >= 0) {
      const el = imgRefs.current[images[lightboxIndex]?.path]
      if (el?.focus) el.focus()
    }
  }

  // Escape / arrows while the lightbox is open
  useEffect(() => {
    if (lightboxIndex < 0) return
    function onKey(e) {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setLightboxIndex((i) => Math.min(images.length - 1, i + 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxIndex, images.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="nj-photos">
      <p className="nj-photos-label">PHOTOS · {pending}</p>
      <div className="nj-photos-row">
        {images.map((img, i) => (
          <Polaroid
            key={img.path}
            image={img}
            url={urls[img.path] || null}
            tilt={TILTS[i % TILTS.length]}
            tapeAlt={i % 2 === 1}
            onOpen={() => openLightbox(i)}
            onRemove={() => onRemove?.(img.path)}
            onError={() => onImageError?.(img.path)}
            refEl={(el) => {
              imgRefs.current[img.path] = el
            }}
          />
        ))}

        {uploading.map((up, i) => (
          <div key={up.key} className="nj-polaroid">
            <span className={`nj-tape ${i % 2 === 1 ? 'nj-tape--alt' : ''}`} />
            <div className="nj-polaroid-spinner" title={`Uploading ${up.name}…`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth={3}>
                <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        ))}

        {!disabled && pending < 6 && (
          <button type="button" className="nj-addtile" onClick={() => onAdd?.()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x={3} y={3} width={18} height={18} rx={2.5} />
              <circle cx={8.8} cy={9.2} r={1.7} />
              <path d="M21 15.5 16.2 10.7 5.2 21" />
            </svg>
            Add photo
          </button>
        )}
      </div>

      {lightboxIndex >= 0 && images[lightboxIndex] && (
        <div
          className="nj-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${lightboxIndex + 1} of ${images.length}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox()
          }}
        >
          <div className="nj-lightbox-frame">
            <img
              src={urls[images[lightboxIndex].path] || ''}
              alt={images[lightboxIndex].name || 'Journal photo'}
            />
            {images.length > 1 && (
              <button
                type="button"
                className="nj-lightbox-btn nj-lightbox-prev"
                aria-label="Previous photo"
                onClick={() => setLightboxIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft />
              </button>
            )}
            {images.length > 1 && (
              <button
                type="button"
                className="nj-lightbox-btn nj-lightbox-next"
                aria-label="Next photo"
                onClick={() => setLightboxIndex((i) => Math.min(images.length - 1, i + 1))}
              >
                <ChevronRight />
              </button>
            )}
            <button
              type="button"
              className="nj-lightbox-btn nj-lightbox-close"
              aria-label="Close photo view"
              onClick={closeLightbox}
            >
              <X />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- one polaroid ----------
function Polaroid({ image, url, tilt, tapeAlt, onOpen, onRemove, onError, refEl }) {
  const [develop, setDevelop] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setDevelop(true), 0)
    const t2 = window.setTimeout(() => setDevelop(false), 1500)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [])

  return (
    <div className={`nj-polaroid ${develop ? 'nj-polaroid--new' : ''}`} style={{ '--tilt': `${tilt}deg` }}>
      <span className={`nj-tape ${tapeAlt ? 'nj-tape--alt' : ''}`} />
      {url ? (
        <img
          ref={refEl}
          className="nj-polaroid-img"
          src={url}
          alt={image.name || 'Journal photo'}
          onClick={onOpen}
          onError={onError}
          tabIndex={0}
          role="button"
          aria-label={`Open photo ${image.name || ''}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpen()
            }
          }}
        />
      ) : (
        <div className="nj-polaroid-spinner" title="Loading photo…">
          <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth={3}>
            <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
          </svg>
        </div>
      )}
      <button
        type="button"
        className="nj-polaroid-remove"
        aria-label="Remove photo"
        title="Remove photo"
        onClick={onRemove}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
          <path d="M5 5 19 19M19 5 5 19" />
        </svg>
      </button>
    </div>
  )
}
