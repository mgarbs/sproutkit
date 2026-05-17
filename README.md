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
├─ apps/mcp/             MCP server (stdio) exposing tools to AI clients
├─ packages/schema/      Zod schemas — the source of truth for plant data
├─ data/plants/          Hand-curated YAML plant entries (CC-BY-SA 4.0)
├─ scripts/              Validators and smoke tests
└─ .github/workflows/    CI: typecheck + schema validation
```

## Licensing

Two-license split:

- **Code** — MIT. See [LICENSE](./LICENSE).
- **Data** (`data/**`) — Creative Commons Attribution-ShareAlike 4.0 (CC-BY-SA 4.0). Reusing or redistributing the dataset requires attribution and share-alike.

Mixing these in one repo is deliberate — code wants permissive reuse, data wants to stay open and citable.

## Contributing

We want every fact in the dataset to cite a source, and every PR to be one small, reviewable change. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the rules and the workflow.

## License

MIT (code) + CC-BY-SA 4.0 (data). See [LICENSE](./LICENSE).
