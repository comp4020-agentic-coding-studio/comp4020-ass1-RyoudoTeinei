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

  it("uses summaries for subject introductions rather than interface disclaimers", () => {
    for (const dossier of Object.values(VEHICLE_DOSSIERS)) {
      expect(dossier.missionSummary).not.toMatch(
        /^(?:The )?(?:tour|interaction|dossier|explainer|comparison|guided profile|experience)\b/i,
      );
    }
  });

  it("labels modern Orion and Daedalus reconstructions honestly", () => {
    const daedalus = getVehicleDossier("daedalus");
    const orion = getVehicleDossier("orion");

    expect(daedalus.media.kind).toBe("concept illustration");
    expect(daedalus.media.credit).toContain("Joe Bergeron");
    expect(daedalus.media.license).not.toMatch(/public domain/i);
    expect(orion.media.kind).toBe("concept illustration");
    expect(orion.media.credit).toContain("Real Engineering");
    expect(orion.media.license).not.toMatch(/public domain/i);
  });

  it("introduces Orion and Daedalus before discussing model limits", () => {
    const daedalus = getVehicleDossier("daedalus");
    const orion = getVehicleDossier("orion");

    expect(daedalus.missionSummary).toMatch(/British Interplanetary Society/i);
    expect(daedalus.missionSummary).toMatch(/Barnard's Star/i);
    expect(daedalus.missionSummary).toMatch(/fusion pellets/i);
    expect(orion.missionSummary).toMatch(/General Atomics/i);
    expect(orion.missionSummary).toMatch(/chemical rockets/i);
    expect(orion.missionSummary).toMatch(/pusher plate/i);
  });
});
