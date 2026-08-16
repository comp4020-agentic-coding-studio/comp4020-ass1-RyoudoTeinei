# Process overview

## What I built

I built **The Edge Is Not the Exit**, an interactive journey plotter about the
misleading phrase “leaving the Solar System”. Its single route runs from Earth
past Jupiter, Neptune, the heliopause and a conservative 100,000 AU Oort Cloud
edge, then into the nearby-star neighbourhood. Selecting a familiar vehicle,
real spacecraft, engineering study or fictional machine changes the same map,
arrival comparison and speed/phase profile. The map is always linear: at the
12-light-year view the planets genuinely disappear, and presets or free zoom
reveal them without changing any proportion. The point is not that every option
is a plausible mission. It is that even spectacular human speeds barely alter
the scale—and uncertainty should remain visible instead of becoming a confident
number.

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

The obvious implementation was one table of impressive speeds. That would put
a recorded Voyager velocity, a Daedalus design target and a Star Trek warp
factor on the same epistemic footing. I instead encoded `MEASURED`,
`COUNTERFACTUAL`, `DESIGN STUDY`, `FICTION / INFERRED` and `NOT COMPARABLE` as
data, and made missing arrival times a supported result rather than an error
([`2a36163`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/2a36163)).
Later I vendored 2,358 NASA/JPL Horizons samples for Voyager and Parker plus 12
CNS5 catalogue anchors, with a reproducible fetch script and source metadata
([`9abba54`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/9abba54)).
Runtime stays offline, while tests protect the coordinate frame, endpoint radii
and the absence of invented arrival times for FTL craft.

### 3. Deleting the persuasive ruler

My first finished interaction used a logarithmic distance ruler. It fit every
milestone neatly, but that neatness contradicted the subject: it made 122 AU and
100,000 AU look like neighbouring ticks. I replaced its tests with linear
world/screen round trips, pointer-anchored zoom and exact ratio invariants
([`32d551a`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/32d551a)),
then replaced the ruler with one pannable SVG coordinate space
([`772d409`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/772d409)).
At 1920×1080 I verified the 10-light-year context ring and Oort shell; at
390×844 I switched into Parker's real shrinking ellipses and checked the
touch-sized map controls without horizontal overflow. Resizing preserves camera,
vehicle and progress.

### 4. Throwing away a persuasive but false Parker result

Earlier browser verification exposed a contradiction: Parker's chart showed its
repeated acceleration and deceleration around the Sun, while its arrival number
quietly assumed the 430,000 mph perihelion peak lasted forever. I removed the
outbound result, kept the real orbital profile visible, and made “no outward
arrival” an explicit model state
([`595f3c3`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/595f3c3)).
A regression test prevents Parker's speed record becoming an interstellar
mission again. The final map goes further: Parker's launch control now plays its
real Horizons ephemeris, while the impossible 6,628-year comparison survives
only as labelled context—not as a route.
