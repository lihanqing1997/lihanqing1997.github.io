# Shared standard for all notes

`unified-v1` is the default for all new and revised notes. Optimal transport and
reinforcement learning implement it in full. Older notes share the site's
appearance and navigation; migrate their content structure when revising them.
Shared CSS alone does not make an older note fully conformant.

This is an authoring checklist, not prose to repeat on the website. Keep chapter
length and mathematical scope appropriate to the subject. There are no quotas
for theorems, examples, figures, or exercises.

## Shared implementation

- `_includes/note-study-style.html` owns the common appearance. Do not copy it
  into topic-specific styles or create topic-specific versions of its classes.
- Use the `note-index` layout for landing pages and `note-detail` for chapters.
- Start from `scripts/templates/note-index.html`, `note-chapter.html`, or
  `note-research.html`. Replace every `TODO` before publication. The templates
  are excluded from the built website.
- Set `note_template: unified-v1` on migrated pages. Detail pages also specify
  `note_kind: chapter` or `research` and their integer `note_chapter`.
- Set `format: unified-v1` in `_data/note_registry.yml` once the whole topic
  conforms. The quality audit checks every linked chapter of that topic, and
  individual marked pages during incremental migrations.

## Landing and reading order

The landing page contains the title/breadcrumb, a compact illustration when
useful, and sequential numbered contents grouped into meaningful parts. Do not
add an opening explanation or a competing reading route. Put necessary
orientation and prerequisites in the first chapter.

Contents order is reading order. Establish dependencies before using them.
Keep identical order and numbering in English, French, and Chinese, and a
complete Back/Last page/Next page navigation chain.

## Chapter structure

1. Open with one short `note-learning-goal` paragraph labeled **Learning goal.**
   State a concrete capability. Link prerequisites where they first matter.
2. Introduce the setting, assumptions, and notation. Expose central definitions
   in `math-statement definition` blocks; routine notation can remain in prose.
3. Use mathematically named sections, with result, full proof, and explanatory
   insight where useful. Place examples and counterexamples near the relevant
   result rather than forcing them into a separate end-of-page collection.
4. Close the development with **Exercises**. Each has a stable ID and a visible
   chapter-local label, such as `Exercise 4.1`. Provide independent expandable
   **Hint** and **Solution** elements, in that order. Hints suggest a first step;
   solutions meet the main text's derivation standard.
5. Put **Sources and further reading** last in a `note-sources` section. Retain
   precise references, prerequisite links, theorem dependencies, and scope
   qualifications. Keep inline citations next to the claims they support too.

Avoid generic visible headings such as “Core facts”, “Proof guide”, or a bare
“Definition”. The standard closing labels above are intentional exceptions.
Do not impose a fixed number of sections or results on every chapter.

## Mathematical contract and statement format

- Number definitions, theorems, propositions, lemmas, corollaries, examples,
  counterexamples, and remarks in one chapter-local sequence, for example
  `Theorem 4.2 (Contraction of the Bellman operator).` Store
  `data-result-number="4.2"` on the block and link its title to a semantic ID.
  Keep IDs stable when inserting results; update numbers and cross-references.
- Use **Worked example** for a computation carried to its conclusion and
  **Example** for a shorter illustration. Both share numbering and styling.
- A block labeled **Proof** must contain the proof. Preserve qualifications such
  as **Proof under the stated assumptions**, **Derivation**, or **Proof outline**.
  Record `data-proof-status="proof"`, `"qualified-proof"`, or `"derivation"`.
  Name and cite any imported theorem; a conditional derivation must not be
  presented as an unconditional proof. Use `note-external-input` for a separate
  paragraph explaining an imported input when helpful.
- Show constructed objects and intermediate equalities and inequalities, with
  short justifications. Naming a method in English does not carry it out. Split
  long arguments into named lemmas rather than compressing the steps into prose.
- Introduce symbols, domains, sigma-algebras, topologies, regularity, and
  quantifiers before use. State all hypotheses needed by a conclusion.
- For limits, specify the convergence mode, the domination, uniform estimate,
  or integrability condition permitting passage, and the order of limits.
  Justify exchanges of sums, integrals, expectations, derivatives, and limits.
  Distinguish almost-everywhere, in-probability, weak, norm, and pointwise claims.
- Prove the core theorem chain relative to the prerequisite notes in the
  registry. Link to precise prerequisite proofs rather than duplicating long
  results. Keep external inputs and their assumptions explicit.
- Number equations when referenced rather than numbering every display.
  Preserve existing tags during formatting changes. Prefer stable semantic
  anchors for links between pages.
- Use sentence case for headings, `\mathrm{d}` for differentials and measures,
  `A^\top` for transpose, and `A^*` for adjoint or conjugate transpose. Do not
  change mathematically meaningful notation during a format-only migration.
- Keep the canonical detail body in English; localize breadcrumbs, landing
  contents, and navigation. Prose should explain motivation, geometry, a proof
  step, or a limitation rather than restating labels.

## Research outlook variant

Use the same labeled learning goal, then **Research map**, **Research
directions**, **Self-study projects**, and **Sources and further reading**, in
that order. An additional section on interpreting research claims is fine.

- The map connects selected directions to preceding chapters and gives a
  concrete question to take into a paper. Wrap tables in `note-table-scroll`.
- Give each direction a descriptive subsection, prerequisites, reading links,
  and an account of what is proved versus assumed, empirical, or open. Be
  selective rather than encyclopedic.
- Use `note-projects` for bounded projects with expandable **Suggested checks**.
  Open-ended projects need not pretend to have a unique complete solution.
- Place foundational references and reading ladders in the final source section.
  Record when current references were actually checked. Formatting alone must
  not advance that date.

## Figures and layout

Use figures when they perform mathematical work: constructions, flows, state
transitions, geometry, or convergence phenomena. Prefer sharp SVG, useful
alternative text, and mathematical captions. Use `note-comparison` and
`note-table-scroll` wrappers. Long equations scroll inside their display rather
than widening the page.

## Revision and completion checks

For a formatting-only migration, compare against the previous published source.
Preserve every statement body, proof body and qualification, formula, exercise
question and solution, citation, and navigation target. Reordering sources and
research sections is allowed when their content is retained. New wrappers,
numbers, anchors, or hints must not silently change a mathematical claim.

Before publication:

1. Review changed mathematics against the registry's source anchors. For a
   format-only change, verify preservation instead of rewriting the proofs.
2. Read the sequence for dependencies, introduced symbols, and navigation.
3. Run `node scripts/audit-note-quality.mjs` (includes shared-template checks),
   `node scripts/audit-language-policy.mjs`, and
   `node scripts/check-source-structure.mjs`.
4. Build Jekyll, then run `node scripts/check-built-links.mjs PATH_TO_BUILD`.
5. Inspect landing, chapter, exercise, and research pages on desktop and mobile.
   Check mathematics, overflow, independent hints and solutions, statement links,
   localized navigation, and the final sources section.
6. After deployment, compare the published pages with the reviewed build.

Structural checks support, but do not replace, mathematical review.
