import path from 'node:path'
import os from 'node:os'

interface BrowserConfig {
  chromeExecutablePath: string | undefined
  chromeProfileDirectory: string
  chromeUserDataDir: string
  httpHost: string
  httpPort: number
  outputBaseDir: string
}

class BrowserConfigService {
  public getConfig(): BrowserConfig {
    const chromeExecutablePath = process.env.CHROME_EXECUTABLE_PATH?.trim()
    const parsedHttpPort = Number(process.env.HTTP_PORT ?? '3001')
    const httpPort = Number.isFinite(parsedHttpPort) && parsedHttpPort > 0
      ? parsedHttpPort
      : 3001

    const config: BrowserConfig = {
      chromeExecutablePath: chromeExecutablePath ? chromeExecutablePath : undefined,
      chromeProfileDirectory: process.env.CHROME_PROFILE_DIRECTORY ?? 'Eugene-Stagehand',
      chromeUserDataDir: process.env.CHROME_USER_DATA_DIR ?? path.join(os.homedir(), '.config/google-chrome-stagehand'),
      httpHost: process.env.HTTP_HOST ?? '127.0.0.1',
      httpPort,
      outputBaseDir: process.env.OUTPUT_BASE_DIR ?? './runs',
    }

    return config
  }
}

export { BrowserConfigService, type BrowserConfig }
