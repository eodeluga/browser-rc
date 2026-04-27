import assert from 'node:assert/strict'
import test from 'node:test'

import type { BrowserConfig } from '../runtime/browser-config.service.js'
import { BrowserManagerService } from '../runtime/browser-manager.service.js'
import { ProfileLockCleanupService } from '../runtime/profile-lock-cleanup.service.js'
import { SessionRegistryService } from '../sessions/session-registry.service.js'

interface BrowserManagerServiceInternals {
  managedSessions: Map<string, { page: { close: (() => Promise<void>) }, pageId: string }>
}

class ProfileLockCleanupServiceStub extends ProfileLockCleanupService {
  public override removeLockFiles(chromeUserDataDir: string): void {
    void chromeUserDataDir
  }
}

const createBrowserManagerService = (): {
  browserManagerService: BrowserManagerService
  sessionRegistryService: SessionRegistryService
} => {
  const browserConfig: BrowserConfig = {
    chromeExecutablePath: undefined,
    chromeUserDataDir: '/tmp/chrome-user-data',
    httpHost: '127.0.0.1',
    httpPort: 3001,
    outputBaseDir: './runs',
  }
  const sessionRegistryService = new SessionRegistryService()
  const browserManagerService = new BrowserManagerService(
    browserConfig,
    sessionRegistryService,
    new ProfileLockCleanupServiceStub()
  )

  return {
    browserManagerService,
    sessionRegistryService,
  }
}

test('BrowserManagerService closeSession removes managed session from GET/list state', async () => {
  const { browserManagerService, sessionRegistryService } = createBrowserManagerService()
  const createdSession = sessionRegistryService.create('page-1', 'https://example.com')
  const browserManagerServiceInternals = browserManagerService as unknown as BrowserManagerServiceInternals

  browserManagerServiceInternals.managedSessions.set(createdSession.sessionId, {
    page: {
      close: () => {
        return Promise.resolve()
      },
    },
    pageId: createdSession.activePageId ?? 'page-1',
  })

  const closedSession = await browserManagerService.closeSession(createdSession.sessionId)

  assert.equal(closedSession?.status, 'closed')
  assert.equal(sessionRegistryService.get(createdSession.sessionId), null)
  assert.equal(sessionRegistryService.list().length, 0)
})

test('BrowserManagerService closeSession removes orphaned registry session when page mapping is missing', async () => {
  const { browserManagerService, sessionRegistryService } = createBrowserManagerService()
  const createdSession = sessionRegistryService.create('page-1', 'https://example.com')
  const closedSession = await browserManagerService.closeSession(createdSession.sessionId)

  assert.equal(closedSession?.status, 'closed')
  assert.equal(sessionRegistryService.get(createdSession.sessionId), null)
  assert.equal(sessionRegistryService.list().length, 0)
})
