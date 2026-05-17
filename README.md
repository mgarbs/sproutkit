# SproutKit

> An open, machine-readable gardening knowledge base — a hosted MCP server backed by a CC-BY-SA dataset that any AI client can call.

Gardening knowledge is fragmented across extension PDFs, regional forums, and proprietary apps. AI assistants give generic, often wrong advice ("should I plant tomatoes now in zone 6?") because they have nothing structured to query. SproutKit aims to be the canonical, source-cited substrate AI clients can ground on.

## Status

**P1 first slice** — a working MCP server exposing one tool (`get_plant`) over 10 hand-curated YAML plant entries, with schema validation in CI. This is the smallest end-to-end vertical that proves the data → schema → server → tool pipeline. See [ROADMAP.md](./ROADMAP.md) for what comes next.

## Quickstart

Requires Node 20+ and pnpm 10+.

```bash
pnpm install
pnpm validate:data            # validate all seed YAMLs against the schema
pnpm --filter @sproutkit/mcp dev   # boot the MCP server over stdio
```

To wire the server into Claude Desktop or another MCP client, see [apps/mcp/README.md](./apps/mcp/README.md).

## Layout

```
sproutkit/
├─ apps/mcp/                MCP server (stdio) exposing tools + resources to AI clients
├─ packages/schema/         Zod schemas — the source of truth for plant and product data
├─ packages/recommendations/  Intent-gated product matcher used by every tool
├─ data/plants/             Hand-curated YAML plant entries (CC-BY-SA 4.0)
├─ data/products/           Hand-curated affiliate product catalog (CC-BY-SA 4.0)
├─ scripts/                 Validators and smoke tests
└─ .github/workflows/       CI: typecheck + schema validation + envelope contract
```

## Affiliate model

Some tool responses include product recommendations whose links are affiliate links. SproutKit may earn a commission from purchases made through these links. The mechanism is **intent-gated** — informational lookups like `get_plant` never attach recommendations, only tools whose declared intent implies a purchase decision do. Every response flags itself via `_meta.sproutkit.has_affiliate_links`, and the canonical disclosure is served as an MCP resource at `sproutkit://policy/affiliate-disclosure`.

The product catalog is open data — anyone can fork SproutKit and run their own deployment with their own affiliate tags. See `apps/mcp/README.md` for self-hosting configuration. Brand name reservation is covered in [TRADEMARK.md](./TRADEMARK.md).

## Licensing

Three-layer split:

- **Code** — MIT. See [LICENSE](./LICENSE).
- **Data** (`data/**`) — Creative Commons Attribution-ShareAlike 4.0 (CC-BY-SA 4.0). Reusing or redistributing the dataset requires attribution and share-alike.
- **Name** — the SproutKit name is reserved. See [TRADEMARK.md](./TRADEMARK.md).

Mixing these in one repo is deliberate — code wants permissive reuse, data wants to stay open and citable, the name is the one thing that distinguishes the canonical project from forks.

## Contributing

We want every fact in the dataset to cite a source, and every PR to be one small, reviewable change. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the rules and the workflow.

## License

MIT (code) + CC-BY-SA 4.0 (data) + reserved name. See [LICENSE](./LICENSE) and [TRADEMARK.md](./TRADEMARK.md).
