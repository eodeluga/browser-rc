import { z } from 'zod'

const extractionModeSchema = z.enum([
  'list',
  'object',
])

const normalisationHintsSchema = z.object({
  collapseWhitespace: z.boolean().optional(),
  lowercase: z.boolean().optional(),
  trim: z.boolean().optional(),
})

const extractionFieldSchema = z.object({
  all: z.boolean().optional(),
  attribute: z.string().min(1).optional(),
  normalisation: normalisationHintsSchema.optional(),
  selector: z.string().min(1),
})

const listExtractionRequestSchema = z.object({
  fields: z.record(z.string(), extractionFieldSchema),
  itemSelector: z.string().min(1),
  mode: z.literal('list'),
})

const objectExtractionRequestSchema = z.object({
  fields: z.record(z.string(), extractionFieldSchema),
  mode: z.literal('object'),
})

const extractionRequestSchema = z.union([
  listExtractionRequestSchema,
  objectExtractionRequestSchema,
])

const outputFieldTypeSchema = z.enum([
  'boolean',
  'number',
  'string',
])

const outputValidationSchema = z.record(z.string(), outputFieldTypeSchema)

type ExtractionField = z.infer<typeof extractionFieldSchema>
type ExtractionMode = z.infer<typeof extractionModeSchema>
type ExtractionRequest = z.infer<typeof extractionRequestSchema>
type ListExtractionRequest = z.infer<typeof listExtractionRequestSchema>
type NormalisationHints = z.infer<typeof normalisationHintsSchema>
type ObjectExtractionRequest = z.infer<typeof objectExtractionRequestSchema>
type OutputFieldType = z.infer<typeof outputFieldTypeSchema>
type OutputValidation = z.infer<typeof outputValidationSchema>

export {
  extractionFieldSchema,
  extractionModeSchema,
  extractionRequestSchema,
  listExtractionRequestSchema,
  normalisationHintsSchema,
  objectExtractionRequestSchema,
  outputFieldTypeSchema,
  outputValidationSchema,
  type ExtractionField,
  type ExtractionMode,
  type ExtractionRequest,
  type ListExtractionRequest,
  type NormalisationHints,
  type ObjectExtractionRequest,
  type OutputFieldType,
  type OutputValidation,
}
