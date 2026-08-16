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

  it("keeps the true-scale space map and speed profile in the explanation", () => {
    const map = doc.querySelector('[data-testid="space-map"]');
    expect(map).toBeTruthy();
    expect(map?.tagName).toBe("svg");
    expect(map?.querySelector("title")?.textContent).toMatch(/space|solar|route/i);
    expect(map?.querySelector("desc")?.textContent).toMatch(/linear|scale|ecliptic/i);
    expect(doc.querySelector('[data-map-action="zoom-in"]')).toBeTruthy();
    expect(doc.querySelector('[data-map-action="zoom-out"]')).toBeTruthy();
    expect(doc.querySelector('[data-testid="speed-profile"]')).toBeTruthy();
    expect(doc.querySelector('[data-testid="journey-time"]')).toBeTruthy();
  });

  it("labels evidence and modelling assumptions", () => {
    expect(doc.querySelector('[data-testid="model-note"]')).toBeTruthy();
    expect(doc.querySelectorAll("#sources a[href]").length).toBeGreaterThan(5);
  });

  it("uses native keyboard controls without positive tabindex values", () => {
    for (const element of doc.querySelectorAll("[tabindex]")) {
      expect(Number(element.getAttribute("tabindex"))).toBeLessThanOrEqual(0);
    }
    for (const option of doc.querySelectorAll("[data-vehicle]")) {
      expect(option.tagName).toBe("BUTTON");
      expect(option.getAttribute("type")).toBe("button");
    }
    expect(doc.querySelector('[data-testid="journey-progress"]')?.getAttribute("type")).toBe("range");
  });

  it("keeps the runtime entirely client-side", () => {
    for (const script of doc.querySelectorAll("script[src]")) {
      expect(script.getAttribute("src")).toMatch(/^\.\//);
    }
    for (const stylesheet of doc.querySelectorAll('link[rel="stylesheet"]')) {
      expect(stylesheet.getAttribute("href")).toMatch(/^\.\//);
    }
  });
});
