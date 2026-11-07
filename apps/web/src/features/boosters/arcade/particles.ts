type ParticleKind = 'dot' | 'spark' | 'confetti'
type Range = readonly [number, number]

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  drag: number
  age: number
  life: number
  size: number
  color: string
  kind: ParticleKind
  rot: number
  vr: number
}

export interface BurstOptions {
  n?: number
  colors?: readonly string[]
  speed?: Range
  angle?: Range
  gravity?: number
  drag?: number
  life?: Range
  size?: Range
  kind?: ParticleKind
  jx?: number
  jy?: number
}

export interface Particles {
  burst: (x: number, y: number, options?: BurstOptions) => void
  resize: () => void
  destroy: () => void
}

const TAU = Math.PI * 2

function rand([min, max]: Range): number {
  return min + Math.random() * (max - min)
}

function pick(colors: readonly string[]): string {
  return colors[Math.floor(Math.random() * colors.length)] ?? '#ffffff'
}

function maxParticles(): number {
  const cores = navigator.hardwareConcurrency || 4
  return cores <= 4 ? 180 : 320
}

function density(): number {
  return (navigator.hardwareConcurrency || 4) <= 4 ? 0.55 : 1
}

function draw(g: CanvasRenderingContext2D, p: Particle, k: number): void {
  const alpha = 1 - k
  if (p.kind === 'confetti') {
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = alpha
    g.fillStyle = p.color
    g.save()
    g.translate(p.x, p.y)
    g.rotate(p.rot)
    g.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9)
    g.restore()
    return
  }
  g.globalCompositeOperation = 'lighter'
  if (p.kind === 'spark') {
    g.globalAlpha = alpha
    g.strokeStyle = p.color
    g.lineWidth = p.size * 0.7
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(p.x, p.y)
    g.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035)
    g.stroke()
    return
  }
  g.fillStyle = p.color
  g.globalAlpha = alpha * 0.3
  g.beginPath()
  g.arc(p.x, p.y, p.size * 2.8, 0, TAU)
  g.fill()
  g.globalAlpha = alpha
  g.beginPath()
  g.arc(p.x, p.y, p.size, 0, TAU)
  g.fill()
}

/**
 * Runs a capped particle system on one canvas, outside React. The loop only runs while particles are alive.
 * Particles are mutated in place on purpose: allocating every particle on every frame would cost more.
 * The canvas is sized from its layout box, so a scaled parent does not change its resolution.
 * Returns null when the canvas has no 2D context.
 */
export function createParticles(canvas: HTMLCanvasElement): Particles | null {
  const g = canvas.getContext('2d')
  if (!g) return null
  const max = maxParticles()
  const scale = density()
  let parts: Particle[] = []
  let raf = 0
  let last = 0
  let width = 0
  let height = 0
  let dpr = 1

  function resize(): void {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    width = canvas.offsetWidth
    height = canvas.offsetHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
  }

  function tick(time: number): void {
    if (!g) return
    const dt = last ? Math.min(0.05, (time - last) / 1000) : 1 / 60
    last = time
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, width, height)
    const alive: Particle[] = []
    for (const p of parts) {
      p.age += dt
      if (p.age >= p.life) continue
      alive.push(p)
      const friction = Math.exp(-p.drag * dt)
      p.vx *= friction
      p.vy = p.vy * friction + p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      draw(g, p, p.age / p.life)
    }
    parts = alive
    if (parts.length > 0) {
      raf = requestAnimationFrame(tick)
      return
    }
    raf = 0
    g.clearRect(0, 0, width, height)
  }

  function burst(x: number, y: number, options: BurstOptions = {}): void {
    const count = Math.round((options.n ?? 30) * scale)
    const colors = options.colors ?? ['#ffffff']
    const angle = options.angle ?? [0, TAU]
    const jx = options.jx ?? 0
    const jy = options.jy ?? 0
    const fresh = Array.from({ length: Math.min(count, max - parts.length) }, (): Particle => {
      const a = rand(angle)
      const speed = rand(options.speed ?? [100, 300])
      return {
        x: x + rand([-jx, jx]),
        y: y + rand([-jy, jy]),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        gravity: options.gravity ?? 0,
        drag: options.drag ?? 1.6,
        age: 0,
        life: rand(options.life ?? [0.5, 1]),
        size: rand(options.size ?? [1.5, 3]),
        color: pick(colors),
        kind: options.kind ?? 'dot',
        rot: rand([0, TAU]),
        vr: rand([-9, 9]),
      }
    })
    if (fresh.length === 0) return
    parts = [...parts, ...fresh]
    if (!raf) {
      last = 0
      raf = requestAnimationFrame(tick)
    }
  }

  function destroy(): void {
    cancelAnimationFrame(raf)
    raf = 0
    parts = []
    g?.clearRect(0, 0, width, height)
  }

  resize()
  return { burst, resize, destroy }
}
