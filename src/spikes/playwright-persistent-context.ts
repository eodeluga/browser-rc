import fs from 'node:fs'
import path from 'node:path'

import { chromium } from 'playwright'

import { BrowserConfigService } from '../runtime/browser-config.service.js'

const browserConfigService = new BrowserConfigService()
const browserConfig = browserConfigService.getConfig()
const screenshotPath = path.join(browserConfig.outputBaseDir, 'spike-homepage.png')

const ensureOutputDirectory = (): void => {
  const outputDirectory = path.dirname(screenshotPath)

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, {
      recursive: true,
    })
  }
}

const run = async (): Promise<void> => {
  ensureOutputDirectory()

  const browserContext = await chromium.launchPersistentContext(browserConfig.chromeUserDataDir, {
    channel: 'chrome',
    ...(browserConfig.chromeExecutablePath
      ? {
          executablePath: browserConfig.chromeExecutablePath,
        }
      : {}),
    headless: false,
  })

  const browserPage = browserContext.pages()[0] ?? await browserContext.newPage()

  await browserPage.goto('https://example.com', {
    waitUntil: 'domcontentloaded',
  })

  await browserPage.screenshot({
    path: screenshotPath,
  })

  await browserContext.close()
}

void run()
