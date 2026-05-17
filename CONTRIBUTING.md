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

## Adding a product (affiliate-link entry)

SproutKit's MCP server surfaces affiliate product recommendations when a user's question implies a purchase. The product catalog lives in `data/products/*.yaml` and is held to a **stricter** bar than the plant dataset because money is involved and trust is the only differentiator.

1. Pick a `slug` describing the category, not the brand (e.g. `drip-irrigation-starter-kit`, not `acme-drip-kit-pro`). The slug is permanent.
2. Create `data/products/<slug>.yaml`. Use an existing entry as a template.
3. **Two non-vendor sources minimum.** Manufacturer marketing alone is rejected — your sources must justify the *category* (why this kind of product helps the gardener), drawn from cooperative-extension publications, peer-reviewed research, or first-hand observation. The SKU is a recommendation against the cited justification; the citation is not about the SKU.
4. **Use the placeholder `{tag}` in the `url_template`.** The validator rejects any real affiliate tag in committed YAML. Per-deployment tags are configured via env vars (`SPROUTKIT_AMAZON_TAG`, `SPROUTKIT_TRUELEAF_TAG`).
5. **Do NOT include price, rating, image URL, or any other cached marketplace metadata.** Amazon's Operating Agreement forbids offline caching of those fields beyond 24 hours, and they don't belong in a git-tracked dataset. The schema's `.strict()` mode blocks them; don't add them in any future schema change either.
6. **Tag the product against the controlled vocabulary** in `packages/schema/src/tags.ts`. Tag-overlap is how the recommender matches products to plant/playbook context. If your product needs a tag that doesn't exist, propose the tag in a separate `chore(schema)` PR first.
7. Open the product PR with the title `feat(data): add <slug>` and describe (a) the intent the SKU serves and (b) why your sources justify the category.

### FTC disclosure

The MCP server attaches disclosure automatically: a tail text block on any tool response that includes recommendations, plus `_meta.sproutkit.has_affiliate_links: true`, plus a server-level `instructions` field that names the affiliate program(s). Contributors don't need to add per-product disclosure strings — the systemic envelope handles it.

### Forks and affiliate revenue

If you fork SproutKit, you may configure your own affiliate tags in your deployment — the catalog is CC-BY-SA, the tag is per-deployment, and that's intentional. Brand reservation is covered in [TRADEMARK.md](./TRADEMARK.md): you may use the data and code, you may not ship under the SproutKit name.

## Licensing

Code contributions are licensed MIT. Data contributions are licensed CC-BY-SA 4.0. The SproutKit name is reserved — see [TRADEMARK.md](./TRADEMARK.md). By opening a PR you agree to release your change under the relevant license.

## Code of conduct

Be kind, assume good faith, debate the substance not the person. Issues that veer into personal attacks will be closed.
