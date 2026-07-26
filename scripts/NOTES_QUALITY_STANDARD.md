# Notes quality standard

This document is an editorial checklist. It must not be copied into detail pages
as a repeated visible template. Page headings must name the mathematics actually
being developed.

## Mathematical contract

1. Introduce every symbol and object before it is used. State domains,
   codomains, sigma-algebras, topologies, regularity, and quantifiers.
2. State a result with all assumptions needed for the displayed conclusion.
   Distinguish almost-everywhere, in-probability, weak, norm, and pointwise
   claims explicitly.
3. A block titled `Proof` must be a proof. If essential arguments are omitted,
   title it `Proof outline`, name the imported results, and link to their proofs.
4. Prove the core theorem chain in the note. Split long arguments into
   mathematically named lemmas instead of compressing them into prose.
5. Work representative examples to a conclusion. Use counterexamples to show
   why important hypotheses cannot simply be removed.
6. Keep explanatory prose close to the formula or theorem it explains. It
   should expose motivation, geometry, or proof strategy rather than repeat the
   visible heading.

## Self-containedness

A note is self-contained relative to the prerequisite notes recorded in
`_data/note_registry.yml`. When a prerequisite result is used, link to the
precise page where it is proved. Do not reproduce a long theorem from another
note merely to avoid a cross-reference.

The opening pages of a note establish its basic objects and notation. Advanced
pages may rely on earlier numbered pages, but must identify that dependence in
the surrounding text.

## Examples and figures

There is no quota for examples or figures. Add them when they perform
mathematical work:

- geometric constructions, quotient identifications, maps, flows, and
  projections;
- convergence modes, stochastic paths, confidence geometry, and likelihood
  shape;
- meshes, stability regions, spectra, phase portraits, and transport plans;
- commutative diagrams, lattices, filtrations, causal graphs, and state
  transitions.

Prefer clean SVG figures that remain sharp at the site's full content width.
Use labels sparingly, provide useful alternative text, and keep captions
mathematical rather than decorative.

## Site-wide conventions

- Use sentence case for titles and headings.
- Use `\mathrm{d}` for differentials and integration measures.
- Use `A^\top` for transpose and `A^*` for adjoint or conjugate transpose.
- Keep the canonical detail-page body in English; localize breadcrumbs,
  landing-page titles, and structural navigation.
- Preserve the numbered breadcrumb and complete Back/Last page/Next page chain.
- Do not add exercise sections. A problem worth retaining should appear as a
  worked example.
- Do not use generic visible headings such as `Core facts`, `Proof guide`,
  `Definition`, `Proposition`, `Proof`, or `Remark`.

## Completion gate

A note is complete only after:

1. every page has received a mathematical-content review against the source
   anchors in `_data/note_registry.yml`;
2. every theorem dependency and symbol introduction has been checked by reading
   the note in order;
3. the language-policy and quality audits pass;
4. the Jekyll build succeeds without warnings relevant to the notes;
5. landing and detail pages have been inspected at desktop and mobile widths;
6. internal links, figures, localized breadcrumbs, and previous/next navigation
   have been verified.
