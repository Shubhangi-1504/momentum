// ============================================
// imageUtils — client-side image validation + resizing for
// journal photos. No dependencies.
// prepareImage(file):
//   - accepts only image/jpeg | image/png | image/webp
//   - rejects files over 10 MB
//   - downscales (offscreen canvas) so the longest side is <= 1600px
//   - fills white behind transparent PNG/WebP
//   - exports JPEG quality 0.82 as a File
// returns { file, width, height, name }
// ============================================

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_INPUT_BYTES = 10 * 1024 * 1024 // 10 MB before resize
const MAX_SIDE = 1600
const JPEG_QUALITY = 0.82

export async function prepareImage(file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Use JPG, PNG or WebP photos.')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That photo is too large.')
  }

  const dataUrl = await readAsDataURL(file)
  const img = await loadImage(dataUrl)

  let { width, height } = img
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  width = Math.max(1, Math.round(width * scale))
  height = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process that photo.')
  // white behind transparent PNG/WebP
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await canvasToJpegBlob(canvas)
  const out = createJpegFile(blob, file.name)
  return { file: out, width, height, name: file.name }
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read that photo.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that photo.'))
    img.src = src
  })
}

function canvasToJpegBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not process that photo.'))
      },
      'image/jpeg',
      JPEG_QUALITY
    )
  })
}

function createJpegFile(blob, originalName) {
  const base = (originalName || 'photo').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '_')
  const stamped = `${base}_${Date.now()}.jpg`
  try {
    return new File([blob], stamped, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    // Very old browsers without File constructor
    return blob
  }
}
