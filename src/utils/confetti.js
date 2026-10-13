// Tiny zero-dependency confetti burst (Web Animations API).
// Respects prefers-reduced-motion; removes its own elements when done.
const COLORS = ['#ffd93d', '#ff6b6b', '#4d96ff', '#6bcb77', '#ffffff']

export function fireConfetti(x, y) {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  for (let i = 0; i < 26; i++) {
    const el = document.createElement('i')
    el.style.position = 'fixed'
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    el.style.width = '9px'
    el.style.height = '9px'
    el.style.border = '2px solid #111'
    el.style.zIndex = '9999'
    el.style.pointerEvents = 'none'
    if (i % 3 === 0) el.style.borderRadius = '50%'
    el.style.background = COLORS[i % COLORS.length]
    document.body.appendChild(el)

    const angle = Math.random() * Math.PI * 2
    const dist = 60 + Math.random() * 100
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist + 70
    const rot = Math.random() * 540

    const anim = el.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      {
        duration: 900 + Math.random() * 500,
        easing: 'cubic-bezier(.2, .8, .4, 1)',
        fill: 'forwards',
      }
    )
    anim.onfinish = () => el.remove()
  }
}
