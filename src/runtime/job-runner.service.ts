import crypto from 'node:crypto'

import type { DiscoveryResult } from '../contracts/discovery.schema.js'
import type { ExtractionMode } from '../contracts/extraction.schema.js'
import type { CreateJobRequest, Job } from '../contracts/job.schema.js'
import type { Result } from '../contracts/result.schema.js'
import { ArtifactService } from './artifact.service.js'
import { BrowserManagerService } from './browser-manager.service.js'
import { DiscoveryService } from './discovery.service.js'
import { ExtractionService } from './extraction.service.js'
import { PageService } from './page.service.js'

interface JobArtifacts {
  htmlDumpPath: string | null
  screenshotPath: string | null
  tracePath: string | null
}

interface ExtractJobData {
  artifacts: JobArtifacts
  discoveredData: DiscoveryResult | null
  extractedData: unknown
  extractionMode: ExtractionMode
  sessionId: string
}

class JobRunnerService {
  private readonly jobs = new Map<string, Job>()

  public constructor(
    private readonly artifactService: ArtifactService,
    private readonly browserManagerService: BrowserManagerService,
    private readonly discoveryService: DiscoveryService,
    private readonly extractionService: ExtractionService,
    private readonly pageService: PageService
  ) {}

  private async executeExtractJob(jobId: string, request: CreateJobRequest): Promise<void> {
    const queuedJob = this.jobs.get(jobId)

    if (!queuedJob) {
      return
    }

    const runningJob: Job = {
      ...queuedJob,
      status: 'running',
    }

    this.jobs.set(jobId, runningJob)
    this.artifactService.writeJobRequest(jobId, request)
    this.artifactService.appendJobLog(jobId, 'Job queued for execution')

    let activeSessionId: string | null = null
    let createdSessionId: string | null = null
    let shouldStopTrace = false
    let tracePath: string | null = null

    try {
      const existingSessionId = request.input.sessionId

      if (existingSessionId && !this.browserManagerService.getSession(existingSessionId)) {
        throw new Error(`Session ${existingSessionId} not found`)
      }

      let ensuredSession = existingSessionId
        ? this.browserManagerService.getSession(existingSessionId)
        : null

      if (!ensuredSession) {
        ensuredSession = await this.browserManagerService.createSession()
        createdSessionId = ensuredSession.sessionId
      }

      const sessionId = ensuredSession.sessionId
      activeSessionId = sessionId
      tracePath = this.artifactService.getJobTracePath(jobId)
      shouldStopTrace = await this.browserManagerService.startTrace(sessionId)

      this.artifactService.appendJobLog(jobId, 'Playwright trace started', shouldStopTrace ? 'info' : 'warn', {
        sessionId,
        tracePath,
      })

      const navigatedSession = await this.pageService.goto(sessionId, request.input.url)

      if (!navigatedSession) {
        throw new Error(`Failed to navigate session ${sessionId}`)
      }

      this.artifactService.appendJobLog(jobId, `Navigated session ${sessionId} to ${request.input.url}`)

      const discoveredData = request.input.discovery
        ? await this.discoveryService.discover(sessionId, request.input.discovery)
        : null

      if (request.input.discovery && !discoveredData) {
        throw new Error(`Failed to discover page metadata for session ${sessionId}`)
      }

      const extractionResult = await this.extractionService.extract(
        request.input.extraction,
        request.input.normalisationHints,
        sessionId
      )

      if (!extractionResult) {
        throw new Error(`Failed to extract data for session ${sessionId}`)
      }

      const validatedData = request.input.schema
        ? this.extractionService.validateExtractedData(
          extractionResult.data,
          request.input.schema,
          extractionResult.mode
        )
        : null

      if (validatedData && !validatedData.success) {
        throw new Error(`Extracted data failed schema validation: ${validatedData.error.message}`)
      }

      const extractedData = validatedData
        ? validatedData.data
        : extractionResult.data
      const htmlSnapshot = discoveredData
        ? discoveredData.snapshot
        : await this.pageService.snapshot(sessionId)
      const htmlDumpPath = htmlSnapshot
        ? this.artifactService.writeJobHtmlDump(jobId, htmlSnapshot.html)
        : null
      let screenshotPath: string | null = null

      if (request.input.takeScreenshot) {
        const jobScreenshotPath = this.artifactService.getJobScreenshotPath(jobId)
        const screenshotSession = await this.browserManagerService.takeScreenshot(sessionId, true, jobScreenshotPath)

        if (!screenshotSession) {
          throw new Error(`Failed to capture screenshot for session ${sessionId}`)
        }

        screenshotPath = jobScreenshotPath
      }

      const result: Result<ExtractJobData> = {
        data: {
          artifacts: {
            htmlDumpPath,
            screenshotPath,
            tracePath: shouldStopTrace
              ? tracePath
              : null,
          },
          discoveredData,
          extractedData,
          extractionMode: extractionResult.mode,
          sessionId,
        },
        error: null,
        ok: true,
        timestamp: new Date().toISOString(),
      }

      const completedJob: Job = {
        ...runningJob,
        finishedAt: new Date().toISOString(),
        result,
        status: 'completed',
      }

      this.jobs.set(jobId, completedJob)
      this.artifactService.writeJobResult(jobId, result)
      this.artifactService.appendJobLog(jobId, 'Job completed successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Job execution failed'
      const failedResult: Result = {
        error: errorMessage,
        ok: false,
        timestamp: new Date().toISOString(),
      }
      const failedJob: Job = {
        ...runningJob,
        finishedAt: new Date().toISOString(),
        result: failedResult,
        status: 'failed',
      }

      this.jobs.set(jobId, failedJob)
      this.artifactService.writeJobResult(jobId, failedResult)
      this.artifactService.appendJobLog(jobId, `Job failed: ${errorMessage}`, 'error')
    } finally {
      if (activeSessionId && shouldStopTrace && tracePath) {
        const traceStopped = await this.browserManagerService.stopTrace(tracePath, activeSessionId)

        this.artifactService.appendJobLog(jobId, 'Playwright trace finalised', traceStopped ? 'info' : 'warn', {
          activeSessionId,
          tracePath,
        })
      }

      if (createdSessionId) {
        const closedSession = await this.browserManagerService.closeSession(createdSessionId)

        this.artifactService.appendJobLog(jobId, 'Job-created session finalised', closedSession ? 'info' : 'warn', {
          createdSessionId,
        })
      }
    }
  }

  public createJob(request: CreateJobRequest): Job {
    const now = new Date().toISOString()
    const jobId = crypto.randomUUID()
    const queuedJob: Job = {
      createdAt: now,
      finishedAt: null,
      jobId,
      status: 'queued',
      type: request.type,
    }

    this.jobs.set(jobId, queuedJob)

    void this.executeExtractJob(jobId, request)

    return queuedJob
  }

  public getJob(jobId: string): Job | null {
    return this.jobs.get(jobId) ?? null
  }

  public listJobs(): Job[] {
    return Array.from(this.jobs.values())
  }
}

export { JobRunnerService, type ExtractJobData, type JobArtifacts }
