import "dotenv/config"
import { Stagehand } from "@browserbasehq/stagehand"
import os from "node:os"
import path from "node:path"
import fs from 'fs'
import { URL } from 'node:url'
import { nanoid } from 'nanoid'

const getArg = (arg: string) => {
  const argi = process.argv.findIndex((a) => a === arg)
  let key: string | undefined
  let val: string | undefined

  if (argi !== -1) {
    [key, val] = process.argv.slice(argi, argi + 2)
  }

  return val
}

const pageImageBaseDir = process.env.PAGE_IMAGE_BASE_DIR
  ?? './data'
  
const chromeExecutablePath = process.env.CHROME_EXECUTABLE_PATH
  ?? "/usr/bin/google-chrome"

const chromeUserDataDir = process.env.CHROME_USER_DATA_DIR
  ?? path.join(
    os.homedir(),
    ".config/google-chrome-stagehand",
  )

const chromeProfileDirectory = process.env.CHROME_PROFILE_DIRECTORY
  ?? "Eugene-Stagehand"

const openAIKey = process.env.OPEN_AI_KEY

let url: string = getArg('url') ?? 'https://stagehand.dev'

async function main() {
  const stagehand = new Stagehand({
    env: "LOCAL",
    ...(
      openAIKey
        ? { apiKey: openAIKey }
        : {}
    ),
    localBrowserLaunchOptions: {
      executablePath: chromeExecutablePath,
      userDataDir: chromeUserDataDir,
      preserveUserDataDir: true,
      args: [`--profile-directory=${chromeProfileDirectory}`],
    },
  })

  await stagehand.init()
  const page = await stagehand.context.newPage(url)
  await page.waitForLoadState('networkidle')
  await stagehand.act('Click in search box with default text \'Search\'')
  await stagehand.act('type cherries')
  await stagehand.act('press enter', { timeout: 30000 })
  // if (!fs.existsSync(pageImageBaseDir)) {
  //   fs.mkdirSync(pageImageBaseDir)
  // }
  
  // const webpageDir = `${pageImageBaseDir}/${new URL(url).hostname}`
  // if (!fs.existsSync(webpageDir)) {
  //   fs.mkdirSync(webpageDir)
  // }
  
  // const filename = `${page.title.name}.${nanoid()}.jpg`
  // const screenshotPath = `${webpageDir}/${filename}`
  
  // await page.waitForLoadState('networkidle')
  // await page.screenshot({
  //   type: 'jpeg',
  //   quality: 50,
  //   fullPage: true,
  //   path: screenshotPath,
  // })
  
  await stagehand.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
