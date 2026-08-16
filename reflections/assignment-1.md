# Assignment 1 reflection

## What was the breakthrough that moved the work forward?

The breakthrough was replacing “how fast are these vehicles?” with a sharper
claim: **crossing the heliopause is not leaving the Solar System**. That gave
every part of the prototype one job. The logarithmic route makes 122 AU and
100,000 AU coexist on screen; each vehicle changes the same route rather than
opening another fact page; and the phase chart explains why a headline speed is
not automatically a journey speed.

The moment this became real was the Parker correction. Its 430,000 mph record
made a wonderful-looking result, but Parker earns that speed by falling deep
into the Sun's gravity well and remains on a bound orbit. Removing its arrival
time made the explainer more truthful and, unexpectedly, more interesting. “No
comparable answer” became part of the interaction rather than an embarrassment
to hide.

## What did this change about the developer I want to be?

I want to build interfaces that show the status of knowledge, not only its most
dramatic number. Visual polish can make a weak assumption feel authoritative,
so design language has to carry provenance: measured, counterfactual, studied,
inferred or deliberately incomparable. Those distinctions now live in types,
tests and visible labels instead of relying on a disclaimer at the bottom.

I also want verification to change the work, not merely approve it. Running the
interaction, resizing it mid-flight and reading the result as a visitor exposed
a conceptual error that typechecking could not. My preferred workflow now has
two loops: automated sensors protect contracts, while browser use tests whether
the explanation itself remains honest and legible.
