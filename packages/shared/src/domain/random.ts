export interface RandomSource {
  nextInt(maxExclusive: number): number
}

export const BOOSTER_SEED_HEX_LENGTH = 32

const SEED_PATTERN = /^[0-9a-f]{32}$/
const UINT32_RANGE = 2 ** 32
const WARM_UP_ROUNDS = 15

/** Creates a deterministic sfc32 random source from a 128-bit lowercase hex seed. */
export function createSeededRandom(seedHex: string): RandomSource {
  if (!SEED_PATTERN.test(seedHex)) throw new Error('Invalid booster seed')
  const words = [0, 1, 2, 3].map((i) => Number.parseInt(seedHex.slice(i * 8, i * 8 + 8), 16))
  let [a = 0, b = 0, c = 0, d = 0] = words
  const nextUint32 = (): number => {
    let t = (a + b) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    d = (d + 1) | 0
    t = (t + d) | 0
    c = (c + t) | 0
    return t >>> 0
  }
  for (let i = 0; i < WARM_UP_ROUNDS; i += 1) nextUint32()
  return {
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE) {
        throw new Error('Invalid random bound')
      }
      const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive)
      let value = nextUint32()
      while (value >= limit) value = nextUint32()
      return value % maxExclusive
    },
  }
}
