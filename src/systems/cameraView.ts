/**
 * Camera bounds + dead-zone derivation — PURE, no Phaser. Bounds cover the whole
 * map; the dead-zone is sized as a fraction of the viewport (never magic pixels),
 * so the camera stays consistent across map sizes and aspect ratios.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraView {
  bounds: Rect;
  deadzone: { width: number; height: number };
}

export function deriveCameraView(
  mapWidth: number,
  mapHeight: number,
  viewWidth: number,
  viewHeight: number,
  deadzoneFractionX = 0.3,
  deadzoneFractionY = 0.4,
): CameraView {
  return {
    bounds: { x: 0, y: 0, width: mapWidth, height: mapHeight },
    deadzone: {
      width: Math.round(viewWidth * deadzoneFractionX),
      height: Math.round(viewHeight * deadzoneFractionY),
    },
  };
}
