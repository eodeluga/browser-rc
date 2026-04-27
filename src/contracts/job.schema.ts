import { z } from 'zod'

import { discoveryOptionsSchema } from './discovery.schema.js'
import {
  extractionRequestSchema,
  normalisationHintsSchema,
  outputValidationSchema,
} from './extraction.schema.js'
import { resultSchema } from './result.schema.js'

const jobTypeSchema = z.enum([
  'extract',
])

const extractJobInputSchema = z.object({
  discovery: discoveryOptionsSchema.optional(),
  extraction: extractionRequestSchema.optional(),
  normalisationHints: normalisationHintsSchema.optional(),
  schema: outputValidationSchema.optional(),
  sessionId: z.string().min(1).optional(),
  takeScreenshot: z.boolean().optional(),
  url: z.string().url(),
})

const createJobRequestSchema = z.object({
  input: extractJobInputSchema,
  type: z.literal('extract'),
})

const jobStatusSchema = z.enum([
  'completed',
  'failed',
  'queued',
  'running',
])

const jobSchema = z.object({
  createdAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  jobId: z.string().min(1),
  result: resultSchema.optional(),
  status: jobStatusSchema,
  type: jobTypeSchema,
})

type CreateJobRequest = z.infer<typeof createJobRequestSchema>
type ExtractJobInput = z.infer<typeof extractJobInputSchema>
type Job = z.infer<typeof jobSchema>
type JobStatus = z.infer<typeof jobStatusSchema>
type JobType = z.infer<typeof jobTypeSchema>

export {
  createJobRequestSchema,
  extractJobInputSchema,
  jobSchema,
  jobStatusSchema,
  jobTypeSchema,
  type CreateJobRequest,
  type ExtractJobInput,
  type Job,
  type JobStatus,
  type JobType,
}
