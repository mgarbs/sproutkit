# Contributing to SproutKit

SproutKit aims to be the canonical, source-cited gardening knowledge base for AI clients. That goal only works if every contribution is verifiable and the change history stays clean. This file is the rule set.

## The two rules that matter most

1. **Every fact in the dataset cites a source.** The schema enforces `sources: [...]` with `min(1)`. Prefer cooperative-extension publications (UMN, PSU, Clemson, Oregon State, Texas A&M, UGA, UMD, etc.) with stable URLs. Two independent sources per plant is the bar.
2. **One logical change per commit; PR ≤ 400 lines of code.** Data and docs don't count toward the LOC budget. If a commit message needs an "and", split it.

## Developer Certificate of Origin (DCO)

By contributing, you certify the [DCO 1.1](https://developercertificate.org/) — that you wrote the change yourself or have the right to submit it under the project's license. Sign off every commit:

```bash
git commit -s -m "feat(schema): add koppen_climate field"
```

The sign-off appends a `Signed-off-by:` trailer that we may enforce in CI later.

## Commit and PR style

- **Conventional Commits.** `feat(scope): …`, `fix(scope): …`, `chore(scope): …`, `docs(scope): …`, `test(scope): …`. Scopes match the workspace: `schema`, `mcp`, `data`, `ci`, `scripts`.
- **First commit of every feature is the docs/README stub** so reviewers can read the intent before the code.
- **Data PRs separate from code PRs.** A YAML edit and a schema change should not land together.
- **CI must be green** (`pnpm validate:data` + typecheck) before request-for-review.

## Adding a plant

1. Pick a `slug` in `kebab-case` matching `cultivar-or-variety` (e.g. `tomato-brandywine`, `garlic-music`).
2. Create `data/plants/<slug>.yaml`. Use an existing entry as a template.
3. Cite **at least two** cooperative-extension sources with stable URLs. Hobbyist blogs and wikis don't count.
4. Run `pnpm validate:data` locally — it must pass before you commit.
5. Open a PR with the title `feat(data): add <slug>` and describe what's notable about the cultivar (e.g. why this variety vs the generic species).

## Editing the schema

Changes to `packages/schema/` touch the source of truth for every downstream consumer. Open an issue first to discuss the shape, and include a migration note in the PR description (which fields existing YAMLs need to gain or lose).

## Licensing

Code contributions are licensed MIT. Data contributions are licensed CC-BY-SA 4.0. By opening a PR you agree to release your change under the relevant license.

## Code of conduct

Be kind, assume good faith, debate the substance not the person. Issues that veer into personal attacks will be closed.
