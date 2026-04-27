import assert from 'node:assert/strict'
import test from 'node:test'

import { BrowserConfigService } from '../runtime/browser-config.service.js'

test('BrowserConfigService leaves chrome executable undefined when env variable is absent', () => {
  const originalChromeExecutablePath = process.env.CHROME_EXECUTABLE_PATH
  delete process.env.CHROME_EXECUTABLE_PATH

  try {
    const browserConfigService = new BrowserConfigService()
    const browserConfig = browserConfigService.getConfig()

    assert.equal(browserConfig.chromeExecutablePath, undefined)
  } finally {
    if (originalChromeExecutablePath === undefined) {
      delete process.env.CHROME_EXECUTABLE_PATH
    } else {
      process.env.CHROME_EXECUTABLE_PATH = originalChromeExecutablePath
    }
  }
})

test('BrowserConfigService uses CHROME_EXECUTABLE_PATH when env variable is set', () => {
  const originalChromeExecutablePath = process.env.CHROME_EXECUTABLE_PATH
  process.env.CHROME_EXECUTABLE_PATH = '/custom/chrome'

  try {
    const browserConfigService = new BrowserConfigService()
    const browserConfig = browserConfigService.getConfig()

    assert.equal(browserConfig.chromeExecutablePath, '/custom/chrome')
  } finally {
    if (originalChromeExecutablePath === undefined) {
      delete process.env.CHROME_EXECUTABLE_PATH
    } else {
      process.env.CHROME_EXECUTABLE_PATH = originalChromeExecutablePath
    }
  }
})
