import crypto from 'node:crypto'

import type { Session } from '../contracts/session.schema.js'

class SessionRegistryService {
  private readonly sessions = new Map<string, Session>()

  public attachClient(sessionId: string, attachedClientId: string): Session | null {
    const existingSession = this.sessions.get(sessionId)

    if (!existingSession) {
      return null
    }

    const updatedSession: Session = {
      ...existingSession,
      attachedClientId,
      lastActivityAt: new Date().toISOString(),
    }

    this.sessions.set(sessionId, updatedSession)

    return updatedSession
  }

  public create(activePageId: string, currentUrl: string | null): Session {
    const now = new Date().toISOString()
    const session: Session = {
      activePageId,
      attachedClientId: null,
      createdAt: now,
      currentUrl,
      lastActivityAt: now,
      sessionId: crypto.randomUUID(),
      status: 'active',
    }

    this.sessions.set(session.sessionId, session)

    return session
  }

  public get(sessionId: string): Session | null {
    return this.sessions.get(sessionId) ?? null
  }

  public list(): Session[] {
    return Array.from(this.sessions.values())
  }

  public markClosed(sessionId: string): Session | null {
    const existingSession = this.sessions.get(sessionId)

    if (!existingSession) {
      return null
    }

    const updatedSession: Session = {
      ...existingSession,
      attachedClientId: null,
      lastActivityAt: new Date().toISOString(),
      status: 'closed',
    }

    this.sessions.set(sessionId, updatedSession)

    return updatedSession
  }

  public touch(sessionId: string, activePageId: string, currentUrl: string | null): Session | null {
    const existingSession = this.sessions.get(sessionId)

    if (!existingSession) {
      return null
    }

    const updatedSession: Session = {
      ...existingSession,
      activePageId,
      currentUrl,
      lastActivityAt: new Date().toISOString(),
    }

    this.sessions.set(sessionId, updatedSession)

    return updatedSession
  }
}

export { SessionRegistryService }
