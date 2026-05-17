# SproutKit — pick-up-where-we-left-off notes

> This file is the contract between past-Claude and future-Claude. If you (Claude) are reading this in a new session, this is what was built, what's still loose, and what to do next. Read it end-to-end before touching anything.

Updated: 2026-05-17. Local working copy: `C:\Users\Admin\sproutkit`. GitHub: https://github.com/mgarbs/sproutkit. `gh` is authenticated as `mgarbs`. The user (Michael) signs off as `michaelegarber@gmail.com`.

## What exists right now (shipped to `main`)

**Tools exposed by the MCP server** (`apps/mcp/src/index.ts`):

| Tool | Intent | What it does | Affiliate? |
|---|---|---|---|
| `get_plant({ slug?, name? })` | `lookup` | Plant lookup over `data/plants/` (10 entries). Returns full validated record or not_found+candidates. | No (intent=lookup) |
| `get_playbook({ slug?, topic? })` | `playbook` | Curated how-to lookup over `data/playbooks/` (5 entries). Returns playbook + curated recommended products. | Yes — emits `ctx.explicit_product_slugs` from playbook |

**MCP resource**: `sproutkit://policy/affiliate-disclosure` (text/markdown).

**Systemic chokepoint** (`apps/mcp/src/runtime/`):
- `register.ts` — `registerSproutkitTool(server, def)` is the ONLY way to register a tool. It runs the recommender against `ctx`, wraps results in the SDK-native envelope, attaches `_meta.sproutkit`. Calling `server.registerTool` directly bypasses disclosure and the contract test will fail.
- `envelope.ts` — builds `{ content, structuredContent: { result, recommendations? }, _meta: { sproutkit: { version, has_affiliate_links, disclosure_uri } } }`. Recommendations are response-level, NEVER nested inside `result`.
- `resources.ts` — disclosure resource + `SERVER_INSTRUCTIONS` string (passed to `McpServer({ instructions })`).

**Schemas** (`packages/schema/src/`): `PlantSchema`, `ProductSchema`, `PlaybookSchema`, `AffiliateTargetSchema`, `PlantTagSchema` (controlled vocabulary), `SourceSchema`. All `.strict()`. Re-exported from `index.ts`.

**Recommender** (`packages/recommendations/src/matcher.ts`): pure function `recommend(ctx, catalog, cfg)`. Intent-gated:
- `'lookup'` → empty unless `explicit_product_slugs` provided
- `'product-adjacent'` → tag overlap, top 3
- `'purchase-implied'` → tag overlap, top 5
- `'playbook'` → curated `explicit_product_slugs` first, tag overlap fallback, cap 5

**Affiliate config**:
- `SPROUTKIT_AMAZON_TAG` → default `sproutkit-20` (set in `apps/mcp/src/index.ts:SPROUTKIT_AFFILIATE_DEFAULTS`)
- `SPROUTKIT_TRUELEAF_TAG` → no default (unconfigured products are skipped silently)
- `SPROUTKIT_DISABLE_RECOMMENDATIONS=1` → kill switch, always wins

**Data layout**:
- `data/plants/*.yaml` — 10 entries, each cites ≥2 cooperative-extension sources
- `data/products/*.yaml` — 8 entries (4 Amazon, 4 True Leaf Market), all SKUs are `ASIN-TBD-*` / `TLM-TBD-*` placeholders that need real verified IDs
- `data/playbooks/*.yaml` — 5 entries: raised-bed-build, container-tomatoes, fall-garlic, season-extension, drip-irrigation-setup. Each cites ≥2 extension sources.

**CI** (`.github/workflows/validate.yml`): typecheck + `pnpm validate:data` (with cross-reference checks) + envelope contract test on every push and PR. Green on `main`.

**Trust/brand**: MIT (code) + CC-BY-SA 4.0 (data) + `TRADEMARK.md` reserves the "SproutKit" name. Brand-protective so low-quality forks can't ship under our name.

## What's blocking actual revenue (user-side, can't be code-fixed)

1. **Placeholder SKUs in all 8 products**. URLs interpolate `sproutkit-20` correctly but the ASIN/SKU paths are fake. To make money you need to replace:
   - `data/products/*.yaml` `affiliate_targets[].sku` and `affiliate_targets[].url_template` paths
   - The 4 Amazon ones (`drip-irrigation-starter-kit`, `frost-cloth-row-cover`, `calcium-nitrate-fertilizer`, `raised-bed-cedar-4x8`) need real ASINs
   - The 4 True Leaf Market ones (`tomato-brandywine-seeds`, `basil-genovese-seeds`, `kale-lacinato-seeds`, `garlic-music-bulbs`) need real TLM product slugs + a working True Leaf affiliate account
   - User must supply these; agent should NOT invent ASINs

2. **True Leaf Market account.** No `SPROUTKIT_TRUELEAF_TAG` is set anywhere — the 4 TLM products are currently never returned even when matched. Either get a TLM affiliate ID or delete the TLM product YAMLs from `data/products/`.

