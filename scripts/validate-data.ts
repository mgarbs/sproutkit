#!/usr/bin/env tsx
/**
 * Walks data/plants/*.yaml, parses each file, validates it against PlantSchema,
 * and exits non-zero if any file is invalid. Used both locally and in CI.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';
import { ZodError } from 'zod';

import { PlantSchema } from '../packages/schema/src/index.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const dataDir = process.env.SPROUTKIT_DATA_DIR
  ? resolve(process.env.SPROUTKIT_DATA_DIR)
  : resolve(here, '..', 'data', 'plants');

function formatZodError(file: string, err: ZodError): string {
  const lines = err.issues.map((i) => `    • ${i.path.join('.') || '<root>'}: ${i.message}`);
  return `✗ ${file}\n${lines.join('\n')}`;
}

async function main(): Promise<void> {
  const entries = await readdir(dataDir);
  const yamls = entries.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort();

  if (yamls.length === 0) {
    console.error(`No YAML files found in ${dataDir}`);
    process.exit(1);
  }

  const failures: string[] = [];
  const seenSlugs = new Map<string, string>();

  for (const file of yamls) {
    const full = join(dataDir, file);
    let raw: string;
    try {
      raw = await readFile(full, 'utf8');
    } catch (e) {
      failures.push(`✗ ${file}\n    • could not read file: ${(e as Error).message}`);
      continue;
    }

    let doc: unknown;
    try {
      doc = parseYaml(raw);
    } catch (e) {
      failures.push(`✗ ${file}\n    • YAML parse error: ${(e as Error).message}`);
      continue;
    }

    const parsed = PlantSchema.safeParse(doc);
    if (!parsed.success) {
      failures.push(formatZodError(file, parsed.error));
      continue;
    }

    const prior = seenSlugs.get(parsed.data.slug);
    if (prior) {
      failures.push(`✗ ${file}\n    • duplicate slug "${parsed.data.slug}" (also in ${prior})`);
      continue;
    }
    seenSlugs.set(parsed.data.slug, file);
  }

  if (failures.length > 0) {
    console.error(failures.join('\n\n'));
    console.error(`\n✗ ${failures.length}/${yamls.length} plant file(s) invalid`);
    process.exit(1);
  }

  console.log(`✓ ${yamls.length}/${yamls.length} plants valid`);
}

main().catch((e) => {
  console.error('validate-data crashed:', e);
  process.exit(2);
});
