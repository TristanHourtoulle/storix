import { encodeScaledJpeg } from '../decode-image'

export const SHOT_THUMB_EDGE_PX = 176

/** Returns an object URL of a small JPEG preview of the shot; the caller revokes it. */
export async function createShotThumbnail(file: Blob): Promise<string> {
  const { blob } = await encodeScaledJpeg(file, SHOT_THUMB_EDGE_PX)
  return URL.createObjectURL(blob)
}
