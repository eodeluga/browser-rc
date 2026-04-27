import { z } from 'zod'

const pageSnapshotSchema = z.object({
  html: z.string(),
  title: z.string(),
  url: z.string().url(),
})

type PageSnapshot = z.infer<typeof pageSnapshotSchema>

export { pageSnapshotSchema, type PageSnapshot }
