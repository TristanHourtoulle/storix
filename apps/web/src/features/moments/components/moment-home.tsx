import { useMomentPrompt } from '../use-moment-prompt'
import { MomentBanner } from './moment-banner'
import { MomentFlash } from './moment-flash'

interface MomentHomeProps {
  leagueId: string
}

/** Shows the current Moment on the league home: the flash during its window, else a banner until posted. */
export function MomentHome({ leagueId }: MomentHomeProps) {
  const prompt = useMomentPrompt(leagueId)
  if (prompt === null) return null
  return (
    <>
      {prompt.isFlashShown ? (
        <MomentFlash
          leagueId={leagueId}
          firesAt={prompt.firesAt}
          remainingMs={prompt.remainingMs}
          onLater={prompt.dismiss}
        />
      ) : null}
      {prompt.isBannerShown ? (
        <MomentBanner
          leagueId={leagueId}
          isWindowOpen={prompt.isWindowOpen}
          remainingMs={prompt.remainingMs}
          lateMinutes={prompt.lateMinutesNow}
        />
      ) : null}
    </>
  )
}
