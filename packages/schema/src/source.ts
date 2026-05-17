import { z } from 'zod';

export const SourceSchema = z.object({
  kind: z.enum(['extension', 'book', 'paper', 'observation']),
  title: z.string().min(1),
  url: z.string().url().optional(),
  publisher: z.string().optional(),
  year: z.number().int().min(1800).max(2100).optional(),
}).refine(
  (s) => s.kind === 'observation' || typeof s.url === 'string',
  { message: 'non-observation sources must include a stable url' },
);

export type Source = z.infer<typeof SourceSchema>;
