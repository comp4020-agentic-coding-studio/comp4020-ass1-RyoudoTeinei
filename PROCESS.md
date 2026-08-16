# Process overview

## What I built

I built **The Edge Is Not the Exit**, an interactive explanation of why crossing
the heliopause is not the same as leaving the Solar System. A true-linear map
follows real spacecraft, engineering studies, ordinary vehicles and fictional
machines from Earth towards the Oort Cloud and nearby stars. Users can inspect
credited dossiers, play evidence-labelled mission routes and watch a physical
clock accelerate while the camera expands across planetary, Oort Cloud and
interstellar scales. The interface deliberately distinguishes measured
ephemerides, design studies, counterfactual comparisons and fiction rather than
presenting every speed as equally real.

## The moments that mattered

### 1. Making uncertainty part of the model

My first data structure was effectively a table of impressive speeds. That
made Voyager measurements, Daedalus targets and fictional warp travel appear
equally authoritative. I replaced it with explicit evidence states—including
`MEASURED`, `COUNTERFACTUAL`, `DESIGN STUDY`, `FICTION` and `NOT COMPARABLE`—and
made missing results valid rather than errors
([`2a36163`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/2a36163)).
I later vendored NASA/JPL Horizons trajectories and a sourced CNS5 nearby-star
catalogue, keeping runtime offline while preserving source and coordinate-frame
metadata
([`9abba54`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/9abba54)).

### 2. Removing a ruler that weakened the argument

The first prototype used a logarithmic ruler because it fitted Earth, the
heliopause, the Oort Cloud and Proxima neatly on one line. That neatness hid the
subject: 122 AU and 100,000 AU looked like neighbouring milestones. I replaced
the ruler with a true-linear coordinate system and tests for world/screen
round-trips and scale invariants
([`32d551a`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/32d551a)).
The initial SVG still felt like an infographic, so I rebuilt it as a Canvas map
with radial scale rings, object selection, label collision and scale-dependent
detail
([`6b22ae1`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/6b22ae1)).
At stellar scale the planets now genuinely disappear, which communicates the
distance more honestly than a labelled diagram could.

### 3. Separating a speed record from an escape trajectory

Parker Solar Probe initially produced a dramatic arrival time by freezing its
430,000 mph perihelion speed forever. Browser testing exposed the contradiction:
its real trajectory remained a bound solar orbit. I removed the false outward
arrival and made “no outward arrival” an explicit result
([`595f3c3`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/595f3c3)).
The final tour plays the measured route first, then inserts a visible
**COUNTERFACTUAL CUT** before any frozen-speed comparison
([`4bcecca`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/4bcecca)).
This changed the visual language: line colour, continuity and chapter labels now
communicate evidence, rather than leaving credibility in small source notes.

### 4. Turning long duration into an understandable experience

A fixed twelve-second animation made a seventy-thousand-year trip look fast,
while a literal 1× clock made it unusable. I replaced the narrative timer with
a physical clock where one real second truly advances one simulated second,
then added visible higher rates
([`5c051dc`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/5c051dc)).
An automatic director now gives each mission stage readable screen time, pauses
at boundaries and keeps the craft centred while the true-linear camera changes
scale. The map displays the multiplier, elapsed time and historical-duration
comparisons, while cached route geometry keeps playback responsive
([`196c8c0`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/196c8c0)).
For *The Wandering Earth*, I also replaced the generic straight route with an
Earth-at-1-AU departure, fifteen widening solar passes and a labelled Jupiter
assist, marking unspecified geometry as schematic
([`2ae87f2`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-RyoudoTeinei/commit/2ae87f2)).
