import {
  discoveryResultSchema,
  interactiveElementSchema,
  pageSummarySchema,
  repeatedContentGroupSchema,
  type DiscoveryOptions,
  type DiscoveryResult,
  type InteractiveElement,
  type PageSummary,
  type RepeatedContentGroup,
} from '../contracts/discovery.schema.js'
import { BrowserManagerService } from './browser-manager.service.js'
import { PageService } from './page.service.js'

interface DiscoveryServiceDependencies {
  browserManagerService: Pick<BrowserManagerService, 'getPage' | 'touchSession'>
  pageService: Pick<PageService, 'snapshot'>
}

class DiscoveryService {
  public constructor(private readonly dependencies: DiscoveryServiceDependencies) {}

  private async listInteractiveElements(
    includeInteractiveElements: boolean,
    sessionId: string
  ): Promise<InteractiveElement[] | null> {
    if (!includeInteractiveElements) {
      return []
    }

    const browserPage = this.dependencies.browserManagerService.getPage(sessionId)

    if (!browserPage) {
      return null
    }

    const interactiveElements = await browserPage.evaluate(() => {
      const interactiveSelector = 'a,button,input,select,textarea,[role="button"],[role="link"],[tabindex]'
      const interactiveNodes = Array.from(document.querySelectorAll<HTMLElement>(interactiveSelector)).slice(0, 250)

      return interactiveNodes.map((interactiveNode, index) => {
        const className = interactiveNode.className.trim().split(/\s+/)
          .filter((candidateClassName) => {
            return Boolean(candidateClassName)
          })
          .slice(0, 2)
          .join('.')
        const idSelectorSegment = interactiveNode.id
          ? `#${interactiveNode.id}`
          : ''
        const classSelectorSegment = className
          ? `.${className}`
          : ''
        const selector = `${interactiveNode.tagName.toLowerCase()}${idSelectorSegment}${classSelectorSegment}`
        const text = (interactiveNode.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim()

        return {
          ariaLabel: interactiveNode.getAttribute('aria-label'),
          id: interactiveNode.id || null,
          index,
          role: interactiveNode.getAttribute('role'),
          selector,
          tagName: interactiveNode.tagName.toLowerCase(),
          text,
          type: interactiveNode.getAttribute('type'),
        }
      })
    })

    return interactiveElementSchema.array().parse(interactiveElements)
  }

  private async summarisePage(
    includeSummary: boolean,
    interactiveElements: InteractiveElement[],
    sessionId: string
  ): Promise<PageSummary | null> {
    if (!includeSummary) {
      const browserPage = this.dependencies.browserManagerService.getPage(sessionId)

      if (!browserPage) {
        return null
      }

      return pageSummarySchema.parse({
        headingCount: 0,
        headings: [],
        interactiveElementCount: interactiveElements.length,
        linkCount: 0,
        paragraphCount: 0,
        title: await browserPage.title(),
        url: browserPage.url(),
        wordCount: 0,
      })
    }

    const browserPage = this.dependencies.browserManagerService.getPage(sessionId)

    if (!browserPage) {
      return null
    }

    const pageSummary = await browserPage.evaluate((interactiveElementCount) => {
      const headingElements = Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3'))
      const headings = headingElements.map((headingElement) => {
        return (headingElement.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim()
      })
        .filter((headingText) => {
          return Boolean(headingText)
        })
        .slice(0, 20)
      const paragraphCount = document.querySelectorAll('p').length
      const textContent = document.body.textContent ?? ''
      const wordCount = textContent.trim().length
        ? textContent.trim().split(/\s+/).length
        : 0

      return {
        headingCount: headingElements.length,
        headings,
        interactiveElementCount,
        linkCount: document.querySelectorAll('a').length,
        paragraphCount,
        title: document.title,
        url: window.location.href,
        wordCount,
      }
    }, interactiveElements.length)

    return pageSummarySchema.parse(pageSummary)
  }

  private async detectRepeatedContent(
    includeRepeatedContent: boolean,
    sessionId: string
  ): Promise<RepeatedContentGroup[] | null> {
    if (!includeRepeatedContent) {
      return []
    }

    const browserPage = this.dependencies.browserManagerService.getPage(sessionId)

    if (!browserPage) {
      return null
    }

    const repeatedContentGroups = await browserPage.evaluate(() => {
      const candidateContainers = Array.from(document.querySelectorAll<HTMLElement>('main,section,div,ul,ol,table,tbody'))
      const groups: { containerSelector: string, count: number, sampleText: string, signature: string }[] = []

      for (const container of candidateContainers) {
        const childElements = Array.from(container.children)

        if (childElements.length < 3) {
          continue
        }

        const signatureTotals: Record<string, { count: number, sampleText: string }> = {}

        for (const childElement of childElements) {
          const classNames = Array.from(childElement.classList)
            .slice(0, 2)
            .join('.')
          const tagName = childElement.tagName.toLowerCase()
          const signature = classNames
            ? `${tagName}.${classNames}`
            : tagName

          if (!signatureTotals[signature]) {
            const sampleText = (childElement.textContent ?? '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 120)
            signatureTotals[signature] = {
              count: 0,
              sampleText,
            }
          }

          signatureTotals[signature].count += 1
        }

        const containerTagName = container.tagName.toLowerCase()
        const containerSelector = container.id
          ? `${containerTagName}#${container.id}`
          : containerTagName

        for (const [signature, signatureTotal] of Object.entries(signatureTotals)) {
          if (signatureTotal.count < 3) {
            continue
          }

          groups.push({
            containerSelector,
            count: signatureTotal.count,
            sampleText: signatureTotal.sampleText,
            signature,
          })
        }
      }

      return groups
        .sort((firstGroup, secondGroup) => {
          return secondGroup.count - firstGroup.count
        })
        .slice(0, 25)
    })

    return repeatedContentGroupSchema.array().parse(repeatedContentGroups)
  }

  public async discover(sessionId: string, options?: DiscoveryOptions): Promise<DiscoveryResult | null> {
    const pageSnapshot = await this.dependencies.pageService.snapshot(sessionId)

    if (!pageSnapshot) {
      return null
    }

    const includeInteractiveElements = options?.includeInteractiveElements ?? true
    const includeRepeatedContent = options?.includeRepeatedContent ?? true
    const includeSummary = options?.includeSummary ?? true

    const interactiveElements = await this.listInteractiveElements(includeInteractiveElements, sessionId)

    if (!interactiveElements) {
      return null
    }

    const repeatedContentGroups = await this.detectRepeatedContent(includeRepeatedContent, sessionId)

    if (!repeatedContentGroups) {
      return null
    }

    const pageSummary = await this.summarisePage(includeSummary, interactiveElements, sessionId)

    if (!pageSummary) {
      return null
    }

    this.dependencies.browserManagerService.touchSession(sessionId)

    return discoveryResultSchema.parse({
      interactiveElements,
      repeatedContentGroups,
      snapshot: pageSnapshot,
      summary: pageSummary,
    })
  }
}

export { DiscoveryService, type DiscoveryServiceDependencies }
