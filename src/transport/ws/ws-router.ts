import type { Session } from '../../contracts/session.schema.js'
import { wsCommandSchema, type WsCommand } from '../../contracts/ws-commands.schema.js'
import type { WsEvent } from '../../contracts/ws-events.schema.js'
import { ActionService, type ScreenshotResult } from '../../runtime/action.service.js'
import { BrowserManagerService } from '../../runtime/browser-manager.service.js'
import { PageService } from '../../runtime/page.service.js'

interface WsClient {
  clientId: string
  send: (message: string) => void
}

interface WsRouterDependencies {
  actionService: Pick<ActionService, 'click' | 'screenshot' | 'type'>
  browserManagerService: Pick<BrowserManagerService, 'attachClient' | 'closeSession' | 'createSession'>
  pageService: Pick<PageService, 'goto' | 'snapshot'>
}

class WsRouter {
  public constructor(private readonly dependencies: WsRouterDependencies) {}

  private emit(client: WsClient, event: WsEvent): void {
    client.send(JSON.stringify(event))
  }

  private emitActionCompleted(client: WsClient, command: WsCommand, data?: unknown): void {
    this.emit(client, {
      data,
      error: null,
      event: 'action.completed',
      ok: true,
      requestId: command.requestId,
      sessionId: command.sessionId,
      timestamp: new Date().toISOString(),
    })
  }

  private emitActionStarted(client: WsClient, command: WsCommand): void {
    this.emit(client, {
      data: {
        command: command.command,
      },
      error: null,
      event: 'action.started',
      ok: true,
      requestId: command.requestId,
      sessionId: command.sessionId,
      timestamp: new Date().toISOString(),
    })
  }

  private emitError(client: WsClient, error: string, requestId?: string, sessionId?: string): void {
    this.emit(client, {
      error,
      event: 'error',
      ok: false,
      requestId,
      sessionId,
      timestamp: new Date().toISOString(),
    })
  }

  private emitSessionNotFound(client: WsClient, command: WsCommand): void {
    this.emitError(client, `Session ${command.sessionId} not found`, command.requestId, command.sessionId)
  }

  private handleActionResult(
    client: WsClient,
    command: WsCommand,
    result: Session | ScreenshotResult | null,
    successEvent: 'artifact.created' | 'page.navigated'
  ): boolean {
    if (!result) {
      this.emitSessionNotFound(client, command)

      return false
    }

    this.emit(client, {
      data: result,
      error: null,
      event: successEvent,
      ok: true,
      requestId: command.requestId,
      sessionId: command.sessionId,
      timestamp: new Date().toISOString(),
    })
    this.emitActionCompleted(client, command, result)

    return true
  }

  private async handleCommand(client: WsClient, command: WsCommand): Promise<void> {
    switch (command.command) {
      case 'session.attach': {
        const attachedClientId = command.controllerId ?? client.clientId
        const session = this.dependencies.browserManagerService.attachClient(command.sessionId, attachedClientId)

        if (!session) {
          this.emitSessionNotFound(client, command)

          return
        }

        this.emit(client, {
          data: session,
          error: null,
          event: 'session.attached',
          ok: true,
          requestId: command.requestId,
          sessionId: command.sessionId,
          timestamp: new Date().toISOString(),
        })

        return
      }

      case 'page.goto': {
        this.emitActionStarted(client, command)

        const navigatedSession = await this.dependencies.pageService.goto(command.sessionId, command.url)

        this.handleActionResult(client, command, navigatedSession, 'page.navigated')

        return
      }

      case 'page.snapshot': {
        this.emitActionStarted(client, command)
        const pageSnapshot = await this.dependencies.pageService.snapshot(command.sessionId)

        if (!pageSnapshot) {
          this.emitSessionNotFound(client, command)

          return
        }

        this.emitActionCompleted(client, command, pageSnapshot)

        return
      }

      case 'element.click': {
        this.emitActionStarted(client, command)

        const clickedSession = await this.dependencies.actionService.click(command.selector, command.sessionId)

        if (!clickedSession) {
          this.emitSessionNotFound(client, command)

          return
        }

        this.emitActionCompleted(client, command, clickedSession)

        return
      }

      case 'element.type': {
        this.emitActionStarted(client, command)

        const typedSession = await this.dependencies.actionService.type(
          command.clearFirst ?? true,
          command.selector,
          command.sessionId,
          command.text
        )

        if (!typedSession) {
          this.emitSessionNotFound(client, command)

          return
        }

        this.emitActionCompleted(client, command, typedSession)

        return
      }

      case 'artifact.screenshot': {
        this.emitActionStarted(client, command)
        const screenshotResult = await this.dependencies.actionService.screenshot(
          command.fullPage ?? true,
          command.sessionId
        )

        this.handleActionResult(client, command, screenshotResult, 'artifact.created')

        return
      }

      case 'session.close': {
        this.emitActionStarted(client, command)
        const closedSession = await this.dependencies.browserManagerService.closeSession(command.sessionId)

        if (!closedSession) {
          this.emitSessionNotFound(client, command)

          return
        }

        this.emitActionCompleted(client, command, closedSession)

        return
      }
    }
  }

  public async routeMessage(client: WsClient, rawMessage: string): Promise<void> {
    let payload: unknown

    try {
      payload = JSON.parse(rawMessage)
    } catch {
      this.emitError(client, 'Invalid JSON message')

      return
    }

    const parsedCommand = wsCommandSchema.safeParse(payload)

    if (!parsedCommand.success) {
      this.emitError(client, 'Invalid WebSocket command payload')

      return
    }

    await this.handleCommand(client, parsedCommand.data)
  }
}

export { WsRouter, type WsClient, type WsRouterDependencies }
