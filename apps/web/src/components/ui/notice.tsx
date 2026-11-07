import type { ReactNode } from 'react'

interface NoticeProps {
  tone: 'info' | 'error'
  children: ReactNode
}

const TONES = {
  info: 'bg-tier-rare/12 text-[#93C5FD]',
  error: 'bg-danger/12 text-danger',
} as const

export function Notice({ tone, children }: NoticeProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-input px-3 py-2.5 font-display text-[13px] font-semibold ${TONES[tone]}`}
    >
      {children}
    </div>
  )
}
