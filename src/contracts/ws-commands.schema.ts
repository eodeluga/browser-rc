import { z } from 'zod'

const artifactScreenshotCommandSchema = z.object({
  command: z.literal('artifact.screenshot'),
  fullPage: z.boolean().optional(),
  requestId: z.string().min(1).optional(),
  sessionId: z.string().min(1),
})

const elementClickCommandSchema = z.object({
  command: z.literal('element.click'),
  requestId: z.string().min(1).optional(),
  selector: z.string().min(1),
  sessionId: z.string().min(1),
})

const elementTypeCommandSchema = z.object({
  clearFirst: z.boolean().optional(),
  command: z.literal('element.type'),
  requestId: z.string().min(1).optional(),
  selector: z.string().min(1),
  sessionId: z.string().min(1),
  text: z.string(),
})

const pageGotoCommandSchema = z.object({
  command: z.literal('page.goto'),
  requestId: z.string().min(1).optional(),
  sessionId: z.string().min(1),
  url: z.string().url(),
})

const pageSnapshotCommandSchema = z.object({
  command: z.literal('page.snapshot'),
  requestId: z.string().min(1).optional(),
  sessionId: z.string().min(1),
})

const sessionAttachCommandSchema = z.object({
  command: z.literal('session.attach'),
  controllerId: z.string().min(1).optional(),
  requestId: z.string().min(1).optional(),
  sessionId: z.string().min(1),
})

const sessionCloseCommandSchema = z.object({
  command: z.literal('session.close'),
  requestId: z.string().min(1).optional(),
  sessionId: z.string().min(1),
})

const wsCommandSchema = z.discriminatedUnion('command', [
  artifactScreenshotCommandSchema,
  elementClickCommandSchema,
  elementTypeCommandSchema,
  pageGotoCommandSchema,
  pageSnapshotCommandSchema,
  sessionAttachCommandSchema,
  sessionCloseCommandSchema,
])

type ArtifactScreenshotCommand = z.infer<typeof artifactScreenshotCommandSchema>
type ElementClickCommand = z.infer<typeof elementClickCommandSchema>
type ElementTypeCommand = z.infer<typeof elementTypeCommandSchema>
type PageGotoCommand = z.infer<typeof pageGotoCommandSchema>
type PageSnapshotCommand = z.infer<typeof pageSnapshotCommandSchema>
type SessionAttachCommand = z.infer<typeof sessionAttachCommandSchema>
type SessionCloseCommand = z.infer<typeof sessionCloseCommandSchema>
type WsCommand = z.infer<typeof wsCommandSchema>

export {
  artifactScreenshotCommandSchema,
  elementClickCommandSchema,
  elementTypeCommandSchema,
  pageGotoCommandSchema,
  pageSnapshotCommandSchema,
  sessionAttachCommandSchema,
  sessionCloseCommandSchema,
  wsCommandSchema,
  type ArtifactScreenshotCommand,
  type ElementClickCommand,
  type ElementTypeCommand,
  type PageGotoCommand,
  type PageSnapshotCommand,
  type SessionAttachCommand,
  type SessionCloseCommand,
  type WsCommand,
}
