import type { PageSnapshot } from '../contracts/page.schema.js'
import type { Session } from '../contracts/session.schema.js'
import { BrowserManagerService } from './browser-manager.service.js'

class PageService {
  public constructor(private readonly browserManagerService: BrowserManagerService) {}

  public async goto(sessionId: string, url: string): Promise<Session | null> {
    return this.browserManagerService.navigate(sessionId, url)
  }

  public async snapshot(sessionId: string): Promise<PageSnapshot | null> {
    const browserPage = this.browserManagerService.getPage(sessionId)

    if (!browserPage) {
      return null
    }

    const html = await browserPage.content()
    const title = await browserPage.title()
    const url = browserPage.url()

    this.browserManagerService.touchSession(sessionId)

    return {
      html,
      title,
      url,
    }
  }
}

export { PageService, type PageSnapshot }
