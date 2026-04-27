import type { Session } from '../contracts/session.schema.js'
import { ArtifactService } from './artifact.service.js'
import { BrowserManagerService } from './browser-manager.service.js'

interface ScreenshotResult {
  path: string
  session: Session
}

class ActionService {
  public constructor(
    private readonly artifactService: ArtifactService,
    private readonly browserManagerService: BrowserManagerService
  ) {}

  public async click(selector: string, sessionId: string): Promise<Session | null> {
    const browserPage = this.browserManagerService.getPage(sessionId)

    if (!browserPage) {
      return null
    }

    await browserPage.locator(selector).first().click()

    return this.browserManagerService.touchSession(sessionId)
  }

  public async screenshot(fullPage: boolean, sessionId: string): Promise<ScreenshotResult | null> {
    const screenshotPath = this.artifactService.getScreenshotPath(sessionId)
    const session = await this.browserManagerService.takeScreenshot(sessionId, fullPage, screenshotPath)

    if (!session) {
      return null
    }

    return {
      path: screenshotPath,
      session,
    }
  }

  public async type(clearFirst: boolean, selector: string, sessionId: string, text: string): Promise<Session | null> {
    const browserPage = this.browserManagerService.getPage(sessionId)

    if (!browserPage) {
      return null
    }

    const browserLocator = browserPage.locator(selector).first()

    if (clearFirst) {
      await browserLocator.fill(text)

      return this.browserManagerService.touchSession(sessionId)
    }

    await browserLocator.type(text)

    return this.browserManagerService.touchSession(sessionId)
  }
}

export { ActionService, type ScreenshotResult }
