interface CameraFrameProps {
  headline: string
  body: string
}

const CORNERS = [
  'left-0 top-0 rounded-tl-[14px] border-b-0 border-r-0',
  'right-0 top-0 rounded-tr-[14px] border-b-0 border-l-0',
  'bottom-0 left-0 rounded-bl-[14px] border-r-0 border-t-0',
  'bottom-0 right-0 rounded-br-[14px] border-l-0 border-t-0',
] as const

/** The 63 × 88 viewfinder of the camera start screen, with its headline and body line. */
export function CameraFrame({ headline, body }: CameraFrameProps) {
  return (
    <div className="flex flex-col items-center gap-3 bg-[radial-gradient(circle_at_50%_42%,rgb(34_211_238/0.12),transparent_55%)] px-4 py-2 text-center">
      <span
        aria-hidden="true"
        className="relative grid aspect-[63/88] w-[170px] place-items-center rounded-card-lg text-xs text-faint"
      >
        {CORNERS.map((corner) => (
          <i key={corner} className={`absolute size-[26px] border-[2.5px] border-cyan ${corner}`} />
        ))}
        <span>63 × 88</span>
      </span>
      <h2 className="font-display text-[17px] font-semibold">{headline}</h2>
      <p className="m-0 max-w-[28ch] text-[13px] text-muted">{body}</p>
    </div>
  )
}
