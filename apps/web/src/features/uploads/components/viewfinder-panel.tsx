import { Button } from '@/components/ui/button'

interface ViewfinderPanelProps {
  title?: string
  body: string
  action?: { label: string; onClick: () => void }
}

/** A state card drawn inside the viewfinder frame. */
export function ViewfinderPanel({ title, body, action }: ViewfinderPanelProps) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-surface/90 p-4 text-center">
      <div className="flex flex-col items-center gap-2">
        {title ? <h2 className="m-0 font-display text-[15px] font-semibold">{title}</h2> : null}
        {body ? (
          <p className="m-0 max-w-[30ch] whitespace-pre-line text-[13px] text-muted">{body}</p>
        ) : null}
        {action ? (
          <Button variant="ghost" className="mt-1" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
