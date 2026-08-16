# Process overview

## What I built

I built **The Edge Is Not the Exit**, an interactive journey plotter about the
misleading phrase “leaving the Solar System”. Its single route runs from Earth
past Jupiter, Neptune, the heliopause and a conservative 100,000 AU outer edge
of the Oort Cloud, then to Proxima Centauri. Selecting a familiar vehicle, real
spacecraft, engineering study or fictional machine changes the same distance
track, arrival time and speed/phase profile. The point is not that every option
is a plausible mission. It is that even spectacular human speeds barely alter
the scale—and that uncertainty should be visible instead of converted into a
confident-looking number.

## The moments that mattered

### 1. Fixing the harness before building the artefact

The first `pnpm install` downloaded every dependency, then failed because the
starter's `prepare` command used `/dev/null` and `true`, which PowerShell could
not execute. Ignoring scripts would have made my machine green while silently
discarding the repository's secret-scanning hook. Instead, I replaced the shell
expression with a small cross-platform Node script and added modelling,
keyboard and viewport rules to `CLAUDE.md`
([`ba542b1`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/ba542b1)).
I accepted it only after `pnpm install` ran the hook setup successfully and the
new spec tests produced a genuine red state against the starter.

### 2. Making evidence level part of the model

The obvious implementation was one table of impressive speeds. That would have
put a recorded Voyager velocity, a Daedalus design target and a Star Trek warp
factor on the same epistemic footing. I instead encoded `MEASURED`,
`COUNTERFACTUAL`, `DESIGN STUDY`, `FICTION / INFERRED` and `NOT COMPARABLE` as
data, and made missing arrival times a supported result rather than an error
([`2a36163`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/2a36163)).
Unit tests verify the logarithmic milestone order, Voyager's sourced scale
comparison and the absence of invented arrival times for FTL craft. This kept
adding more vehicles from turning the project into an uncritical catalogue.

### 3. One interaction survived both marking viewports

The visual system and interaction landed together in
[`9b3d47b`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/9b3d47b):
a launch manifest drives one log-distance route, live boundary times and one
phase chart. I tested the built page at 1920×1080, launched Daedalus, then
resized it mid-flight to 390×844. The selected vehicle, phase and non-zero
progress survived; `scrollWidth` remained below the viewport width. I also used
arrow keys to change the manifest selection and confirmed that an incomparable
Enterprise disables launch while still explaining why.

### 4. Throwing away a persuasive but false Parker result

Browser verification exposed a contradiction: Parker's chart showed its real
repeated acceleration and deceleration around the Sun, while its arrival number
quietly assumed the 430,000 mph perihelion peak lasted forever. I removed the
outbound result, kept the real orbital profile visible, and made “no outward
arrival” an explicit model state
([`595f3c3`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/595f3c3)).
A regression test now prevents Parker's speed record becoming an interstellar
mission again. The impossible 6,628-year comparison survives only as labelled
context, not as the answer the interface asks a visitor to trust.
