import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const doc = new JSDOM(
  readFileSync(resolve("dist/index.html"), "utf8"),
).window.document;

describe("Assignment 1: interstellar journey explainer", () => {
  it("states the explainer's point of view", () => {
    expect(doc.title).toMatch(/solar system|interstellar|leaving/i);
    expect(doc.querySelector("h1")?.textContent).toMatch(
      /edge.*exit|leave|solar system|interstellar/i,
    );
  });

  it("exposes one testable journey interaction", () => {
    expect(doc.querySelector('[data-testid="vehicle-picker"]')).toBeTruthy();
    expect(doc.querySelectorAll("[data-vehicle]").length).toBeGreaterThan(5);
    expect(doc.querySelector('[data-testid="launch"]')).toBeTruthy();
    expect(doc.querySelector('[data-testid="journey-progress"]')).toBeTruthy();
    expect(doc.querySelector('[aria-live="polite"]')).toBeTruthy();
  });

  it("keeps the distance scale and speed profile in the explanation", () => {
    expect(doc.querySelector('[data-testid="distance-track"]')).toBeTruthy();
    expect(doc.querySelector('[data-testid="speed-profile"]')).toBeTruthy();
    expect(doc.querySelector('[data-testid="journey-time"]')).toBeTruthy();
  });

  it("labels evidence and modelling assumptions", () => {
    expect(doc.querySelector('[data-testid="model-note"]')).toBeTruthy();
    expect(doc.querySelectorAll("#sources a[href]").length).toBeGreaterThan(5);
  });
});
