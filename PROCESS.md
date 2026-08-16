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
Later I vendored NASA/JPL Horizons vectors for Voyager and Parker, then
expanded the local map to 28 published CNS5 catalogue rows across 22 systems,
with a reproducible fetch script and source metadata
([`9abba54`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/9abba54)).
Runtime stays offline, while tests protect the coordinate frame, endpoint radii
and the absence of invented arrival times for FTL craft.

### 3. Deleting the persuasive ruler

My first finished interaction used a logarithmic distance ruler. It fit every
milestone neatly, but that neatness contradicted the subject: it made 122 AU and
100,000 AU look like neighbouring ticks. I replaced its tests with linear
world/screen round trips, pointer-anchored zoom and exact ratio invariants
([`32d551a`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/32d551a)),
then replaced the ruler with one pannable coordinate space. The first SVG pass
was mathematically linear but still read like an infographic. After comparing
it with a working astronomical map, I wrote a new Canvas contract
([`d57a9e9`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/d57a9e9)),
expanded the sourced catalogue
([`2484135`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/2484135)),
and rebuilt the interaction around radial range rings, scale-dependent detail,
label collision, object selection and a physical scale bar
([`6b22ae1`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/6b22ae1)).
Voyager and Parker now use their actual JPL ecliptic x/y samples, interpolated
by elapsed date rather than unequal sample indices. Parker's high-curvature
orbit was still visibly faceted at five-day intervals, so I regenerated it at
six-hour cadence, retained the Horizons velocity vectors and used them for
state interpolation
([`6a0c59a`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/6a0c59a)). At 1920×1080 and 390×844 I
verified the catalogue, Oort, heliopause and planetary presets; resizing
preserves camera, vehicle and progress.

### 4. Throwing away a persuasive but false Parker result

Earlier browser verification exposed a contradiction: Parker's chart showed its
repeated acceleration and deceleration around the Sun, while its arrival number
quietly assumed the 430,000 mph perihelion peak lasted forever. I removed the
outbound result, kept the real orbital profile visible, and made “no outward
arrival” an explicit model state
([`595f3c3`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/595f3c3)).
A regression test prevents Parker's speed record becoming an interstellar
mission again. The final interaction first plays the measured Horizons path,
then inserts an orange **COUNTERFACTUAL CUT** before any frozen-peak comparison;
the two paths cannot be mistaken for one continuous mission
([`4bcecca`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/4bcecca)).
Selecting a vehicle also reveals a locally stored, credited image and a compact
source-labelled dossier before the same button begins the guided route
([`9322aac`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/9322aac)).
The original “1×” control still compressed decades into seconds, so I replaced
the narrative timer with a physical mission clock: one real second now advances
exactly one simulated second, while explicit higher rates keep long routes usable
([`5c051dc`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/5c051dc)).
I also replaced the generic straight line for *The Wandering Earth* with the
novel's Earth-at-1-AU sequence, fifteen widening solar passes and planned Jupiter
assist, marking all unsupplied geometry as schematic
([`2ae87f2`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/2ae87f2),
[`2aa7c7b`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/2aa7c7b)).
