# Roadmap

SproutKit is built in five phases. Each phase ships in small, independently reviewable PRs. The first slice of P1 (this PR) is the smallest end-to-end vertical: monorepo + schema + MCP server with one tool over 10 seed plants.

| Phase | Scope | Duration |
|---|---|---|
| **P1 first slice** *(shipped)* | Monorepo init, `@sproutkit/schema`, `get_plant` MCP tool, 10 seed plants, schema validation in CI. | — |
| **P1 rest** | `find_plants`, `companion_check`, `seasonal_calendar`, `get_playbook`. 40 more hand-curated plants + first 5 playbooks. Next.js website MVP (plant pages, contribute form). Magic-link auth (Auth.js + email provider). | 1–2 weeks |
| **P2 — Bootstrap** | Ingestors for **PFAF (Plants for a Future)** and **Wikidata** as primary seeds — both well-licensed and currently maintained. OpenFarm is deprioritized vs the original draft because the project is largely dormant; check data freshness before relying on it. Target 3,000 plants. Postgres mirror (`packages/db`) rebuilt from `data/` on deploy. Public review queue UI. | 2–3 weeks |
| **P3 — Quality loop** | `apps/reviewer` worker calling Claude via the Anthropic SDK with prompt caching. Submission queue → auto-merge / human-queue / reject by confidence + contributor reputation. Trust badges on facts. `submit_observation` + `propose_edit` tools. | 2 weeks |
| **P4 — Community** | Discord, regional ambassador program, first external maintainer, governance from BDFL → 3-person council. | Ongoing |
| **P5 — Coverage** | Pest/disease database, soil amendments, container/hydroponic playbooks. Plant photo ID is a separate sister project, not v1. | Quarter+ |

## Quality mechanisms (locked in for P1-rest onward)

1. Every fact cites a source — enforced by schema (already true).
2. AI pre-review flags implausibility against existing data (P3).
3. Observations convert anecdote into signal (P3).
4. Trust badges per fact: `verified` / `unverified` / `disputed` (P3).
5. Contributor reputation gates auto-merge (P3).
6. Public review queue distributes moderation (P2).
7. Git history is the audit log (true from this PR).

## Open questions

- Domain name — needs availability check (`sproutkit.dev`, `sproutkit.org`, `grow.directory`, `plot.garden`).
- OpenFarm data freshness — verify before P2 starts.
- Whether to include plant images at launch (storage + licensing cost) — defer to P2 decision.
- i18n — English-only at launch; schema already accommodates multi-name via `common_names: string[]`.
- Mobile app — out of scope; MCP + responsive web covers the surface.
