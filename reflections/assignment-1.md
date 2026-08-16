# Assignment 1 reflection

## What was the breakthrough that moved the work forward?

The breakthrough was realising that a scale weakened my argument. My
logarithmic ruler let 122 AU and 100,000 AU coexist, but made the
heliopause and Oort Cloud feel like neighbouring stops. I replaced it with
linear coordinates and an automatic camera that changes the visible range. When
the SVG resembled a labelled ruler, I rebuilt it as a Canvas map with
radial rings, a scale bar, collision-aware labels
and scale-dependent detail. Neptune can now become smaller than a pixel while
the Oort Cloud remains visibly enormous. The interaction demonstrates
that **crossing the heliopause is not leaving the Solar System**.

Data became part of the explanation rather than decoration. CNS5 catalogue
positions establish the stars, while JPL vectors draw Voyager's turns and
Parker's repeated solar orbits. The playback separates measured trajectories
from counterfactual extensions, displays its time multiplier, and
changes scale only after the craft crosses a boundary. Human-history comparisons
make the years legible. Fictional routes follow the same evidence
discipline: *The Wandering Earth* starts at Earth’s 1 AU orbit and labels its
novel stages separately from schematic geometry.

## What did this change about the developer I want to be?

I want to build interfaces that show knowledge status, not merely its
most dramatic number. Visual polish can make a weak assumption appear
authoritative, so provenance must be part of the design language: measured,
counterfactual, studied or inferred. Those distinctions now live in types,
tests, line styles and visible labels rather than a disclaimer.

I want verification to change the work rather than merely approve it.
Automated tests protect geometry and evidence boundaries; using the page reveals
whether that evidence is honest, legible and educational.
