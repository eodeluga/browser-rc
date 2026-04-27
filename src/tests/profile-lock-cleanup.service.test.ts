import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import type { BrowserConfig } from '../runtime/browser-config.service.js'
import { BrowserManagerService } from '../runtime/browser-manager.service.js'
import { ProfileLockCleanupService } from '../runtime/profile-lock-cleanup.service.js'
import { SessionRegistryService } from '../sessions/session-registry.service.js'

class ProfileLockCleanupServiceStub extends ProfileLockCleanupService {
  public cleanupCallCount = 0
  public lastChromeUserDataDir: string | null = null

  public override removeLockFiles(chromeUserDataDir: string): void {
    this.cleanupCallCount += 1
    this.lastChromeUserDataDir = chromeUserDataDir
  }
}

test('ProfileLockCleanupService removes Singleton lock files', () => {
  const chromeUserDataDir = path.join('.agents', 'tmp-profile-lock-cleanup-service-test')

  if (fs.existsSync(chromeUserDataDir)) {
    fs.rmSync(chromeUserDataDir, {
      force: true,
      recursive: true,
    })
  }

  fs.mkdirSync(chromeUserDataDir, {
    recursive: true,
  })

  const singletonCookiePath = path.join(chromeUserDataDir, 'SingletonCookie')
  const singletonLockPath = path.join(chromeUserDataDir, 'SingletonLock')
  const singletonSocketPath = path.join(chromeUserDataDir, 'SingletonSocket')
  const unrelatedFilePath = path.join(chromeUserDataDir, 'Preferences')

  fs.writeFileSync(singletonCookiePath, 'cookie-lock')
  fs.writeFileSync(singletonLockPath, 'lock-file')
  fs.writeFileSync(singletonSocketPath, 'socket-file')
  fs.writeFileSync(unrelatedFilePath, '{}')

  const profileLockCleanupService = new ProfileLockCleanupService()

  profileLockCleanupService.removeLockFiles(chromeUserDataDir)

  assert.equal(fs.existsSync(singletonCookiePath), false)
  assert.equal(fs.existsSync(singletonLockPath), false)
  assert.equal(fs.existsSync(singletonSocketPath), false)
  assert.equal(fs.existsSync(unrelatedFilePath), true)
})

test('BrowserManagerService runs profile lock cleanup after action success and failure', async () => {
  const profileLockCleanupServiceStub = new ProfileLockCleanupServiceStub()
  const browserConfig: BrowserConfig = {
    chromeExecutablePath: undefined,
    chromeUserDataDir: '/tmp/chrome-user-data',
    httpHost: '127.0.0.1',
    httpPort: 3001,
    outputBaseDir: './runs',
  }
  const browserManagerService = new BrowserManagerService(
    browserConfig,
    new SessionRegistryService(),
    profileLockCleanupServiceStub
  )

  const successfulResult = await browserManagerService.runWithProfileLockCleanup(() => {
    return Promise.resolve('ok')
  })

  assert.equal(successfulResult, 'ok')
  assert.equal(profileLockCleanupServiceStub.cleanupCallCount, 1)
  assert.equal(profileLockCleanupServiceStub.lastChromeUserDataDir, '/tmp/chrome-user-data')

  await assert.rejects(() => {
    return browserManagerService.runWithProfileLockCleanup(() => {
      return Promise.reject(new Error('action-failed'))
    })
  })

  assert.equal(profileLockCleanupServiceStub.cleanupCallCount, 2)
})
