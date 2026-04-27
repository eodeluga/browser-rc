import assert from 'node:assert/strict'
import test from 'node:test'

import { ExtractionService } from '../runtime/extraction.service.js'

test('ExtractionService validates object results against output schema', () => {
  const extractionService = new ExtractionService({
    browserManagerService: {
      getPage: () => {
        return null
      },
      touchSession: () => {
        return null
      },
    },
  })

  const result = extractionService.validateExtractedData({
    price: 4.99,
    title: 'Apples',
  }, {
    price: 'number',
    title: 'string',
  }, 'object')

  assert.equal(result.success, true)
})