3. **Hosting / public address.** Server only runs locally on stdio. To let other people connect, needs an HTTP/SSE transport + a deployment target (Cloudflare Workers, Fly.io, etc.). Not started.

4. **Claude Desktop config.** User needs to put the JSON snippet from `apps/mcp/README.md` into `%APPDATA%\Claude\claude_desktop_config.json` and restart. Then can ask "use sproutkit to give me a raised bed playbook" and get_playbook fires with the Amazon-tagged recommendations.

## What's left on the bigger plan

### P1-rest (next tools, each its own focused PR)

- [ ] `find_plants(filter)` — list plants matching `{ zone?, sun?, water?, category? }`. Intent='lookup' (no recs). Data already there. ~150 LoC PR.
- [ ] `companion_check({ a, b })` — pairwise companion compatibility from existing `companions.good`/`companions.bad` fields on plants. Intent='lookup'. ~100 LoC PR.
- [ ] `seasonal_calendar({ zone, month })` — what to start/transplant/harvest. Intent='product-adjacent' (will surface frost cloth in Sep–Oct etc). Needs zone→last-frost mapping data. ~250 LoC PR.
- [ ] 40 more hand-curated plants. Pure data work, multiple small PRs. Codex can help draft if invoked with the same prompt shape used for products/playbooks. Beware: codex tends to want to verify URLs with `web search` first; pass `< /dev/null` and it'll write the patch faster.
- [ ] Next.js website MVP at `apps/web/` — plant pages, contribute form. Auth.js magic link. Separate larger PR.

### P2 — Bootstrap (per ROADMAP.md, weeks 3–5 of the broader plan)

- [ ] Ingestors for **PFAF** (Plants for a Future) and **Wikidata** in `apps/ingest/`. Target: grow dataset to 3000 plants.
- [ ] Postgres mirror in `packages/db/` rebuilt from `data/` on deploy (queryable for the web MVP).
- [ ] Public review queue UI.
- [ ] SKU-rot CI job — weekly HEAD-check on every product's `affiliate_targets[].url_template` (with `{tag}` swapped for `test`), opens GitHub issue on 404s.

### P3 — Quality loop

- [ ] `apps/reviewer/` Claude-powered worker (Anthropic SDK with prompt caching). Auto-merge / human-queue / reject by confidence.
- [ ] Trust badges per fact (`verified` / `unverified` / `disputed`) — needs schema additions.
- [ ] `submit_observation` + `propose_edit` MCP tools.
- [ ] LLM-driven recommendation matching (replace pure tag-overlap with LLM scoring).

### P4 — Community

- [ ] Discord, regional ambassadors, first external maintainer, BDFL→3-person council.

### P5 — Coverage

- [ ] Pest/disease database, soil amendments, container/hydroponic playbooks.

## How to extend safely (cheat sheet for adding a new tool)

```ts
// apps/mcp/src/tools/<your-tool>.ts
export const yourToolInputShape = { /* zod fields */ } as const;
export function runYourTool(args, dataset): YourResult { /* pure */ }

// apps/mcp/src/index.ts
registerSproutkitTool(server, {
  name: 'your_tool',
  title: '...',
  description: '...',
  intent: 'lookup' | 'product-adjacent' | 'purchase-implied' | 'playbook',
  inputSchema: yourToolInputShape,
  handler: (args): SproutkitHandlerReturn<YourResult> => {
    const result = runYourTool(args, dataset);
    return {
      result,
      // Only relevant for non-lookup intents:
      ctx: { tags: [...], plant_slugs: [...], explicit_product_slugs: [...] },
    };
  },
});
```

Then add to `TOOL_INPUTS` in `apps/mcp/scripts/test-envelope-contract.ts` so CI covers it.

**Never call `server.registerTool` directly** — that's how disclosure gets accidentally omitted.

## Commit discipline (this is non-negotiable per user)

- Conventional Commits: `feat(scope):`, `fix(scope):`, `chore(scope):`, `docs(scope):`, `test(scope):`. Scopes: `schema`, `mcp`, `recommendations`, `data`, `ci`, `scripts`.
- One logical change per commit. If message needs "and", split.
- Data PRs separate from code PRs.
- Append-only — prefer follow-up commits over `git commit --amend` except for fixing the most recent local-only commit before push.
- PRs ≤ 400 LoC code (data + docs don't count).
- See [[feedback-commit-discipline]] memory.

## How to actually pick up work in a new session

1. Read this file end-to-end.
2. `cd C:\Users\Admin\sproutkit && git log --oneline -20` to confirm what's actually on `main`.
3. `pnpm install && pnpm typecheck && pnpm validate:data && pnpm --filter @sproutkit/mcp test:contract` — must all pass before changing anything.
4. Pick from "What's left on the bigger plan" above. The recommended next move is one of `find_plants` / `companion_check` / `seasonal_calendar` for breadth, or starting the website MVP if the user wants something user-facing.
5. Ask the user which one if it's not clear from their prompt — see the memory note about not over-asking, but architecture choices warrant clarification.
