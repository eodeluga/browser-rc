import { z } from 'zod'

const resultSchema = z.object({
  data: z.unknown().optional(),
  error: z.string().nullable(),
  ok: z.boolean(),
  timestamp: z.string().datetime(),
})

type Result<TData = unknown> = Omit<z.infer<typeof resultSchema>, 'data'> & {
  data?: TData
}

export { resultSchema, type Result }
