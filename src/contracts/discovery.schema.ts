import { z } from 'zod'

import { pageSnapshotSchema } from './page.schema.js'

const discoveryOptionsSchema = z.object({
  includeInteractiveElements: z.boolean().optional(),
  includeRepeatedContent: z.boolean().optional(),
  includeSummary: z.boolean().optional(),
})

const interactiveElementSchema = z.object({
  ariaLabel: z.string().nullable(),
  id: z.string().nullable(),
  index: z.number().int().nonnegative(),
  role: z.string().nullable(),
  selector: z.string(),
  tagName: z.string(),
  text: z.string(),
  type: z.string().nullable(),
})

const repeatedContentGroupSchema = z.object({
  containerSelector: z.string(),
  count: z.number().int().nonnegative(),
  sampleText: z.string(),
  signature: z.string(),
})

const pageSummarySchema = z.object({
  headingCount: z.number().int().nonnegative(),
  headings: z.string().array(),
  interactiveElementCount: z.number().int().nonnegative(),
  linkCount: z.number().int().nonnegative(),
  paragraphCount: z.number().int().nonnegative(),
  title: z.string(),
  url: z.string().url(),
  wordCount: z.number().int().nonnegative(),
})

const discoveryResultSchema = z.object({
  interactiveElements: z.array(interactiveElementSchema),
  repeatedContentGroups: z.array(repeatedContentGroupSchema),
  snapshot: pageSnapshotSchema,
  summary: pageSummarySchema,
})

type DiscoveryOptions = z.infer<typeof discoveryOptionsSchema>
type DiscoveryResult = z.infer<typeof discoveryResultSchema>
type InteractiveElement = z.infer<typeof interactiveElementSchema>
type PageSummary = z.infer<typeof pageSummarySchema>
type RepeatedContentGroup = z.infer<typeof repeatedContentGroupSchema>

export {
  discoveryOptionsSchema,
  discoveryResultSchema,
  interactiveElementSchema,
  pageSummarySchema,
  repeatedContentGroupSchema,
  type DiscoveryOptions,
  type DiscoveryResult,
  type InteractiveElement,
  type PageSummary,
  type RepeatedContentGroup,
}
