import fs from 'node:fs'
import path from 'node:path'

class ProfileLockCleanupService {
  private readonly lockFileNames: string[] = [
    'SingletonCookie',
    'SingletonLock',
    'SingletonSocket',
  ]

  public removeLockFiles(chromeProfileDir: string): void {
    if (!chromeProfileDir.trim()) {
      return
    }

    const chromeUserDataDir = path.dirname(chromeProfileDir)

    for (const lockFileName of this.lockFileNames) {
      const lockFilePath = path.join(chromeUserDataDir, lockFileName)

      if (!fs.existsSync(lockFilePath)) {
        continue
      }

      fs.rmSync(lockFilePath, {
        force: true,
      })
    }
  }
}

export { ProfileLockCleanupService }
