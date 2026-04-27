import fs from 'node:fs'
import path from 'node:path'

type JobLogLevel = 'debug' | 'error' | 'info' | 'warn'

class ArtifactService {
  public constructor(private readonly outputBaseDir: string) {}

  private createTimestampSegment(): string {
    return new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
  }

  private ensureDirectory(directoryPath: string): void {
    fs.mkdirSync(directoryPath, { recursive: true })
  }

  private getJobSubdirectory(jobId: string, subdirectoryName: string): string {
    const subdirectoryPath = path.join(this.getJobDir(jobId), subdirectoryName)

    this.ensureDirectory(subdirectoryPath)

    return subdirectoryPath
  }

  public appendJobLog(jobId: string, message: string, level: JobLogLevel = 'info', metadata?: unknown): void {
    const logPath = path.join(this.getJobDir(jobId), 'logs.jsonl')
    const logLine = JSON.stringify({
      level,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    })

    fs.appendFileSync(logPath, `${logLine}\n`, 'utf8')
  }

  public ensureBaseDir(): void {
    this.ensureDirectory(this.outputBaseDir)
  }

  public getJobDir(jobId: string): string {
    const jobDir = path.join(this.outputBaseDir, jobId)

    this.ensureDirectory(jobDir)

    return jobDir
  }

  public getJobScreenshotPath(jobId: string): string {
    const filename = `screenshot-${this.createTimestampSegment()}.png`

    return path.join(this.getJobSubdirectory(jobId, 'screenshots'), filename)
  }

  public getJobTracePath(jobId: string): string {
    return path.join(this.getJobDir(jobId), 'trace.zip')
  }

  public getScreenshotPath(sessionId: string): string {
    const filename = `screenshot-${this.createTimestampSegment()}.png`

    return path.join(this.getSessionDir(sessionId), filename)
  }

  public getSessionDir(sessionId: string): string {
    const sessionDir = path.join(this.outputBaseDir, sessionId)

    this.ensureDirectory(sessionDir)

    return sessionDir
  }

  public writeJobHtmlDump(jobId: string, htmlContent: string): string {
    const htmlPath = path.join(this.getJobDir(jobId), 'page.html')

    fs.writeFileSync(htmlPath, htmlContent, 'utf8')

    return htmlPath
  }

  public writeJobRequest(jobId: string, payload: unknown): void {
    const requestPath = path.join(this.getJobDir(jobId), 'request.json')

    fs.writeFileSync(requestPath, JSON.stringify(payload, null, 2), 'utf8')
  }

  public writeJobResult(jobId: string, payload: unknown): void {
    const resultPath = path.join(this.getJobDir(jobId), 'result.json')

    fs.writeFileSync(resultPath, JSON.stringify(payload, null, 2), 'utf8')
  }
}

export { ArtifactService, type JobLogLevel }
