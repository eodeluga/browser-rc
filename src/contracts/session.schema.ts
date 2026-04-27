import { z } from 'zod'

const sessionStatusSchema = z.enum([
  'active',
  'closed',
])

const sessionSchema = z.object({
  activePageId: z.string().nullable(),
  attachedClientId: z.string().nullable(),
  createdAt: z.string().datetime(),
  currentUrl: z.string().nullable(),
  lastActivityAt: z.string().datetime(),
  sessionId: z.string().min(1),
  status: sessionStatusSchema,
})

type Session = z.infer<typeof sessionSchema>
type SessionStatus = z.infer<typeof sessionStatusSchema>

export { sessionSchema, sessionStatusSchema, type Session, type SessionStatus }
