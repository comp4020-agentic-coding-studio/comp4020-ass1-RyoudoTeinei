import { describe, expect, it } from "vitest";
import horizonsJson from "../data/spacecraft-trajectories.json";
import { VEHICLES, type Vehicle } from "../mission-data";
import {
  buildMissionPhysicalTimeline,
  sampleMissionTourAtPhysicalTime,
} from "../mission-physical-time";
import { buildMissionTour } from "../mission-tour";
import { JULIAN_YEAR_SECONDS, SECONDS_PER_DAY } from "../simulation-clock";

function vehicle(id: string): Vehicle {
  const match = VEHICLES.find((candidate) => candidate.id === id);
  if (!match) throw new Error(`Missing test vehicle: ${id}`);
  return match;
}

function trajectory(id: string) {
  const match = horizonsJson.trajectories.find((candidate) => candidate.id === id);
  if (!match) throw new Error(`Missing test trajectory: ${id}`);
  return match;
}

describe("mission physical-time mapping", () => {
  it("derives Voyager's recorded duration from JPL Julian-day endpoints", () => {
    const tour = buildMissionTour(vehicle("voyager"));
    const timeline = buildMissionPhysicalTimeline(tour);
    const voyager = trajectory("voyager1");
    const first = voyager.samples[0];
    const last = voyager.samples.at(-1);
    if (!timeline || !first || !last) throw new Error("Missing Voyager timeline.");

    const expectedActualSeconds = (last.jdTdb - first.jdTdb) * SECONDS_PER_DAY;
    expect(timeline.segments[0]?.durationSeconds).toBeCloseTo(
      expectedActualSeconds,
      3,
    );
    expect(timeline.segments[0]?.normalizedEnd).toBeLessThan(0.01);
  });

  it("keeps Voyager's actual mission and onward comparison continuous", () => {
    const tour = buildMissionTour(vehicle("voyager"));
    const timeline = buildMissionPhysicalTimeline(tour);
    if (!timeline) throw new Error("Missing Voyager timeline.");
    const actualEnd = timeline.segments[0]?.endSeconds ?? 0;

    const justBefore = sampleMissionTourAtPhysicalTime(
      tour,
      timeline,
      actualEnd - 1,
    );
    const atBoundary = sampleMissionTourAtPhysicalTime(tour, timeline, actualEnd);
    expect(justBefore.routeMode).toBe("ephemeris");
    expect(atBoundary.routeMode).toBe("comparison");
    expect(atBoundary.chapterIndex).toBe(1);
    expect(atBoundary.chapterProgress).toBe(0);
    expect(atBoundary.physicalElapsedSeconds).toBe(actualEnd);
  });

  it("maps one physical second to one mission second without narrative scaling", () => {
    const tour = buildMissionTour(vehicle("voyager"));
    const timeline = buildMissionPhysicalTimeline(tour);
    if (!timeline) throw new Error("Missing Voyager timeline.");

    const first = sampleMissionTourAtPhysicalTime(tour, timeline, 12);
    const second = sampleMissionTourAtPhysicalTime(tour, timeline, 13);
    expect(second.physicalElapsedSeconds - first.physicalElapsedSeconds).toBe(1);
    expect(second.physicalElapsedYears - first.physicalElapsedYears).toBeCloseTo(
      1 / JULIAN_YEAR_SECONDS,
      15,
    );
  });

  it("retains Parker's counterfactual cut as an instant boundary", () => {
    const tour = buildMissionTour(vehicle("parker"));
    const timeline = buildMissionPhysicalTimeline(tour);
    if (!timeline) throw new Error("Missing Parker timeline.");
    const cutIndex = tour.chapters.findIndex(({ id }) => id === "counterfactual-cut");
    const cut = timeline.segments[cutIndex];
    const onward = timeline.segments[cutIndex + 1];

    expect(cut?.durationSeconds).toBe(0);
    expect(cut?.startSeconds).toBe(cut?.endSeconds);
    expect(onward?.startSeconds).toBe(cut?.endSeconds);

    const frame = sampleMissionTourAtPhysicalTime(
      tour,
      timeline,
      onward?.startSeconds ?? 0,
    );
    expect(frame.chapterIndex).toBe(cutIndex + 1);
    expect(frame.evidence).toBe("COUNTERFACTUAL");
  });

  it("uses profile elapsed years and declines finite clocks for off-map craft", () => {
    const daedalusTour = buildMissionTour(vehicle("daedalus"));
    const daedalusTimeline = buildMissionPhysicalTimeline(daedalusTour);
    if (!daedalusTimeline) throw new Error("Missing Daedalus timeline.");
    const lastChapter = daedalusTour.chapters.at(-1);

    expect(daedalusTimeline.totalSeconds).toBeCloseTo(
      (lastChapter?.elapsedEndYears ?? 0) * JULIAN_YEAR_SECONDS,
      2,
    );
    expect(
      buildMissionPhysicalTimeline(buildMissionTour(vehicle("enterprise"))),
    ).toBeUndefined();
  });

  it("rejects sampling a tour with another vehicle's physical timeline", () => {
    const voyager = buildMissionTour(vehicle("voyager"));
    const parker = buildMissionTour(vehicle("parker"));
    const timeline = buildMissionPhysicalTimeline(voyager);
    if (!timeline) throw new Error("Missing Voyager timeline.");
    expect(() => sampleMissionTourAtPhysicalTime(parker, timeline, 0)).toThrow(
      /cannot sample/i,
    );
  });
});
