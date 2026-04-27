import crypto from 'node:crypto'
import type { Server } from 'node:http'

import { WebSocketServer } from 'ws'

import { WsRouter } from './ws-router.js'

interface WsServerDependencies {
  router: WsRouter
  server: Server
}

interface WsServerController {
  close: () => Promise<void>
}

const createWsServer = (dependencies: WsServerDependencies): WsServerController => {
  const webSocketServer = new WebSocketServer({
    path: '/ws',
    server: dependencies.server,
  })

  webSocketServer.on('connection', (socket) => {
    const clientId = crypto.randomUUID()

    socket.on('message', (rawMessage) => {
      const messageText = typeof rawMessage === 'string'
        ? rawMessage
        : Buffer.isBuffer(rawMessage)
          ? rawMessage.toString('utf8')
          : Array.isArray(rawMessage)
            ? Buffer.concat(rawMessage).toString('utf8')
            : Buffer.from(rawMessage).toString('utf8')

      dependencies.router.routeMessage({
        clientId,
        send: (message: string) => {
          socket.send(message)
        },
      }, messageText)
        .catch((error: unknown) => {
          const message = error instanceof Error
            ? error.message
            : 'Unexpected WebSocket routing error'

          socket.send(JSON.stringify({
            error: message,
            event: 'error',
            ok: false,
            timestamp: new Date().toISOString(),
          }))
        })
    })
  })

  return {
    close: async (): Promise<void> => {
      await new Promise<void>((resolve, reject) => {
        webSocketServer.close((error) => {
          if (error) {
            reject(error)

            return
          }

          resolve()
        })
      })
    },
  }
}

export { createWsServer, type WsServerController, type WsServerDependencies }
