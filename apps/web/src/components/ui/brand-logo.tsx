interface BrandLogoProps {
  size?: 'md' | 'lg'
}

const SIZES = {
  md: { icon: 'size-10 rounded-[10px]', text: 'text-xl' },
  lg: { icon: 'size-14 rounded-[14px]', text: 'text-3xl' },
} as const

export function BrandLogo({ size = 'md' }: BrandLogoProps) {
  const { icon, text } = SIZES[size]

  return (
    <div className="flex flex-col items-center gap-3">
      <img src="/icons/icon.svg" alt="" className={`${icon} shadow-hairline`} />
      <p className={`m-0 font-display font-bold tracking-[-0.03em] text-ink ${text}`}>Storix</p>
    </div>
  )
}
