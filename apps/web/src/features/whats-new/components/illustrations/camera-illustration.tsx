import { IllFrame, IllIcon } from './illustration-kit'
import '@/styles/news-ill-camera.css'

const CAPTIONS = [
  'Pince pour zoomer',
  'Touche pour la mise au point',
  'Retourne la caméra',
  'Flash écran pour les selfies',
] as const

/** The "+" screen opens a viewfinder: pinch zoom, tap focus, camera flip, shutter flash. */
export function CameraIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="cam" isLive={isLive}>
      <div className="vf">
        <div className="vf-in">
          <div className="vf-scene s1">
            <div className="ni-art h0" />
          </div>
          <div className="vf-scene s2" />
        </div>
        <i className="cn tl" />
        <i className="cn tr" />
        <i className="cn bl" />
        <i className="cn br" />
        <div className="vf-focus" />
        <i className="fg f1" />
        <i className="fg f2" />
        <div className="vf-cap">
          {CAPTIONS.map((caption) => (
            <span key={caption}>{caption}</span>
          ))}
        </div>
        <div className="vf-zoom">
          <span>1×</span>
          <span className="z2">2×</span>
        </div>
        <div className="vf-flash" />
      </div>
      <div className="cam-ctl">
        <i className="gal">
          <span className="ni-art h2" />
        </i>
        <i className="shut" />
        <i className="flipb">
          <IllIcon name="flip" />
        </i>
      </div>
    </IllFrame>
  )
}
