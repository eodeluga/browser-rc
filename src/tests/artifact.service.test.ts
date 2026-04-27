import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { ArtifactService } from '../runtime/artifact.service.js'

test('ArtifactService writes HTML dumps and log entries in the job run directory', () => {
  const outputBaseDir = path.join('.agents', 'tmp-artifacts-service-test')

  if (fs.existsSync(outputBaseDir)) {
    fs.rmSync(outputBaseDir, {
      force: true,
      recursive: true,
    })
  }

  const artifactService = new ArtifactService(outputBaseDir)
  const jobId = 'job-phase-8'

  artifactService.ensureBaseDir()
  artifactService.appendJobLog(jobId, 'Testing job logs')
  artifactService.writeJobHtmlDump(jobId, '<html><body>ok</body></html>')

  const htmlDumpPath = path.join(outputBaseDir, jobId, 'page.html')
  const logPath = path.join(outputBaseDir, jobId, 'logs.jsonl')
  const tracePath = artifactService.getJobTracePath(jobId)

  assert.equal(fs.existsSync(htmlDumpPath), true)
  assert.equal(fs.existsSync(logPath), true)
  assert.equal(tracePath.includes(path.join(jobId, 'trace.zip')), true)
})
