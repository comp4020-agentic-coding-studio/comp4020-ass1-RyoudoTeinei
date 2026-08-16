# Assignment 1 reflection

## What was the breakthrough that moved the work forward?

The breakthrough was realising that a tidy scale was weakening the argument.
My logarithmic ruler made 122 AU and 100,000 AU coexist elegantly, but also made
them feel like neighbouring stops. I replaced it with one linear space where
zoom changes only the camera. The first SVG version remained too much like a
labelled ruler, so I rebuilt it as an astronomical Canvas: radial range rings, a
physical scale bar, scale-dependent detail, collision-aware labels and
selectable objects share one ecliptic coordinate system. At the nearby-star
view, Neptune is correctly smaller than a pixel while the Oort Cloud remains a
visible region around an almost invisible Sun. Having to zoom through those
scales explains **crossing the heliopause is not leaving the Solar System** more
clearly than a paragraph could.

The scientific data also stopped being decoration. Twenty-eight CNS5 catalogue
rows establish the real local neighbourhood; JPL vectors draw Voyager's
planetary turns and Parker's repeated solar orbits. Parker's 430,000 mph record
therefore cannot masquerade as an outbound cruise. “No outward arrival” is now
visible in the path itself.

## What did this change about the developer I want to be?

I want to build interfaces that show the status of knowledge, not only its most
dramatic number. Visual polish can make a weak assumption feel authoritative,
so the design language must carry provenance: measured, counterfactual,
studied, inferred or deliberately incomparable. Those distinctions now live in
types, tests and visible labels instead of relying on a disclaimer.

Browser verification must change the work, not merely approve it. Automated
tests protect geometry and evidence; using the page tests whether that evidence
is honest, legible and educational.
