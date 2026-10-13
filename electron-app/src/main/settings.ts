/** User preferences (language, theme, vault folder) stored in userData/settings.json. */
import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import type { Settings } from '../shared/types'

const file = (): string => join(app.getPath('userData'), 'settings.json')

/** Defaults to a `vault` folder next to the app folder when it exists, else Documents/noter-vault. */
function defaultVault(): string {
  const sibling = resolve(app.getAppPath(), '..', 'vault')
  return existsSync(sibling) ? sibling : join(app.getPath('documents'), 'noter-vault')
}

export function loadSettings(): Settings {
  const defaults: Settings = { language: 'en', theme: 'dark', vaultDir: defaultVault() }
  try {
    return { ...defaults, ...JSON.parse(readFileSync(file(), 'utf-8')) }
  } catch {
    return defaults
  }
}

export function saveSettings(s: Settings): void {
  writeFileSync(file(), JSON.stringify(s, null, 2), 'utf-8')
}
