import assert from 'node:assert/strict'
import test from 'node:test'

import { WsRouter } from '../transport/ws/ws-router.js'

class FakeClient {
  public readonly messages: string[] = []

  public constructor(public readonly clientId: string) {}

  public send(message: string): void {
    this.messages.push(message)
  }
}

const createRouter = (): WsRouter => {
  return new WsRouter({
    actionService: {
      click: () => {
        return Promise.resolve(null)
      },
      screenshot: () => {
        return Promise.resolve(null)
      },
      type: () => {
        return Promise.resolve(null)
      },
    },
    browserManagerService: {
      attachClient: () => {
        return null
      },
      closeSession: () => {
        return Promise.resolve(null)
      },
      createSession: () => {
        return Promise.reject(new Error('not implemented in test'))
      },
    },
    pageService: {
      goto: () => {
        return Promise.resolve(null)
      },
      snapshot: () => {
        return Promise.resolve(null)
      },
    },
  })
}

test('WsRouter emits error for invalid command payload', async () => {
  const router = createRouter()
  const client = new FakeClient('client-1')

  await router.routeMessage(client, 'not-json')

  assert.equal(client.messages.length, 1)
  const payload = JSON.parse(client.messages[0])

  assert.equal(payload.event, 'error')
  assert.equal(payload.ok, false)
})

test('WsRouter emits session-not-found error when snapshot target does not exist', async () => {
  const router = createRouter()
  const client = new FakeClient('client-2')

  await router.routeMessage(client, JSON.stringify({
    command: 'page.snapshot',
    requestId: 'request-1',
    sessionId: 'missing-session',
  }))

  assert.equal(client.messages.length, 2)

  const startedEvent = JSON.parse(client.messages[0])
  const errorEvent = JSON.parse(client.messages[1])

  assert.equal(startedEvent.event, 'action.started')
  assert.equal(errorEvent.event, 'error')
  assert.equal(errorEvent.ok, false)
})
