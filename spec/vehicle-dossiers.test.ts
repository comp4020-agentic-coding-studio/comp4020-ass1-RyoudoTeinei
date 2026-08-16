import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { VEHICLES } from "../mission-data";
import {
  getVehicleDossier,
  VEHICLE_DOSSIERS,
} from "../vehicle-dossiers";

describe("vehicle dossiers", () => {
  it("covers every comparison vehicle exactly once", () => {
    expect(Object.keys(VEHICLE_DOSSIERS).sort()).toEqual(
      VEHICLES.map((vehicle) => vehicle.id).sort(),
    );
  });

  it("ships useful, credited local media instead of hotlinks", () => {
    for (const vehicle of VEHICLES) {
      const dossier = getVehicleDossier(vehicle.id);
      expect(dossier.vehicleId).toBe(vehicle.id);
      expect(dossier.media.src).toMatch(/^\/?assets\/vehicles\//);
      expect(dossier.media.src).not.toMatch(/^https?:/);
      const sourcePath = dossier.media.src.replace(/^\//, "");
      expect(existsSync(resolve(process.cwd(), sourcePath))).toBe(true);
      expect(dossier.media.alt.trim().length).toBeGreaterThan(12);
      expect(dossier.media.credit.trim().length).toBeGreaterThan(2);
      expect(dossier.media.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it("keeps each dossier compact and explicit about evidence", () => {
    for (const dossier of Object.values(VEHICLE_DOSSIERS)) {
      expect(dossier.facts.length).toBeGreaterThanOrEqual(3);
      expect(dossier.facts.length).toBeLessThanOrEqual(5);
      expect(dossier.facts.every((fact) => fact.trim().length > 8)).toBe(true);
      expect(dossier.missionSummary.trim().length).toBeGreaterThan(20);
      expect(dossier.canonicalNote.trim().length).toBeGreaterThan(20);
    }
  });
});
