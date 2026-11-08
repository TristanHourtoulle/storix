const TOAST_MS = 2600
const TOAST_ID = 'app-toast'

/** Shows a short status message at the bottom of the screen; it outlives route changes. */
export function showToast(message: string): void {
  document.getElementById(TOAST_ID)?.remove()
  const toast = document.createElement('div')
  toast.id = TOAST_ID
  toast.setAttribute('role', 'status')
  toast.textContent = message
  toast.className =
    'fixed inset-x-4 bottom-[calc(var(--spacing-nav)+12px)] z-50 mx-auto w-fit max-w-[440px] rounded-control bg-ink px-4 py-3 font-display text-sm font-semibold text-bg shadow-hairline'
  document.body.append(toast)
  window.setTimeout(() => toast.remove(), TOAST_MS)
}
