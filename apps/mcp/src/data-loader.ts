/**
 * Walks the configured data directories once at startup, validates every YAML
 * with the matching schema, and returns an in-memory index. Fails loudly on
 * any invalid file — bad data is a bug, not a "skip it" case.
 *
 * Data layout under the resolved root:
 *   <root>/plants/*.yaml    → PlantSchema → PlantIndex
 *   <root>/products/*.yaml  → ProductSchema → Product[]
 *
 * For back-compat with the pre-products v0.1, SPROUTKIT_DATA_DIR may still
 * point directly at a plants directory; we detect that shape and treat its
 * parent as the data root.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PlantSchema,
  PlaybookSchema,
  ProductSchema,
  type Plant,
  type Playbook,
  type Product,
} from '@sproutkit/schema';
import { parse as parseYaml } from 'yaml';
import type { ZodTypeAny } from 'zod';

import type { PlaybookIndex } from './tools/get-playbook.js';

export type PlantIndex = {
  bySlug: Map<string, Plant>;
  byName: Map<string, Plant>; // lower-cased common_name OR scientific_name
  all: Plant[];
};

export type SproutkitDataset = {
  plants: PlantIndex;
  products: Product[];
  playbooks: PlaybookIndex;
  dataRoot: string;
};

async function isDir(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

export async function resolveDataRoot(): Promise<string> {
  if (process.env.SPROUTKIT_DATA_ROOT) {
    return resolve(process.env.SPROUTKIT_DATA_ROOT);
  }
  if (process.env.SPROUTKIT_DATA_DIR) {
    const p = resolve(process.env.SPROUTKIT_DATA_DIR);
    // Back-compat: if DATA_DIR points directly at a 'plants' dir, use its parent.
    if (basename(p) === 'plants' && (await isDir(p))) {
      return dirname(p);
    }
    return p;
  }
  // Resolve relative to this file: apps/mcp/src/data-loader.ts → repo root /data
  const here = fileURLToPath(new URL('.', import.meta.url));
  return resolve(here, '..', '..', '..', 'data');
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

async function parseAndValidate<T>(
  file: string,
  schema: ZodTypeAny,
): Promise<T> {
  const raw = await readFile(file, 'utf8');
  let doc: unknown;
  try {
    doc = parseYaml(raw);
  } catch (e) {
    throw new Error(`${file}: YAML parse error: ${(e as Error).message}`);
  }
  const parsed = schema.safeParse(doc);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `    • ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new Error(`${file}: failed schema validation\n${issues}`);
  }
  return parsed.data as T;
}

async function loadPlants(plantsDir: string): Promise<PlantIndex> {
  const yamls = await listYamls(plantsDir);
  if (yamls.length === 0) {
    throw new Error(`No plant YAMLs found in ${plantsDir}`);
  }

  const bySlug = new Map<string, Plant>();
  const byName = new Map<string, Plant>();
  const all: Plant[] = [];

  for (const file of yamls) {
    const plant = await parseAndValidate<Plant>(join(plantsDir, file), PlantSchema);
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

async function loadProducts(productsDir: string): Promise<Product[]> {
  const yamls = await listYamls(productsDir);
  const out: Product[] = [];
  const seen = new Set<string>();
  for (const file of yamls) {
    const product = await parseAndValidate<Product>(
      join(productsDir, file),
      ProductSchema,
    );
    if (seen.has(product.slug)) {
      throw new Error(`${file}: duplicate product slug "${product.slug}"`);
    }
    seen.add(product.slug);
    out.push(product);
  }
  return out;
}

async function loadPlaybooks(
  playbooksDir: string,
  knownProductSlugs: Set<string>,
  knownPlantSlugs: Set<string>,
): Promise<PlaybookIndex> {
  const yamls = await listYamls(playbooksDir);
  const bySlug = new Map<string, Playbook>();
  const all: Playbook[] = [];
  for (const file of yamls) {
    const pb = await parseAndValidate<Playbook>(join(playbooksDir, file), PlaybookSchema);
    if (bySlug.has(pb.slug)) {
      throw new Error(`${file}: duplicate playbook slug "${pb.slug}"`);
    }
    // Fail loud on broken cross-references — the validator catches this in CI
    // too, but a runtime check protects against partial / unsynced datasets.
    for (const slug of pb.recommended_products) {
      if (!knownProductSlugs.has(slug)) {
        throw new Error(`${file}: recommended_products references unknown product "${slug}"`);
      }
    }
    for (const slug of pb.related_plant_slugs) {
      if (!knownPlantSlugs.has(slug)) {
        throw new Error(`${file}: related_plant_slugs references unknown plant "${slug}"`);
      }
    }
    bySlug.set(pb.slug, pb);
    all.push(pb);
  }
  return { bySlug, all };
}

export async function loadDataset(dataRoot: string): Promise<SproutkitDataset> {
  const plants = await loadPlants(join(dataRoot, 'plants'));
  const products = await loadProducts(join(dataRoot, 'products'));
  const playbooks = await loadPlaybooks(
    join(dataRoot, 'playbooks'),
    new Set(products.map((p) => p.slug)),
    new Set(plants.all.map((p) => p.slug)),
  );
  return { plants, products, playbooks, dataRoot };
}
