import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import 'dotenv/config'

import {
  createJobRequestSchema,
  createSessionRequestSchema,
  gotoSessionRequestSchema,
  screenshotSessionRequestSchema,
} from '../../contracts/http.schema.js'
import type { Result } from '../../contracts/result.schema.js'
import { ActionService } from '../../runtime/action.service.js'
import { ArtifactService } from '../../runtime/artifact.service.js'
import { BrowserConfigService } from '../../runtime/browser-config.service.js'
import { BrowserManagerService } from '../../runtime/browser-manager.service.js'
import { DiscoveryService } from '../../runtime/discovery.service.js'
import { ExtractionService } from '../../runtime/extraction.service.js'
import { JobRunnerService } from '../../runtime/job-runner.service.js'
import { PageService } from '../../runtime/page.service.js'
import { SessionRegistryService } from '../../sessions/session-registry.service.js'
import { createWsServer, type WsServerController } from '../ws/ws-server.js'
import { WsRouter } from '../ws/ws-router.js'

const browserConfigService = new BrowserConfigService()
const browserConfig = browserConfigService.getConfig()
const sessionRegistryService = new SessionRegistryService()
const browserManagerService = new BrowserManagerService(browserConfig, sessionRegistryService)
const artifactService = new ArtifactService(browserConfig.outputBaseDir)
const pageService = new PageService(browserManagerService)
const discoveryService = new DiscoveryService({
  browserManagerService,
  pageService,
})
const extractionService = new ExtractionService({
  browserManagerService,
})
const actionService = new ActionService(artifactService, browserManagerService)
const jobRunnerService = new JobRunnerService(
  artifactService,
  browserManagerService,
  discoveryService,
  extractionService,
  pageService
)
const wsRouter = new WsRouter({
  actionService,
  browserManagerService,
  pageService,
})

artifactService.ensureBaseDir()

const server = Fastify()
let wsServerController: WsServerController | null = null

const sendResult = <TData>(reply: FastifyReply, statusCode: number, result: Result<TData>): void => {
  reply.status(statusCode).send(result)
}

server.get('/health', (_request: FastifyRequest, reply: FastifyReply): void => {
  sendResult(reply, 200, {
    data: {
      host: browserConfig.httpHost,
      port: browserConfig.httpPort,
      service: 'browser-rc',
      wsPath: '/ws',
    },
    error: null,
    ok: true,
    timestamp: new Date().toISOString(),
  })
})

server.get('/sessions', (_request: FastifyRequest, reply: FastifyReply): void => {
  sendResult(reply, 200, {
    data: {
      sessions: browserManagerService.listSessions(),
    },
    error: null,
    ok: true,
    timestamp: new Date().toISOString(),
  })
})

server.get('/sessions/:sessionId', (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply): void => {
  const session = browserManagerService.getSession(request.params.sessionId)

  if (!session) {
    sendResult(reply, 404, {
      error: 'Session not found',
      ok: false,
      timestamp: new Date().toISOString(),
    })

    return
  }

  sendResult(reply, 200, {
    data: session,
    error: null,
    ok: true,
    timestamp: new Date().toISOString(),
  })
})

server.post('/sessions', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const parsedBody = createSessionRequestSchema.safeParse(request.body)

  if (!parsedBody.success) {
    sendResult(reply, 400, {
      data: parsedBody.error.flatten(),
      error: 'Invalid create session request',
      ok: false,
      timestamp: new Date().toISOString(),
    })

    return
  }

  const session = await browserManagerService.createSession(parsedBody.data.url)

  sendResult(reply, 201, {
    data: session,
    error: null,
    ok: true,
    timestamp: new Date().toISOString(),
  })
})

server.post('/sessions/:sessionId/goto', async (
  request: FastifyRequest<{ Body: unknown, Params: { sessionId: string } }>,
  reply: FastifyReply
): Promise<void> => {
  const parsedBody = gotoSessionRequestSchema.safeParse(request.body)

  if (!parsedBody.success) {
    sendResult(reply, 400, {
      data: parsedBody.error.flatten(),
      error: 'Invalid goto request',
      ok: false,
      timestamp: new Date().toISOString(),
    })

    return
  }

  const session = await pageService.goto(request.params.sessionId, parsedBody.data.url)

  if (!session) {
    sendResult(reply, 404, {
      error: 'Session not found',
      ok: false,
      timestamp: new Date().toISOString(),
    })

    return
  }

  sendResult(reply, 200, {
    data: session,
    error: null,
    ok: true,
    timestamp: new Date().toISOString(),
  })
})

