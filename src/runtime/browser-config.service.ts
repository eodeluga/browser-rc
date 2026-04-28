import path from 'node:path'
import os from 'node:os'

interface BrowserConfig {
  chromeExecutablePath: string | undefined
  chromeProfileDir: string
  httpHost: string
  httpPort: number
  outputBaseDir: string
}

class BrowserConfigService {
  public getConfig(): BrowserConfig {
    const chromeExecutablePath = process.env.CHROME_EXECUTABLE_PATH?.trim()
    const chromeProfileDir = process.env.CHROME_PROFILE_DIR?.trim()
    const httpHost = process.env.HTTP_HOST?.trim()
    const outputBaseDir = process.env.OUTPUT_BASE_DIR?.trim()
    const parsedHttpPort = Number(process.env.HTTP_PORT ?? '3001')
    const httpPort = Number.isFinite(parsedHttpPort) && parsedHttpPort > 0
      ? parsedHttpPort
      : 3001

    const config: BrowserConfig = {
      chromeExecutablePath: chromeExecutablePath ? chromeExecutablePath : undefined,
      chromeProfileDir: chromeProfileDir ? chromeProfileDir : path.join(os.homedir(), '.config/google-chrome', 'Default'),
      httpHost: httpHost ? httpHost : '127.0.0.1',
      httpPort,
      outputBaseDir: outputBaseDir ? outputBaseDir : './runs',
    }

    return config
  }
}

export { BrowserConfigService, type BrowserConfig }
