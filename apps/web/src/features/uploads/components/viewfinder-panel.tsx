import { Button } from '@/components/ui/button'

interface ViewfinderPanelProps {
  title?: string
  body: string
  action?: { label: string; onClick: () => void }
}

/** A state card drawn inside the viewfinder frame. */
export function ViewfinderPanel({ title, body, action }: ViewfinderPanelProps) {
  return (
    <div className="absolute inset-0 grid [place-items:safe_center] overflow-y-auto bg-surface/90 p-4 text-center @max-[15rem]:p-3">
      <div className="flex flex-col items-center gap-2 @max-[15rem]:gap-1.5">
        {title ? (
          <h2 className="m-0 font-display text-[15px] font-semibold @max-[15rem]:text-[14px]">
            {title}
          </h2>
        ) : null}
        {body ? (
          <p className="m-0 max-w-[30ch] whitespace-pre-line text-[13px] text-muted @max-[15rem]:text-[12px] @max-[15rem]:leading-snug">
            {body}
          </p>
        ) : null}
        {action ? (
          <Button
            variant="ghost"
            className="mt-1 @max-[15rem]:h-10 @max-[15rem]:px-4 @max-[15rem]:text-[15px]"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
