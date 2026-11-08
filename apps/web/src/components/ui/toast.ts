const TOAST_MS = 2600
const REGION_ID = 'app-toast-region'
const TOAST_ID = 'app-toast'

let hideTimer = 0

function liveRegion(): HTMLElement {
  const existing = document.getElementById(REGION_ID)
  if (existing) return existing
  const region = document.createElement('div')
  region.id = REGION_ID
  region.setAttribute('role', 'status')
  region.setAttribute('aria-live', 'polite')
  region.className =
    'pointer-events-none fixed inset-x-4 bottom-[calc(var(--spacing-nav)+12px)] z-50 flex justify-center'
  document.body.append(region)
  return region
}

/** Shows a short status message at the bottom of the screen; it outlives route changes. */
export function showToast(message: string): void {
  const isNew = document.getElementById(REGION_ID) === null
  const region = liveRegion()
  if (isNew) {
    requestAnimationFrame(() => showToast(message))
    return
  }
  window.clearTimeout(hideTimer)
  region.replaceChildren()
  const toast = document.createElement('div')
  toast.id = TOAST_ID
  toast.className =
    'w-fit max-w-[440px] rounded-control bg-ink px-4 py-3 font-display text-sm font-semibold text-bg shadow-hairline'
  toast.textContent = message
  region.append(toast)
  hideTimer = window.setTimeout(() => region.replaceChildren(), TOAST_MS)
}
