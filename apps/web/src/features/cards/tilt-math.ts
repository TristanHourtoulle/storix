export const MAX_TILT_DEG = 12
const MAX_ORIENTATION_DEG = 30
const REST_FRONT_BACK_DEG = 45

export interface TiltSample {
  rx: number
  ry: number
  mx: number
  my: number
  glare: number
}

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value))
}

/** Maps a pointer position, as a fraction of the card box, to a tilt sample. */
export function sampleFromFraction(x: number, y: number): TiltSample {
  const fx = Math.min(1, Math.max(0, x))
  const fy = Math.min(1, Math.max(0, y))
  return {
    rx: -(fy - 0.5) * 2 * MAX_TILT_DEG,
    ry: (fx - 0.5) * 2 * MAX_TILT_DEG,
    mx: fx * 100,
    my: fy * 100,
    glare: 1,
  }
}

function toScreenAxes(
  gamma: number,
  beta: number,
  angle: number,
): { leftRight: number; frontBack: number } {
  switch (((angle % 360) + 360) % 360) {
    case 90:
      return { leftRight: beta, frontBack: -gamma }
    case 180:
      return { leftRight: -gamma, frontBack: -beta }
    case 270:
      return { leftRight: -beta, frontBack: gamma }
    default:
      return { leftRight: gamma, frontBack: beta }
  }
}

/** Maps device orientation angles to a tilt sample, compensating for the screen rotation angle. */
export function sampleFromOrientation(gamma: number, beta: number, angle: number): TiltSample {
  const { leftRight, frontBack } = toScreenAxes(gamma, beta, angle)
  const ry = (clamp(leftRight, MAX_ORIENTATION_DEG) / MAX_ORIENTATION_DEG) * MAX_TILT_DEG
  const rx =
    -(clamp(frontBack - REST_FRONT_BACK_DEG, MAX_ORIENTATION_DEG) / MAX_ORIENTATION_DEG) *
    MAX_TILT_DEG
  return {
    rx,
    ry,
    mx: 50 + (ry / MAX_TILT_DEG) * 50,
    my: 50 - (rx / MAX_TILT_DEG) * 50,
    glare: 1,
  }
}

/** Current screen rotation angle in degrees, 0 when the Screen Orientation API is missing. */
export function readScreenAngle(): number {
  return typeof screen.orientation === 'undefined' ? 0 : screen.orientation.angle
}
