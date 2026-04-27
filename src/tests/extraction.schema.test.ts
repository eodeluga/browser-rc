import assert from 'node:assert/strict'
import test from 'node:test'

import { extractionRequestSchema, outputValidationSchema } from '../contracts/extraction.schema.js'

test('extractionRequestSchema accepts object extraction requests', () => {
  const parsed = extractionRequestSchema.safeParse({
    fields: {
      price: {
        normalisation: {
          collapseWhitespace: true,
          trim: true,
        },
        selector: '.product-price',
      },
      title: {
        selector: 'h1',
      },
    },
    mode: 'object',
  })

  assert.equal(parsed.success, true)
})

test('outputValidationSchema accepts primitive field types', () => {
  const parsed = outputValidationSchema.safeParse({
    price: 'number',
    title: 'string',
  })

  assert.equal(parsed.success, true)
})
