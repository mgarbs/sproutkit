#!/usr/bin/env tsx
/**
 * Walks the data/ directory, validating every YAML file against the right
 * schema for its subdirectory. Exits non-zero if any file is invalid or any
 * cross-reference (e.g. a playbook's recommended_products) is broken.
 *
 * Today: data/plants/* → PlantSchema; data/products/* → ProductSchema;
 *        data/playbooks/* → PlaybookSchema + recommended_products xref.
 * Adding a new entity type means adding one row to ENTITY_KINDS below.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';
import type { ZodError, ZodTypeAny } from 'zod';

import {
  PlantSchema,
  PlaybookSchema,
  ProductSchema,
  type Playbook,
} from '../packages/schema/src/index.js';

type EntityKind = {
  label: string;
  dir: string;
  schema: ZodTypeAny;
  required: boolean;
};

const here = fileURLToPath(new URL('.', import.meta.url));
const dataRoot = process.env.SPROUTKIT_DATA_ROOT
  ? resolve(process.env.SPROUTKIT_DATA_ROOT)
  : resolve(here, '..', 'data');

const ENTITY_KINDS: EntityKind[] = [
  { label: 'plant', dir: 'plants', schema: PlantSchema, required: true },
  { label: 'product', dir: 'products', schema: ProductSchema, required: false },
  { label: 'playbook', dir: 'playbooks', schema: PlaybookSchema, required: false },
];

function formatZodError(file: string, err: ZodError): string {
  const lines = err.issues.map(
    (i) => `    • ${i.path.join('.') || '<root>'}: ${i.message}`,
  );
  return `✗ ${file}\n${lines.join('\n')}`;
}

async function listYamls(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

type KindResult = {
  failures: string[];
  total: number;
  parsed: Map<string, { display: string; data: unknown }>;
};

async function validateKind(kind: EntityKind): Promise<KindResult> {
  const dir = join(dataRoot, kind.dir);
  const yamls = await listYamls(dir);
  const parsed = new Map<string, { display: string; data: unknown }>();

  if (yamls.length === 0) {
    if (kind.required) {
      return { failures: [`✗ no ${kind.label} files found in ${dir}`], total: 0, parsed };
    }
    return { failures: [], total: 0, parsed };
  }

  const failures: string[] = [];

  for (const file of yamls) {
    const full = join(dir, file);
    const display = `${kind.dir}/${file}`;
    let raw: string;
    try {
      raw = await readFile(full, 'utf8');
    } catch (e) {
      failures.push(`✗ ${display}\n    • could not read file: ${(e as Error).message}`);
      continue;
    }

    let doc: unknown;
    try {
      doc = parseYaml(raw);
    } catch (e) {
      failures.push(`✗ ${display}\n    • YAML parse error: ${(e as Error).message}`);
      continue;
    }

    const result = kind.schema.safeParse(doc);
    if (!result.success) {
      failures.push(formatZodError(display, result.error));
      continue;
    }

    const slug = (result.data as { slug: string }).slug;
    const prior = parsed.get(slug);
    if (prior) {
      failures.push(`✗ ${display}\n    • duplicate slug "${slug}" (also in ${prior.display})`);
      continue;
    }
    parsed.set(slug, { display, data: result.data });
  }

  return { failures, total: yamls.length, parsed };
}

function xrefPlaybooks(
  playbooks: Map<string, { display: string; data: unknown }>,
  productSlugs: Set<string>,
  plantSlugs: Set<string>,
): string[] {
  const failures: string[] = [];
  for (const [, entry] of playbooks) {
    const pb = entry.data as Playbook;
    for (const slug of pb.recommended_products) {
      if (!productSlugs.has(slug)) {
        failures.push(
          `✗ ${entry.display}\n    • recommended_products references unknown product "${slug}" (no data/products/${slug}.yaml)`,
        );
      }
    }
    for (const slug of pb.related_plant_slugs) {
      if (!plantSlugs.has(slug)) {
        failures.push(
          `✗ ${entry.display}\n    • related_plant_slugs references unknown plant "${slug}" (no data/plants/${slug}.yaml)`,
        );
      }
    }
  }
  return failures;
}

async function main(): Promise<void> {
  let totalFailures = 0;
  const allErrors: string[] = [];
  const byKind = new Map<string, KindResult>();

  for (const kind of ENTITY_KINDS) {
    const result = await validateKind(kind);
    byKind.set(kind.label, result);
    if (result.failures.length > 0) {
      allErrors.push(...result.failures);
      totalFailures += result.failures.length;
    }
    if (result.total > 0) {
      const ok = result.total - result.failures.length;
      console.log(`${result.failures.length === 0 ? '✓' : '✗'} ${ok}/${result.total} ${kind.label}s valid`);
    } else if (!kind.required) {
      console.log(`· no ${kind.label}s found (skipped)`);
    }
  }

  const playbooks = byKind.get('playbook');
  if (playbooks && playbooks.parsed.size > 0) {
    const productSlugs = new Set(byKind.get('product')?.parsed.keys() ?? []);
    const plantSlugs = new Set(byKind.get('plant')?.parsed.keys() ?? []);
    const xrefFailures = xrefPlaybooks(playbooks.parsed, productSlugs, plantSlugs);
    if (xrefFailures.length > 0) {
      allErrors.push(...xrefFailures);
      totalFailures += xrefFailures.length;
      console.log(`✗ ${xrefFailures.length} playbook cross-reference(s) broken`);
    } else {
      console.log(`✓ playbook cross-references OK`);
    }
  }

  if (allErrors.length > 0) {
    console.error('\n' + allErrors.join('\n\n'));
    console.error(`\n✗ ${totalFailures} issue(s) total`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('validate-data crashed:', e);
  process.exit(2);
});
