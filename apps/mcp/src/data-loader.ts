/**
 * Walks the configured data directory once at startup, validates every YAML
 * with PlantSchema, and returns an in-memory index. Fails loudly on any
 * invalid file — bad data is a bug, not a "skip it" case.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PlantSchema, type Plant } from '@sproutkit/schema';
import { parse as parseYaml } from 'yaml';

export type PlantIndex = {
  bySlug: Map<string, Plant>;
  byName: Map<string, Plant>; // lower-cased common_name OR scientific_name
  all: Plant[];
};

export function resolveDefaultDataDir(): string {
  if (process.env.SPROUTKIT_DATA_DIR) {
    return resolve(process.env.SPROUTKIT_DATA_DIR);
  }
  // Resolve relative to this file: apps/mcp/src/data-loader.ts → repo root /data/plants
  const here = fileURLToPath(new URL('.', import.meta.url));
  return resolve(here, '..', '..', '..', 'data', 'plants');
}

export async function loadPlants(dataDir: string): Promise<PlantIndex> {
  const entries = await readdir(dataDir);
  const yamls = entries.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort();

  if (yamls.length === 0) {
    throw new Error(`No plant YAMLs found in ${dataDir}`);
  }

  const bySlug = new Map<string, Plant>();
  const byName = new Map<string, Plant>();
  const all: Plant[] = [];

  for (const file of yamls) {
    const full = join(dataDir, file);
    const raw = await readFile(full, 'utf8');

    let doc: unknown;
    try {
      doc = parseYaml(raw);
    } catch (e) {
      throw new Error(`${file}: YAML parse error: ${(e as Error).message}`);
    }

    const parsed = PlantSchema.safeParse(doc);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `    • ${i.path.join('.') || '<root>'}: ${i.message}`)
        .join('\n');
      throw new Error(`${file}: failed schema validation\n${issues}`);
    }

    const plant = parsed.data;
    if (bySlug.has(plant.slug)) {
      throw new Error(`${file}: duplicate slug "${plant.slug}"`);
    }
    bySlug.set(plant.slug, plant);
    byName.set(plant.scientific_name.toLowerCase(), plant);
    for (const name of plant.common_names) {
      byName.set(name.toLowerCase(), plant);
    }
    all.push(plant);
  }

  return { bySlug, byName, all };
}
