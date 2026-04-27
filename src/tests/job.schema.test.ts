import assert from 'node:assert/strict'
import test from 'node:test'

import { createJobRequestSchema } from '../contracts/job.schema.js'

test('createJobRequestSchema accepts extract jobs', () => {
  const parsed = createJobRequestSchema.safeParse({
    input: {
      schema: {
        title: 'string',
      },
      url: 'https://example.com',
    },
    type: 'extract',
  })

  assert.equal(parsed.success, true)
})

test('createJobRequestSchema accepts declarative discovery and list extraction', () => {
  const parsed = createJobRequestSchema.safeParse({
    input: {
      discovery: {
        includeInteractiveElements: true,
        includeRepeatedContent: true,
        includeSummary: true,
      },
      extraction: {
        fields: {
          price: {
            selector: '.price',
          },
          title: {
            selector: '.title',
          },
        },
        itemSelector: '.product-card',
        mode: 'list',
      },
      normalisationHints: {
        collapseWhitespace: true,
        trim: true,
      },
      schema: {
        price: 'string',
        title: 'string',
      },
      takeScreenshot: true,
      url: 'https://example.com',
    },
    type: 'extract',
  })

  assert.equal(parsed.success, true)
})

test('createJobRequestSchema rejects unsupported output validation types', () => {
  const parsed = createJobRequestSchema.safeParse({
    input: {
      schema: {
        title: 'unsupported',
      },
      url: 'https://example.com',
    },
    type: 'extract',
  })

  assert.equal(parsed.success, false)
})
