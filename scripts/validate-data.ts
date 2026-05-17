#!/usr/bin/env tsx
/**
 * Walks the data/ directory, validating every YAML file against the right
 * schema for its subdirectory. Exits non-zero if any file is invalid.
 *
 * Today: data/plants/* → PlantSchema; data/products/* → ProductSchema.
 * Adding a new entity type means adding one row to ENTITY_KINDS below.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';
import type { ZodError, ZodTypeAny } from 'zod';

import { PlantSchema, ProductSchema } from '../packages/schema/src/index.js';

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

async function validateKind(kind: EntityKind): Promise<{ failures: string[]; total: number }> {
  const dir = join(dataRoot, kind.dir);
  const yamls = await listYamls(dir);

  if (yamls.length === 0) {
    if (kind.required) {
      return { failures: [`✗ no ${kind.label} files found in ${dir}`], total: 0 };
    }
    return { failures: [], total: 0 };
  }

  const failures: string[] = [];
  const seenSlugs = new Map<string, string>();

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

    const parsed = kind.schema.safeParse(doc);
    if (!parsed.success) {
      failures.push(formatZodError(display, parsed.error));
      continue;
    }

    const slug = (parsed.data as { slug: string }).slug;
    const prior = seenSlugs.get(slug);
    if (prior) {
      failures.push(`✗ ${display}\n    • duplicate slug "${slug}" (also in ${prior})`);
      continue;
    }
    seenSlugs.set(slug, display);
  }

  return { failures, total: yamls.length };
}

async function main(): Promise<void> {
  let totalFailures = 0;
  const allErrors: string[] = [];

  for (const kind of ENTITY_KINDS) {
    const { failures, total } = await validateKind(kind);
    if (failures.length > 0) {
      allErrors.push(...failures);
      totalFailures += failures.length;
    }
    if (total > 0) {
      const ok = total - failures.length;
      console.log(`${failures.length === 0 ? '✓' : '✗'} ${ok}/${total} ${kind.label}s valid`);
    } else if (!kind.required) {
      console.log(`· no ${kind.label}s found (skipped)`);
    }
  }

  if (allErrors.length > 0) {
    console.error('\n' + allErrors.join('\n\n'));
    console.error(`\n✗ ${totalFailures} file(s) invalid`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('validate-data crashed:', e);
  process.exit(2);
});
