import { describe, expect, it } from "vitest";
import {
  fitBounds,
  radialEclipticProjection,
  screenToWorld,
  worldToScreen,
  zoomAt,
  type Camera,
  type Viewport,
} from "../space-map";

const viewport: Viewport = { width: 1_200, height: 700 };
const camera: Camera = { centerAu: { x: 0, y: 0 }, pxPerAu: 0.004 };

describe("true-scale space map", () => {
  it("keeps every distance on the same linear AU scale", () => {
    const sun = worldToScreen({ x: 0, y: 0 }, camera, viewport);
    const heliopause = worldToScreen({ x: 122, y: 0 }, camera, viewport);
    const outerOort = worldToScreen({ x: 100_000, y: 0 }, camera, viewport);
    const ratio = (outerOort.x - sun.x) / (heliopause.x - sun.x);
    expect(ratio).toBeCloseTo(100_000 / 122, 8);
  });

  it("round-trips between world and screen coordinates", () => {
    const world = { x: -81_234.5, y: 17_006.25 };
    const result = screenToWorld(worldToScreen(world, camera, viewport), camera, viewport);
    expect(result.x).toBeCloseTo(world.x, 8);
    expect(result.y).toBeCloseTo(world.y, 8);
  });

  it("keeps the world point beneath the pointer fixed while zooming", () => {
    const pointer = { x: 943, y: 126 };
    const before = screenToWorld(pointer, camera, viewport);
    const next = zoomAt(camera, pointer, 6, viewport);
    const after = screenToWorld(pointer, next, viewport);
    expect(after.x).toBeCloseTo(before.x, 8);
    expect(after.y).toBeCloseTo(before.y, 8);
  });

  it("fits supplied bounds without distorting their proportions", () => {
    const fitted = fitBounds(
      { minX: -100_000, maxX: 268_775, minY: -50_000, maxY: 150_000 },
      viewport,
      80,
    );
    for (const point of [
      { x: -100_000, y: -50_000 },
      { x: 268_775, y: 150_000 },
    ]) {
      const screen = worldToScreen(point, fitted, viewport);
      expect(screen.x).toBeGreaterThanOrEqual(79.9);
      expect(screen.x).toBeLessThanOrEqual(viewport.width - 79.9);
      expect(screen.y).toBeGreaterThanOrEqual(79.9);
      expect(screen.y).toBeLessThanOrEqual(viewport.height - 79.9);
    }
  });

  it("preserves three-dimensional radial distance in the 2D projection", () => {
    const input = { x: -32.108, y: -136.463, z: 98.734 };
    const projected = radialEclipticProjection(input);
    expect(Math.hypot(projected.x, projected.y)).toBeCloseTo(
      Math.hypot(input.x, input.y, input.z),
      8,
    );
  });
});
