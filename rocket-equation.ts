import {
  formatMassRatio,
  idealCruiseYears,
  LIGHT_SPEED_KM_S,
  relativisticMassRatio,
} from "./rocket-equation-math";

interface EnginePreset {
  id: string;
  name: string;
  exhaustKmS: number;
  note: string;
}

const ENGINE_PRESETS: EnginePreset[] = [
  { id: "chemical", name: "Chemical · best practical class", exhaustKmS: 4.4, note: "High thrust; exhaust below 4.4 km/s." },
  { id: "nuclear", name: "Nuclear thermal · NERVA class", exhaustKmS: 8.8, note: "Roughly twice chemical exhaust velocity." },
  { id: "ion", name: "Ion · NASA NEXT", exhaustKmS: 41.1, note: "High exhaust velocity, but extremely low thrust." },
  { id: "fusion", name: "Fusion · Daedalus-like", exhaustKmS: 10_000, note: "A design-study value, not an operating engine." },
  { id: "photon", name: "Ideal photon rocket", exhaustKmS: LIGHT_SPEED_KM_S, note: "The unattainable upper bound: perfectly directed mass-energy." },
];

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing #${id}`);
  return element as T;
}

const speedInput = requireElement<HTMLInputElement>("target-speed");
const engineInput = requireElement<HTMLSelectElement>("engine-preset");
const speedPercent = requireElement("speed-percent");
const speedKms = requireElement("speed-kms");
const cruiseTime = requireElement("cruise-time");
const exhaustReadout = requireElement("exhaust-readout");
const engineNote = requireElement("engine-note");
const launchRatio = requireElement("launch-ratio");
const stopRatio = requireElement("stop-ratio");
const launchExponent = requireElement("launch-exponent");
const stopExponent = requireElement("stop-exponent");

function selectedEngine(): EnginePreset {
  return ENGINE_PRESETS.find((engine) => engine.id === engineInput.value) ?? ENGINE_PRESETS[0];
}

function renderCalculator(): void {
  const beta = Number(speedInput.value) / 100;
  const engine = selectedEngine();
  const launch = relativisticMassRatio(beta, engine.exhaustKmS, 1);
  const stop = relativisticMassRatio(beta, engine.exhaustKmS, 2);

  speedPercent.textContent = `${(beta * 100).toFixed(1)}% c`;
  speedKms.textContent = `${Math.round(beta * LIGHT_SPEED_KM_S).toLocaleString("en-US")} KM/S`;
  cruiseTime.textContent = `${idealCruiseYears(beta).toLocaleString("en-US", { maximumFractionDigits: 1 })} YEARS`;
  exhaustReadout.textContent = `${engine.exhaustKmS.toLocaleString("en-US", { maximumFractionDigits: 1 })} KM/S`;
  engineNote.textContent = engine.note;
  launchRatio.textContent = formatMassRatio(launch);
  stopRatio.textContent = formatMassRatio(stop);
  launchExponent.textContent = `ln R = ${launch.lnRatio.toLocaleString("en-US", { maximumFractionDigits: 2 })} · log₁₀ R = ${launch.log10Ratio.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  stopExponent.textContent = `ln R = ${stop.lnRatio.toLocaleString("en-US", { maximumFractionDigits: 2 })} · log₁₀ R = ${stop.log10Ratio.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

  speedInput.setAttribute("aria-valuetext", `${(beta * 100).toFixed(1)} percent of light speed`);
}

for (const engine of ENGINE_PRESETS) {
  const option = document.createElement("option");
  option.value = engine.id;
  option.textContent = engine.name;
  engineInput.append(option);
}
engineInput.value = "chemical";

document.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach((button) => {
  button.addEventListener("click", () => {
    speedInput.value = button.dataset.speed ?? "10";
    renderCalculator();
  });
});

speedInput.addEventListener("input", renderCalculator);
engineInput.addEventListener("change", renderCalculator);
renderCalculator();
