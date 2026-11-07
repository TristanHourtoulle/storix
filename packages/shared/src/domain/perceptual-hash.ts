export const PHASH_SIZE = 32
export const PHASH_DUPLICATE_MAX_DISTANCE = 6
export const PHASH_MIN_DETAIL = 400

const BLOCK = 8
const RELATIVE_EPSILON = 1e-9
const HASH_PATTERN = /^[0-9a-f]{16}$/

const COS_TABLE: readonly (readonly number[])[] = Array.from({ length: BLOCK }, (_, u) =>
  Array.from({ length: PHASH_SIZE }, (_, x) =>
    Math.cos(((2 * x + 1) * u * Math.PI) / (2 * PHASH_SIZE)),
  ),
)

function dctBlock(gray: Uint8Array): number[] {
  if (gray.length !== PHASH_SIZE * PHASH_SIZE) {
    throw new Error(`Expected ${PHASH_SIZE * PHASH_SIZE} grayscale bytes, got ${gray.length}`)
  }
  const rows: number[][] = []
  for (let y = 0; y < PHASH_SIZE; y++) {
    rows.push(
      Array.from({ length: BLOCK }, (_, u) => {
        let sum = 0
        for (let x = 0; x < PHASH_SIZE; x++) {
          sum += (gray[y * PHASH_SIZE + x] ?? 0) * (COS_TABLE[u]?.[x] ?? 0)
        }
        return sum
      }),
    )
  }
  const coefficients: number[] = []
  for (let v = 0; v < BLOCK; v++) {
    for (let u = 0; u < BLOCK; u++) {
      let sum = 0
      for (let y = 0; y < PHASH_SIZE; y++) {
        sum += (rows[y]?.[u] ?? 0) * (COS_TABLE[v]?.[y] ?? 0)
      }
      coefficients.push(sum)
    }
  }
  return coefficients
}

function maxAbsAc(coefficients: readonly number[]): number {
  return coefficients.slice(1).reduce((max, c) => Math.max(max, Math.abs(c)), 0)
}

/** Computes a 64-bit DCT perceptual hash of a 32x32 grayscale image as 16 hex chars. */
export function perceptualHash(gray: Uint8Array): string {
  const coefficients = dctBlock(gray)
  const sorted = coefficients.slice(1).sort((a, b) => a - b)
  const threshold = (sorted[31] ?? 0) + RELATIVE_EPSILON * maxAbsAc(coefficients)
  let bits = 0n
  for (const coefficient of coefficients) {
    bits = (bits << 1n) | (coefficient > threshold ? 1n : 0n)
  }
  return bits.toString(16).padStart(16, '0')
}

/** Tells whether an image has enough texture for its perceptual hash to be comparable. */
export function hasEnoughDetailForDedup(pixels: Uint8Array): boolean {
  return maxAbsAc(dctBlock(pixels)) >= PHASH_MIN_DETAIL
}

/** Counts differing bits between two 16-hex perceptual hashes. */
export function hammingDistance(a: string, b: string): number {
  if (!HASH_PATTERN.test(a) || !HASH_PATTERN.test(b)) {
    throw new Error('Perceptual hashes must be 16 lowercase hex characters')
  }
  let diff = BigInt(`0x${a}`) ^ BigInt(`0x${b}`)
  let count = 0
  while (diff > 0n) {
    count += Number(diff & 1n)
    diff >>= 1n
  }
  return count
}

/** Tells whether two hashes are close enough to be the same photo. */
export function isDuplicatePhoto(a: string, b: string): boolean {
  return hammingDistance(a, b) <= PHASH_DUPLICATE_MAX_DISTANCE
}

/** Returns the closest existing entry within the duplicate threshold, else null. */
export function findDuplicate<T extends { phash: string }>(
  candidate: string,
  existing: readonly T[],
): T | null {
  let best: T | null = null
  let bestDistance = PHASH_DUPLICATE_MAX_DISTANCE + 1
  for (const entry of existing) {
    const distance = hammingDistance(candidate, entry.phash)
    if (distance < bestDistance) {
      best = entry
      bestDistance = distance
    }
  }
  return best
}
