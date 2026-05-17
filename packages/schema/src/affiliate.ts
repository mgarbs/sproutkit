import { z } from 'zod';

/**
 * Affiliate networks SproutKit currently supports.
 *
 * Adding a new network requires:
 *   1. A new entry here.
 *   2. A new env-var key in NETWORK_ENV_VARS below.
 *   3. A line in TRADEMARK/CONTRIBUTING noting program terms.
 */
export const AffiliateNetworkSchema = z.enum(['amazon', 'true-leaf-market']);
export type AffiliateNetwork = z.infer<typeof AffiliateNetworkSchema>;

export const AffiliateTargetSchema = z.object({
  network: AffiliateNetworkSchema,
  sku: z.string().min(1),
  url_template: z
    .string()
    .url()
    .refine((u) => u.includes('{tag}'), {
      message: 'url_template must contain the literal {tag} placeholder so deployments can substitute their own affiliate id',
    }),
}).strict();

export type AffiliateTarget = z.infer<typeof AffiliateTargetSchema>;

/**
 * Per-deployment configuration. Reads env vars; never touches the dataset.
 *
 * If a network has no configured tag, products whose only available
 * targets need that network are skipped. If no networks are configured
 * at all, recommendations are disabled entirely.
 */
const NETWORK_ENV_VARS: Record<AffiliateNetwork, string> = {
  amazon: 'SPROUTKIT_AMAZON_TAG',
  'true-leaf-market': 'SPROUTKIT_TRUELEAF_TAG',
};

export type AffiliateConfig = {
  tags: Partial<Record<AffiliateNetwork, string>>;
  disabled: boolean;
  configuredNetworks: AffiliateNetwork[];
  unconfiguredNetworks: AffiliateNetwork[];
};

export function loadAffiliateConfig(env: NodeJS.ProcessEnv = process.env): AffiliateConfig {
  if (env.SPROUTKIT_DISABLE_RECOMMENDATIONS === '1') {
    return {
      tags: {},
      disabled: true,
      configuredNetworks: [],
      unconfiguredNetworks: AffiliateNetworkSchema.options,
    };
  }

  const tags: Partial<Record<AffiliateNetwork, string>> = {};
  const configured: AffiliateNetwork[] = [];
  const unconfigured: AffiliateNetwork[] = [];

  for (const network of AffiliateNetworkSchema.options) {
    const envKey = NETWORK_ENV_VARS[network];
    const value = env[envKey];
    if (value && value.length > 0) {
      tags[network] = value;
      configured.push(network);
    } else {
      unconfigured.push(network);
    }
  }

  return {
    tags,
    disabled: configured.length === 0,
    configuredNetworks: configured,
    unconfiguredNetworks: unconfigured,
  };
}

/**
 * Substitute the deployment's affiliate tag into a product's url_template.
 * Returns null if the network is not configured.
 */
export function buildAffiliateUrl(
  target: AffiliateTarget,
  cfg: AffiliateConfig,
): string | null {
  const tag = cfg.tags[target.network];
  if (!tag) return null;
  return target.url_template.replace('{tag}', encodeURIComponent(tag));
}
