import { z } from 'zod'

import { createJobRequestSchema } from './job.schema.js'

const createSessionRequestSchema = z.object({
  url: z.string().url().optional(),
})

const gotoSessionRequestSchema = z.object({
  url: z.string().url(),
})

const screenshotSessionRequestSchema = z.object({
  fullPage: z.boolean().optional(),
})

type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>
type CreateJobRequest = z.infer<typeof createJobRequestSchema>
type GotoSessionRequest = z.infer<typeof gotoSessionRequestSchema>
type ScreenshotSessionRequest = z.infer<typeof screenshotSessionRequestSchema>

export {
  createJobRequestSchema,
  createSessionRequestSchema,
  gotoSessionRequestSchema,
  screenshotSessionRequestSchema,
  type CreateJobRequest,
  type CreateSessionRequest,
  type GotoSessionRequest,
  type ScreenshotSessionRequest,
}
