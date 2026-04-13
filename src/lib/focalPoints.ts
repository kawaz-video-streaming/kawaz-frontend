import type { Coordinates } from '../types/api'

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export interface CropArea {
  left: number
  top: number
  width: number
  height: number
}

export const getFocalCropArea = (
  size: { w: number; h: number },
  focalPoint: Coordinates,
  aspectRatio = 16 / 9,
): CropArea => {
  if (!Number.isFinite(size.w) || !Number.isFinite(size.h) || size.w <= 0 || size.h <= 0) {
    return { left: 0, top: 0, width: 1, height: 1 }
  }

  const x = clamp(focalPoint.x)
  const y = clamp(focalPoint.y)
  const imageAspectRatio = size.w / size.h

  if (imageAspectRatio > aspectRatio) {
    const width = aspectRatio / imageAspectRatio
    return {
      left: clamp(x - width / 2, 0, 1 - width),
      top: 0,
      width,
      height: 1,
    }
  }

  if (imageAspectRatio < aspectRatio) {
    const height = imageAspectRatio / aspectRatio
    return {
      left: 0,
      top: clamp(y - height / 2, 0, 1 - height),
      width: 1,
      height,
    }
  }

  return { left: 0, top: 0, width: 1, height: 1 }
}

export const getObjectPositionFromFocalPoint = (
  size: { w: number; h: number },
  focalPoint: Coordinates,
  aspectRatio = 16 / 9,
) => {
  const crop = getFocalCropArea(size, focalPoint, aspectRatio)
  const x = crop.width >= 1 ? clamp(focalPoint.x) * 100 : (crop.left / (1 - crop.width)) * 100
  const y = crop.height >= 1 ? clamp(focalPoint.y) * 100 : (crop.top / (1 - crop.height)) * 100

  return `${x}% ${y}%`
}
