# @sproutkit/mcp

The AI-facing surface of SproutKit. A Model Context Protocol server that loads the curated plant dataset from `data/plants/` and exposes it to MCP clients (Claude Desktop, `mcp-cli`, custom clients) over stdio JSON-RPC.

## Tools exposed

| Tool | Description |
|---|---|
| `get_plant` | Look up a single plant by `slug` or by `name` (common or scientific, case-insensitive). Returns the full validated plant record, or a structured `not_found` result with the 3 closest candidates. |

More tools (`find_plants`, `companion_check`, `seasonal_calendar`, `get_playbook`) are in the [roadmap](../../ROADMAP.md).

## Run locally

From the repo root:

```bash
pnpm install
pnpm --filter @sproutkit/mcp dev
```

The server logs to stderr (`[sproutkit] loaded 10 plants ...` then `[sproutkit] connected on stdio`) and serves JSON-RPC on stdout. It does nothing visible until an MCP client connects.

## Smoke test

```bash
pnpm --filter @sproutkit/mcp smoke
```

Spawns the server in a subprocess, connects via `@modelcontextprotocol/sdk` stdio client, and asserts three lookup cases (slug hit, common-name hit, not-found with candidates). Use this to verify the end-to-end pipeline after any change to the server, tool, or data loader.

## Wire it into Claude Desktop

Add this block to `claude_desktop_config.json` (path is `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows). Replace `/absolute/path/to/sproutkit` with the path where you cloned this repo.

```json
{
  "mcpServers": {
    "sproutkit": {
      "command": "pnpm",
      "args": [
        "--filter",
        "@sproutkit/mcp",
        "dev"
      ],
      "cwd": "/absolute/path/to/sproutkit"
    }
  }
}
```

Restart Claude Desktop after editing the file. Once connected you can ask things like *"use sproutkit to look up brandywine tomato"* and the model will call `get_plant`.

### Configuring affiliate recommendations (self-hosters)

SproutKit's MCP server surfaces affiliate product recommendations when the answering tool's intent implies a purchase. Tag configuration:

| Env var | Network | Default | Where to get a tag |
|---|---|---|---|
| `SPROUTKIT_AMAZON_TAG` | Amazon Associates | `sproutkit-20` (canonical project tag) | https://affiliate-program.amazon.com — your tracking ID, e.g. `yourname-20` |
| `SPROUTKIT_TRUELEAF_TAG` | True Leaf Market | *(none — unset = skipped)* | https://www.trueleafmarket.com/pages/affiliate-program |
| `SPROUTKIT_DISABLE_RECOMMENDATIONS` | (kill switch) | unset | Set to `1` to disable all affiliate output regardless of other config |

The server reads these once at startup. The canonical Amazon default ensures the SproutKit project's hosted deployment "just works" without env-var setup; **forks running their own deployment should set `SPROUTKIT_AMAZON_TAG` (and `SPROUTKIT_TRUELEAF_TAG`) to their own Associates IDs**, otherwise commissions accrue to the upstream project. The kill switch always wins.

If a network is unconfigured, products that depend solely on it are skipped silently.

**The dataset never contains a real tag.** Product YAMLs use the `{tag}` placeholder in their `url_template`, and the validator rejects any literal tag string. This is what makes the catalog forkable: anyone running their own SproutKit gets the same products with their own affiliate IDs substituted.

For the full disclosure policy see the MCP resource at `sproutkit://policy/affiliate-disclosure`, exposed by the server itself.

### Pointing at a different dataset

Override with `SPROUTKIT_DATA_ROOT` (preferred) pointing at a directory containing `plants/` and `products/` subdirs. `SPROUTKIT_DATA_DIR` is still honored for back-compat — if it points directly at a `plants/` directory, the server uses its parent as the root.

```json
{
  "mcpServers": {
    "sproutkit": {
      "command": "pnpm",
      "args": ["--filter", "@sproutkit/mcp", "dev"],
      "cwd": "/absolute/path/to/sproutkit",
      "env": {
        "SPROUTKIT_AMAZON_TAG": "yourname-20",
        "SPROUTKIT_TRUELEAF_TAG": "yourname",
        "SPROUTKIT_DATA_ROOT": "/absolute/path/to/my-data"
      }
    }
  }
}
```

## Layout

```
apps/mcp/
├─ src/
│  ├─ index.ts               server bootstrap, stdio transport, tool + resource registry
│  ├─ data-loader.ts         walks <SPROUTKIT_DATA_ROOT>/{plants,products}/*.yaml,
│  │                         validates every entry, fails loudly on bad data
│  ├─ runtime/
│  │  ├─ envelope.ts         SDK-native envelope (content + structuredContent + _meta)
│  │  ├─ register.ts         registerSproutkitTool — systemic chokepoint every tool uses
│  │  └─ resources.ts        sproutkit://policy/affiliate-disclosure + server instructions
│  └─ tools/
│     └─ get-plant.ts        slug/name lookup + Levenshtein candidates on miss
└─ scripts/
   ├─ smoke-get-plant.ts     end-to-end MCP client/server smoke test
   └─ test-envelope-contract.ts  asserts every registered tool conforms to envelope shape
```
