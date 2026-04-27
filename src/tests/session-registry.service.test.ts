import assert from 'node:assert/strict'
import test from 'node:test'

import { SessionRegistryService } from '../sessions/session-registry.service.js'

test('SessionRegistryService markClosed removes closed sessions from the active list', () => {
  const sessionRegistryService = new SessionRegistryService()
  const createdSession = sessionRegistryService.create('page-1', 'https://example.com')

  const closedSession = sessionRegistryService.markClosed(createdSession.sessionId)

  assert.equal(closedSession?.sessionId, createdSession.sessionId)
  assert.equal(closedSession?.status, 'closed')
  assert.equal(sessionRegistryService.get(createdSession.sessionId), null)
  assert.equal(sessionRegistryService.list().length, 0)
})

test('SessionRegistryService markClosed returns null for unknown sessions', () => {
  const sessionRegistryService = new SessionRegistryService()
  const closedSession = sessionRegistryService.markClosed('missing-session')

  assert.equal(closedSession, null)
})
