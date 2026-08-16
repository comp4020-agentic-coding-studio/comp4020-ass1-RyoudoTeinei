export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 extends Vec2 {
  z: number;
}

export interface Camera {
  centerAu: Vec2;
  pxPerAu: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const MIN_PX_PER_AU = 0.000_25;
export const MAX_PX_PER_AU = 50_000;

export function clampScale(pxPerAu: number): number {
  return Math.min(MAX_PX_PER_AU, Math.max(MIN_PX_PER_AU, pxPerAu));
}

export function worldToScreen(
  point: Vec2,
  camera: Camera,
  viewport: Viewport,
): Vec2 {
  return {
    x: viewport.width / 2 + (point.x - camera.centerAu.x) * camera.pxPerAu,
    y: viewport.height / 2 - (point.y - camera.centerAu.y) * camera.pxPerAu,
  };
}

export function screenToWorld(
  point: Vec2,
  camera: Camera,
  viewport: Viewport,
): Vec2 {
  return {
    x: camera.centerAu.x + (point.x - viewport.width / 2) / camera.pxPerAu,
    y: camera.centerAu.y - (point.y - viewport.height / 2) / camera.pxPerAu,
  };
}

export function panByPixels(camera: Camera, delta: Vec2): Camera {
  return {
    ...camera,
    centerAu: {
      x: camera.centerAu.x - delta.x / camera.pxPerAu,
      y: camera.centerAu.y + delta.y / camera.pxPerAu,
    },
  };
}

export function zoomAt(
  camera: Camera,
  anchor: Vec2,
  factor: number,
  viewport: Viewport,
): Camera {
  const anchorWorld = screenToWorld(anchor, camera, viewport);
  const pxPerAu = clampScale(camera.pxPerAu * factor);
  return {
    pxPerAu,
    centerAu: {
      x: anchorWorld.x - (anchor.x - viewport.width / 2) / pxPerAu,
      y: anchorWorld.y + (anchor.y - viewport.height / 2) / pxPerAu,
    },
  };
}

export function boundsOf(points: Vec2[]): Bounds {
  if (points.length === 0) {
    return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
  }
  return points.reduce<Bounds>(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

export function fitBounds(
  bounds: Bounds,
  viewport: Viewport,
  padding = 72,
): Camera {
  const usableWidth = Math.max(1, viewport.width - padding * 2);
  const usableHeight = Math.max(1, viewport.height - padding * 2);
  const worldWidth = Math.max(bounds.maxX - bounds.minX, Number.EPSILON);
  const worldHeight = Math.max(bounds.maxY - bounds.minY, Number.EPSILON);
  return {
    centerAu: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    },
    pxPerAu: clampScale(Math.min(usableWidth / worldWidth, usableHeight / worldHeight)),
  };
}

/**
 * Preserve true three-dimensional radial distance while using ecliptic longitude
 * for the map direction. Ecliptic latitude remains available as metadata.
 */
export function radialEclipticProjection(point: Vec3): Vec2 {
  const longitude = Math.atan2(point.y, point.x);
  const radius = Math.hypot(point.x, point.y, point.z);
  return {
    x: Math.cos(longitude) * radius,
    y: Math.sin(longitude) * radius,
  };
}

export function eclipticLatitudeDegrees(point: Vec3): number {
  return (Math.atan2(point.z, Math.hypot(point.x, point.y)) * 180) / Math.PI;
}

export function interpolatePoint(a: Vec3, b: Vec3, amount: number): Vec3 {
  const t = Math.max(0, Math.min(1, amount));
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}
