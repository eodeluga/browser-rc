import { z } from 'zod'

const wsEventNameSchema = z.enum([
  'action.completed',
  'action.started',
  'artifact.created',
  'error',
  'page.navigated',
  'session.attached',
  'session.created',
])

const wsEventSchema = z.object({
  data: z.unknown().optional(),
  error: z.string().nullable(),
  event: wsEventNameSchema,
  ok: z.boolean(),
  requestId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  timestamp: z.string().datetime(),
})

type WsEvent = z.infer<typeof wsEventSchema>
type WsEventName = z.infer<typeof wsEventNameSchema>

export {
  wsEventNameSchema,
  wsEventSchema,
  type WsEvent,
  type WsEventName,
}
