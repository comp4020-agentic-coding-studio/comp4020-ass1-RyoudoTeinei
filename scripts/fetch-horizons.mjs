import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(SCRIPT_DIR, "../data/spacecraft-trajectories.json");

const requests = [
  {
    key: "voyager1",
    name: "Voyager 1",
    horizonsCommand: "-31",
    segments: [
      {
        label: "planetary encounters",
        start: "1977-09-06",
        stop: "1981-01-01",
        step: "1 d",
      },
      {
        label: "interstellar cruise",
        start: "1981-01-02",
        stop: "2026-08-16",
        step: "30 d",
      },
      {
        label: "current endpoint",
        times: ["2026-08-16"],
      },
    ],
  },
  {
    key: "parkerSolarProbe",
    name: "Parker Solar Probe",
    horizonsCommand: "-96",
    segments: [
      {
        label: "mission trajectory",
        start: "2018-08-12 08:17",
        stop: "2026-08-16",
        step: "5 d",
      },
      {
        label: "current endpoint",
        times: ["2026-08-16"],
      },
    ],
  },
];

const monthNumbers = new Map(
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(
    (month, index) => [month, String(index + 1).padStart(2, "0")],
  ),
);

function buildQuery(command, segment) {
  const params = new URLSearchParams({
    format: "text",
    COMMAND: `'${command}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: "'500@10'",
    TIME_TYPE: "'TDB'",
    REF_PLANE: "'ECLIPTIC'",
    REF_SYSTEM: "'ICRF'",
    OUT_UNITS: "'AU-D'",
    VEC_TABLE: "'2'",
    VEC_CORR: "'NONE'",
    CSV_FORMAT: "'YES'",
    CAL_TYPE: "'GREGORIAN'",
    TIME_DIGITS: "'SECONDS'",
  });

  if (segment.times) {
    params.set("TLIST", segment.times.map((time) => `'${time}'`).join(","));
  } else {
    params.set("START_TIME", `'${segment.start}'`);
    params.set("STOP_TIME", `'${segment.stop}'`);
    params.set("STEP_SIZE", `'${segment.step}'`);
  }

  return `${API_URL}?${params.toString()}`;
}

function normaliseTdbDate(value) {
  const match = value.match(
    /^A\.D\.\s+(\d{4})-([A-Z][a-z]{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
  );

  if (!match) {
    throw new Error(`Unexpected Horizons calendar value: ${value}`);
  }

  const [, year, monthName, day, hour, minute, second] = match;
  const month = monthNumbers.get(monthName);
  if (!month) {
    throw new Error(`Unknown Horizons month: ${monthName}`);
  }

  // This deliberately has no trailing Z: metadata identifies the timescale as TDB, not UTC.
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function parseVectors(text, sourceUrl) {
  const startMarker = text.indexOf("$$SOE");
  const endMarker = text.indexOf("$$EOE");

  if (startMarker === -1 || endMarker === -1 || endMarker <= startMarker) {
    throw new Error(`Horizons returned no vector table for ${sourceUrl}\n${text.slice(0, 500)}`);
  }

  return text
    .slice(startMarker + "$$SOE".length, endMarker)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const columns = line.split(",").map((column) => column.trim());
      if (columns.length < 8) {
        throw new Error(`Unexpected Horizons vector row: ${line}`);
      }

      const [jdTdb, calendarTdb, x, y, z] = columns;
      const sample = {
        date: normaliseTdbDate(calendarTdb),
        x: Number(x),
        y: Number(y),
        z: Number(z),
      };

      if (![sample.x, sample.y, sample.z].every(Number.isFinite)) {
        throw new Error(`Non-numeric Horizons vector row: ${line}`);
      }

      return { jdTdb: Number(jdTdb), ...sample };
    });
}

async function fetchTextWithRetry(url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "COMP4020-assignment-1-trajectory-fetcher/1.0" },
      });
      if (!response.ok) {
        throw new Error(`Horizons request failed (${response.status} ${response.statusText}): ${url}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 1_000));
      }
    }
  }

  throw lastError;
}

async function fetchSegment(spacecraft, segment) {
  const url = buildQuery(spacecraft.horizonsCommand, segment);
  const range = segment.times
    ? segment.times.join(", ")
    : `${segment.start} to ${segment.stop}, ${segment.step}`;
  process.stdout.write(
    `Fetching ${spacecraft.name}: ${segment.label} (${range})... `,
  );

  const samples = parseVectors(await fetchTextWithRetry(url), url);
  console.log(`${samples.length} samples`);
  return { ...segment, url, samples };
}

async function main() {
  const trajectories = [];

  for (const spacecraft of requests) {
    const fetchedSegments = [];
    for (const segment of spacecraft.segments) {
      fetchedSegments.push(await fetchSegment(spacecraft, segment));
    }

    const byJulianDate = new Map();
    for (const segment of fetchedSegments) {
      for (const sample of segment.samples) {
        byJulianDate.set(sample.jdTdb, sample);
      }
    }

    const samples = [...byJulianDate.values()]
      .sort((a, b) => a.jdTdb - b.jdTdb)
      .map(({ jdTdb: _jdTdb, ...sample }) => sample);

    trajectories.push({
      id: spacecraft.key,
      name: spacecraft.name,
      horizonsCommand: spacecraft.horizonsCommand,
      sampling: fetchedSegments.map(({ samples: _samples, url, ...segment }) => ({ ...segment, url })),
      samples,
    });
  }

  const output = {
    source: {
      name: "NASA/JPL Horizons API",
      url: API_URL,
      documentation: "https://ssd-api.jpl.nasa.gov/doc/horizons.html",
    },
    queriedAt: new Date().toISOString(),
    coordinateFrame: {
      origin: "Sun body centre (500@10)",
      referencePlane: "Ecliptic of J2000.0",
      referenceSystem: "ICRF",
      distanceUnit: "astronomical unit (AU)",
      timeScale: "TDB",
      vectorCorrections: "NONE (geometric states)",
      projectionHint: "Use x/y for the ecliptic map; retain z and 3D radius in labels.",
    },
    trajectories,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