server.post('/sessions/:sessionId/screenshot', async (
  request: FastifyRequest<{ Body: unknown, Params: { sessionId: string } }>,
  reply: FastifyReply
): Promise<void> => {
  const parsedBody = screenshotSessionRequestSchema.safeParse(request.body)

  if (!parsedBody.success) {
    sendResult(reply, 400, {
      data: parsedBody.error.flatten(),
      error: 'Invalid screenshot request',
      ok: false,
      timestamp: new Date().toISOString(),
    })

    return
  }

  const screenshotResult = await actionService.screenshot(parsedBody.data.fullPage ?? true, request.params.sessionId)

  if (!screenshotResult) {
    sendResult(reply, 404, {
      error: 'Session not found',
      ok: false,
      timestamp: new Date().toISOString(),
    })

    return
  }

  sendResult(reply, 200, {
    data: screenshotResult,
    error: null,
    ok: true,
    timestamp: new Date().toISOString(),
  })
})

server.delete('/sessions/:sessionId', async (
  request: FastifyRequest<{ Params: { sessionId: string } }>,
  reply: FastifyReply
): Promise<void> => {
  const session = await browserManagerService.closeSession(request.params.sessionId)

  if (!session) {
    sendResult(reply, 404, {
      error: 'Session not found',
      ok: false,
      timestamp: new Date().toISOString(),
    })

    return
  }

  sendResult(reply, 200, {
    data: session,
    error: null,
    ok: true,
    timestamp: new Date().toISOString(),
  })
})

server.post('/jobs', (request: FastifyRequest, reply: FastifyReply): void => {
  const parsedBody = createJobRequestSchema.safeParse(request.body)

  if (!parsedBody.success) {
    sendResult(reply, 400, {
      data: parsedBody.error.flatten(),
      error: 'Invalid create job request',
      ok: false,
      timestamp: new Date().toISOString(),
    })

    return
  }

  const createdJob = jobRunnerService.createJob(parsedBody.data)

  sendResult(reply, 202, {
    data: createdJob,
    error: null,
    ok: true,
    timestamp: new Date().toISOString(),
  })
})

server.get('/jobs/:jobId', (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply): void => {
  const job = jobRunnerService.getJob(request.params.jobId)

  if (!job) {
    sendResult(reply, 404, {
      error: 'Job not found',
      ok: false,
      timestamp: new Date().toISOString(),
    })

    return
  }

  sendResult(reply, 200, {
    data: job,
    error: null,
    ok: true,
    timestamp: new Date().toISOString(),
  })
})

const shutdown = async (exitCode: number): Promise<void> => {
  try {
    if (wsServerController) {
      await wsServerController.close()
      wsServerController = null
    }

    await browserManagerService.shutdown()
    await server.close()
    process.exit(exitCode)
  } catch (error: unknown) {
    console.error(error)
    process.exit(1)
  }
}

const start = async (): Promise<void> => {
  try {
    await server.listen({
      host: browserConfig.httpHost,
      port: browserConfig.httpPort,
    })

    wsServerController = createWsServer({
      router: wsRouter,
      server: server.server,
    })

    console.log(`HTTP control plane listening on http://${browserConfig.httpHost}:${browserConfig.httpPort}`)
    console.log(`WebSocket control plane listening on ws://${browserConfig.httpHost}:${browserConfig.httpPort}/ws`)
  } catch (error: unknown) {
    console.error(error)
    await shutdown(1)
  }
}

process.on('SIGINT', () => {
  shutdown(0)
    .catch((error: unknown) => {
      console.error(error)
      process.exit(1)
    })
})

process.on('SIGTERM', () => {
  shutdown(0)
    .catch((error: unknown) => {
      console.error(error)
      process.exit(1)
    })
})

export { start }
