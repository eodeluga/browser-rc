import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
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

test('BrowserConfigService defaults CHROME_PROFILE_DIR when env variable is absent', () => {
  const originalChromeProfileDir = process.env.CHROME_PROFILE_DIR
  delete process.env.CHROME_PROFILE_DIR

  try {
    const browserConfigService = new BrowserConfigService()
    const browserConfig = browserConfigService.getConfig()

    assert.equal(browserConfig.chromeProfileDir, path.join(os.homedir(), '.config/google-chrome', 'Default'))
  } finally {
    if (originalChromeProfileDir === undefined) {
      delete process.env.CHROME_PROFILE_DIR
    } else {
      process.env.CHROME_PROFILE_DIR = originalChromeProfileDir
    }
  }
})

test('BrowserConfigService uses CHROME_PROFILE_DIR when env variable is set', () => {
  const originalChromeProfileDir = process.env.CHROME_PROFILE_DIR
  process.env.CHROME_PROFILE_DIR = '/tmp/chrome-profile/Profile 3'

  try {
    const browserConfigService = new BrowserConfigService()
    const browserConfig = browserConfigService.getConfig()

    assert.equal(browserConfig.chromeProfileDir, '/tmp/chrome-profile/Profile 3')
  } finally {
    if (originalChromeProfileDir === undefined) {
      delete process.env.CHROME_PROFILE_DIR
    } else {
      process.env.CHROME_PROFILE_DIR = originalChromeProfileDir
    }
  }
})

test('BrowserConfigService defaults HTTP port to 3001 when env variable is absent', () => {
  const originalHttpPort = process.env.HTTP_PORT
  delete process.env.HTTP_PORT

  try {
    const browserConfigService = new BrowserConfigService()
    const browserConfig = browserConfigService.getConfig()

    assert.equal(browserConfig.httpPort, 3001)
  } finally {
    if (originalHttpPort === undefined) {
      delete process.env.HTTP_PORT
    } else {
      process.env.HTTP_PORT = originalHttpPort
    }
  }
})

test('BrowserConfigService uses HTTP_PORT when env variable is valid', () => {
  const originalHttpPort = process.env.HTTP_PORT
  process.env.HTTP_PORT = '3017'

  try {
    const browserConfigService = new BrowserConfigService()
    const browserConfig = browserConfigService.getConfig()

    assert.equal(browserConfig.httpPort, 3017)
  } finally {
    if (originalHttpPort === undefined) {
      delete process.env.HTTP_PORT
    } else {
      process.env.HTTP_PORT = originalHttpPort
    }
  }
})

test('BrowserConfigService falls back to 3001 when HTTP_PORT env variable is invalid', () => {
  const originalHttpPort = process.env.HTTP_PORT
  process.env.HTTP_PORT = 'not-a-number'

  try {
    const browserConfigService = new BrowserConfigService()
    const browserConfig = browserConfigService.getConfig()

    assert.equal(browserConfig.httpPort, 3001)
  } finally {
    if (originalHttpPort === undefined) {
      delete process.env.HTTP_PORT
    } else {
      process.env.HTTP_PORT = originalHttpPort
    }
  }
})
