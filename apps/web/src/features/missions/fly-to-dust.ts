const FLIGHT_MS = 700
const BUMP_MS = 500
const DUST_TARGET_SELECTOR = '[data-dust-target]'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function centerOf(element: Element): { x: number; y: number } {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function bump(target: Element): void {
  target.classList.add('is-bumped')
  window.setTimeout(() => target.classList.remove('is-bumped'), BUMP_MS)
}

/**
 * Flies a paillette diamond from an element to the dust counter, then makes the counter glow.
 * Resolves when the diamond lands; with reduced motion the counter only glows.
 */
export function flyToDust(from: Element): Promise<void> {
  const target = document.querySelector(DUST_TARGET_SELECTOR)
  if (target === null) return Promise.resolve()
  if (prefersReducedMotion()) {
    bump(target)
    return Promise.resolve()
  }
  const start = centerOf(from)
  const end = centerOf(target)
  const diamond = document.createElement('span')
  diamond.className = 'dust-fly'
  diamond.style.left = `${start.x}px`
  diamond.style.top = `${start.y}px`
  document.body.append(diamond)
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        diamond.style.left = `${end.x}px`
        diamond.style.top = `${end.y}px`
        diamond.style.opacity = '0.2'
      })
    })
    window.setTimeout(() => {
      diamond.remove()
      bump(target)
      resolve()
    }, FLIGHT_MS + 20)
  })
}
