import { Icon } from '@/components/ui/icon'

const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR')

interface DustBalanceProps {
  dust: number | undefined
}

export function DustBalance({ dust }: DustBalanceProps) {
  if (dust === undefined) return <div aria-hidden="true" className="dust dust-skeleton" />
  const formatted = NUMBER_FORMAT.format(dust)
  return (
    <div className="dust" role="img" aria-label={`${dust} paillettes`}>
      <Icon name="dust" className="size-4" />
      <span aria-hidden="true">{formatted}</span>
    </div>
  )
}
