import crypto from 'node:crypto'
import path from 'node:path'

import { chromium, type BrowserContext, type Page } from 'playwright'

import type { Session } from '../contracts/session.schema.js'
import { SessionRegistryService } from '../sessions/session-registry.service.js'
import type { BrowserConfig } from './browser-config.service.js'
import { ProfileLockCleanupService } from './profile-lock-cleanup.service.js'

interface ManagedSession {
  page: Page
  pageId: string
}

class BrowserManagerService {
  private context: BrowserContext | null = null
  private readonly managedSessions = new Map<string, ManagedSession>()
  private traceSessionId: string | null = null

  public constructor(
    private readonly browserConfig: BrowserConfig,
    private readonly sessionRegistryService: SessionRegistryService,
    private readonly profileLockCleanupService: ProfileLockCleanupService = new ProfileLockCleanupService()
  ) {}

  private async cleanupProfileLockState(): Promise<void> {
    if (this.managedSessions.size > 0) {
      return
    }

    if (this.context) {
      await this.context.close()
      this.context = null
    }

    this.traceSessionId = null
    this.profileLockCleanupService.removeLockFiles(this.browserConfig.chromeProfileDir)
  }

  private async ensureContext(): Promise<BrowserContext> {
    if (this.context) {
      return this.context
    }

    const chromeProfileDirectory = path.basename(this.browserConfig.chromeProfileDir)
    const chromeUserDataDir = path.dirname(this.browserConfig.chromeProfileDir)

    this.context = await chromium.launchPersistentContext(chromeUserDataDir, {
      args: [`--profile-directory=${chromeProfileDirectory}`],
      headless: false,
      ...(this.browserConfig.chromeExecutablePath
        ? {
            executablePath: this.browserConfig.chromeExecutablePath,
          }
        : {}),
    })

    return this.context
  }

  private getManagedSession(sessionId: string): ManagedSession | null {
    return this.managedSessions.get(sessionId) ?? null
  }

  private async runWithProfileLockCleanupInternal<ReturnType>(
    browserAction: (() => Promise<ReturnType>)
  ): Promise<ReturnType> {
    try {
      return await browserAction()
    } finally {
      try {
        await this.cleanupProfileLockState()
      } catch (error: unknown) {
        console.error('Failed to cleanup Chrome profile lock files', error)
      }
    }
  }

  public attachClient(sessionId: string, attachedClientId: string): Session | null {
    return this.sessionRegistryService.attachClient(sessionId, attachedClientId)
  }

  public async closeSession(sessionId: string): Promise<Session | null> {
    return await this.runWithProfileLockCleanupInternal(async () => {
      const managedSession = this.getManagedSession(sessionId)

      if (this.traceSessionId === sessionId) {
        this.traceSessionId = null
      }

      if (managedSession) {
        try {
          await managedSession.page.close()
        } catch (error: unknown) {
          console.error('Failed to close browser page for session ' + sessionId, error)
        }

        this.managedSessions.delete(sessionId)
      }

      return this.sessionRegistryService.markClosed(sessionId)
    })
  }

  public async createSession(url?: string): Promise<Session> {
    return await this.runWithProfileLockCleanupInternal(async () => {
      const context = await this.ensureContext()
      const page = await context.newPage()
      const pageId = crypto.randomUUID()
      const session = this.sessionRegistryService.create(pageId, url ?? null)

      this.managedSessions.set(session.sessionId, {
        page,
        pageId,
      })

      if (!url) {
        return session
      }

      await page.goto(url, { waitUntil: 'domcontentloaded' })

      return this.sessionRegistryService.touch(session.sessionId, pageId, page.url()) ?? session
    })
  }

  public getPage(sessionId: string): Page | null {
    const managedSession = this.getManagedSession(sessionId)

    if (!managedSession) {
      return null
    }

    return managedSession.page
  }

  public getSession(sessionId: string): Session | null {
    return this.sessionRegistryService.get(sessionId)
  }

  public listSessions(): Session[] {
    return this.sessionRegistryService.list()
  }

  public async navigate(sessionId: string, url: string): Promise<Session | null> {
    return await this.runWithProfileLockCleanupInternal(async () => {
      const managedSession = this.getManagedSession(sessionId)

      if (!managedSession) {
        return null
      }

      await managedSession.page.goto(url, { waitUntil: 'domcontentloaded' })

      return this.sessionRegistryService.touch(sessionId, managedSession.pageId, managedSession.page.url())
    })
  }

  public async runWithProfileLockCleanup<ReturnType>(browserAction: (() => Promise<ReturnType>)): Promise<ReturnType> {
    return await this.runWithProfileLockCleanupInternal(browserAction)
  }

  public async shutdown(): Promise<void> {
    await this.runWithProfileLockCleanupInternal(async () => {
      if (!this.context) {
        return
      }

      await this.context.close()
      this.context = null
      this.managedSessions.clear()
      this.traceSessionId = null
    })
  }

  public async startTrace(sessionId: string): Promise<boolean> {
    return await this.runWithProfileLockCleanupInternal(async () => {
      const managedSession = this.getManagedSession(sessionId)

      if (!managedSession) {
        return false
      }

      if (this.traceSessionId === sessionId) {
        return true
      }

      if (this.traceSessionId) {
        return false
      }

      await managedSession.page.context().tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true,
      })
      this.traceSessionId = sessionId

      return true
    })
  }

  public async stopTrace(outputPath: string, sessionId: string): Promise<boolean> {
    return await this.runWithProfileLockCleanupInternal(async () => {
      const managedSession = this.getManagedSession(sessionId)

      if (!managedSession || this.traceSessionId !== sessionId) {
        return false
      }

      await managedSession.page.context().tracing.stop({
        path: outputPath,
      })
      this.traceSessionId = null

      return true
    })
  }

  public async takeScreenshot(sessionId: string, fullPage: boolean, outputPath: string): Promise<Session | null> {
    return await this.runWithProfileLockCleanupInternal(async () => {
      const managedSession = this.getManagedSession(sessionId)

      if (!managedSession) {
        return null
      }

      await managedSession.page.screenshot({
        fullPage,
        path: outputPath,
      })

      return this.sessionRegistryService.touch(sessionId, managedSession.pageId, managedSession.page.url())
    })
  }

  public touchSession(sessionId: string): Session | null {
    const managedSession = this.getManagedSession(sessionId)

    if (!managedSession) {
      return null
    }

    return this.sessionRegistryService.touch(sessionId, managedSession.pageId, managedSession.page.url())
  }
}

export { BrowserManagerService }
